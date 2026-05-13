import { create } from "zustand";
import { createSeedWorkspace } from "../services/seedData";
import {
  chooseWorkspaceFolder,
  createWorkspaceScaffold,
  getPersistedWorkspaceHandle,
  isFileSystemSupported,
  loadWorkspaceFromHandle,
  saveWorkspaceToHandle,
  type WorkspaceFolderHandle,
} from "../services/fileSystem";
import { debounce, uid } from "../lib/utils";
import { computeTaskStatus } from "../lib/status";
import { parseNaturalLanguageTask } from "../lib/parser";
import {
  makeAccountableHistory,
  makeAssigneeHistory,
  normalizeAssignees,
} from "../lib/assignees";
import type {
  Person,
  Project,
  Task,
  WorkspaceData,
  ActivityLogEntry,
  TaskTemplate,
  CrossProjectDependency,
} from "../models/types";
import { workspaceSchema } from "../models/types";

type SaveState = "idle" | "saving" | "saved" | "error";

type DeletedTaskSnapshot = {
  projectId: string;
  task: Task;
};

type UndoEntry = {
  description: string;
  undo: () => void;
  redo: () => void;
};

type WorkspaceStore = {
  data: WorkspaceData | null;
  handle: WorkspaceFolderHandle | null;
  loading: boolean;
  saveState: SaveState;
  error: string | null;
  searchQuery: string;
  activeTabId: string | null;
  selectedProjectId: string | null;
  summaryOpen: boolean;
  addTaskOpen: boolean;
  teamOpen: boolean;
  recentlyDeletedTask: DeletedTaskSnapshot | null;
  fsSupported: boolean;
  // New state
  zoom: "week" | "month" | "quarter";
  timelineFilter: "all" | "overdue" | "atRisk" | "startsToday";
  selectedTaskIds: string[];
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
  templates: TaskTemplate[];
  workloadViewOpen: boolean;
  ganttViewOpen: boolean;
  exportImportOpen: boolean;
  // Actions
  init: () => Promise<void>;
  createWorkspace: () => Promise<void>;
  openWorkspace: () => Promise<void>;
  saveNow: () => Promise<void>;
  setSearchQuery: (value: string) => void;
  setActiveTab: (id: string) => void;
  setSummaryOpen: (open: boolean) => void;
  setAddTaskOpen: (open: boolean) => void;
  setTeamOpen: (open: boolean) => void;
  upsertPerson: (person: Person) => void;
  deletePerson: (personId: string) => void;
  upsertTask: (projectId: string, task: Task) => void;
  deleteTask: (projectId: string, taskId: string) => void;
  undoDeleteTask: () => void;
  clearRecentlyDeletedTask: () => void;
  createTaskFromNaturalLanguage: (projectId: string, input: string) => Task;
  updateWorkspaceName: (name: string) => void;
  // New actions
  setZoom: (zoom: "week" | "month" | "quarter") => void;
  setTimelineFilter: (
    filter: "all" | "overdue" | "atRisk" | "startsToday",
  ) => void;
  toggleTaskSelection: (taskId: string) => void;
  clearTaskSelection: () => void;
  selectAllTasks: (projectId: string) => void;
  bulkUpdateTasks: (projectId: string, updates: Partial<Task>) => void;
  bulkShiftDates: (projectId: string, days: number) => void;
  bulkDeleteTasks: (projectId: string) => void;
  pushUndo: (description: string, undo: () => void, redo: () => void) => void;
  undo: () => void;
  redo: () => void;
  addActivityLogEntry: (
    projectId: string,
    taskId: string,
    entry: ActivityLogEntry,
  ) => void;
  addCrossProjectDependency: (
    projectId: string,
    taskId: string,
    dep: CrossProjectDependency,
  ) => void;
  removeCrossProjectDependency: (
    projectId: string,
    taskId: string,
    depIndex: number,
  ) => void;
  saveTemplate: (template: TaskTemplate) => void;
  deleteTemplate: (templateId: string) => void;
  instantiateTemplate: (
    templateId: string,
    projectId: string,
    startDate: string,
  ) => Task | null;
  setWorkloadViewOpen: (open: boolean) => void;
  setGanttViewOpen: (open: boolean) => void;
  setExportImportOpen: (open: boolean) => void;
  exportWorkspace: () => void;
  importWorkspace: (file: File) => Promise<void>;
};

const withComputedStatuses = (data: WorkspaceData): WorkspaceData => ({
  ...data,
  projects: data.projects.map((project) => ({
    ...project,
    tasks: project.tasks.map((task) => {
      const normalized = normalizeAssignees(task);
      return {
        ...normalized,
        status: computeTaskStatus(normalized),
      };
    }),
  })),
});

// Version-tracked debounced save to prevent stale overwrites
let saveVersion = 0;
const debouncedSave = debounce(
  async (
    handle: WorkspaceFolderHandle,
    data: WorkspaceData,
    setState: (partial: Partial<WorkspaceStore>) => void,
    version: number,
  ) => {
    try {
      setState({ saveState: "saving" });
      // Only save if this is still the latest version
      if (version !== saveVersion) return;
      await saveWorkspaceToHandle(handle, data);
      if (version === saveVersion) {
        setState({ saveState: "saved" });
      }
    } catch (error) {
      setState({
        saveState: "error",
        error:
          error instanceof Error ? error.message : "Failed to save workspace.",
      });
    }
  },
  700,
);

const triggerDebouncedSave = (
  handle: WorkspaceFolderHandle,
  data: WorkspaceData,
  setState: (partial: Partial<WorkspaceStore>) => void,
) => {
  saveVersion++;
  debouncedSave(handle, data, setState, saveVersion);
};

const loadPersistedPrefs = () => {
  try {
    const saved = localStorage.getItem("timeliner-prefs");
    if (saved) {
      const prefs = JSON.parse(saved);
      return {
        zoom: prefs.zoom ?? "month",
        timelineFilter: prefs.timelineFilter ?? "all",
      };
    }
  } catch {}
  return { zoom: "month" as const, timelineFilter: "all" as const };
};

const savePrefs = (zoom: string, timelineFilter: string) => {
  try {
    localStorage.setItem(
      "timeliner-prefs",
      JSON.stringify({ zoom, timelineFilter }),
    );
  } catch {}
};

// Persist templates to localStorage so they survive page refreshes
const TEMPLATES_STORAGE_KEY = "timeliner-templates";
const loadPersistedTemplates = (): TaskTemplate[] => {
  try {
    const saved = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};
const persistTemplates = (templates: TaskTemplate[]) => {
  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  } catch {}
};

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => {
  const prefs = loadPersistedPrefs();
  return {
    data: null,
    handle: null,
    loading: true,
    saveState: "idle",
    error: null,
    searchQuery: "",
    activeTabId: null,
    selectedProjectId: null,
    summaryOpen: false,
    addTaskOpen: false,
    teamOpen: false,
    recentlyDeletedTask: null,
    fsSupported: isFileSystemSupported(),
    zoom: prefs.zoom,
    timelineFilter: prefs.timelineFilter,
    selectedTaskIds: [],
    undoStack: [],
    redoStack: [],
    templates: loadPersistedTemplates(),
    workloadViewOpen: false,
    ganttViewOpen: false,
    exportImportOpen: false,
    init: async () => {
      set({ loading: true, error: null, fsSupported: isFileSystemSupported() });
      try {
        const handle = await getPersistedWorkspaceHandle();
        if (!handle) {
          set({ loading: false });
          return;
        }
        const loaded = withComputedStatuses(
          await loadWorkspaceFromHandle(handle),
        );
        set({
          data: loaded,
          handle,
          loading: false,
          activeTabId: loaded.workspace.tabs[0]?.id ?? null,
          selectedProjectId: loaded.workspace.projectIds[0] ?? null,
        });
      } catch (error) {
        set({
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to initialize workspace.",
        });
      }
    },
    createWorkspace: async () => {
      set({ loading: true, error: null });
      try {
        const handle = await chooseWorkspaceFolder();
        const seeded = withComputedStatuses(createSeedWorkspace());
        await createWorkspaceScaffold(handle, seeded);
        set({
          data: seeded,
          handle,
          activeTabId: seeded.workspace.tabs[0]?.id ?? null,
          selectedProjectId: seeded.workspace.projectIds[0] ?? null,
          error: null,
          loading: false,
          saveState: "saved",
        });
      } catch (error) {
        set({
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Unable to create workspace.",
        });
      }
    },
    openWorkspace: async () => {
      set({ loading: true, error: null });
      try {
        const handle = await chooseWorkspaceFolder();
        const loaded = withComputedStatuses(
          await loadWorkspaceFromHandle(handle),
        );
        set({
          data: loaded,
          handle,
          activeTabId: loaded.workspace.tabs[0]?.id ?? null,
          selectedProjectId: loaded.workspace.projectIds[0] ?? null,
          error: null,
          loading: false,
        });
      } catch (error) {
        set({
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Unable to open workspace.",
        });
      }
    },
    saveNow: async () => {
      const { handle, data } = get();
      if (!handle || !data) return;
      set({ saveState: "saving" });
      try {
        await saveWorkspaceToHandle(handle, data);
        set({ saveState: "saved" });
      } catch (error) {
        set({
          saveState: "error",
          error:
            error instanceof Error
              ? error.message
              : "Failed to save workspace.",
        });
      }
    },
    setSearchQuery: (value) => set({ searchQuery: value }),
    setActiveTab: (id) => set({ activeTabId: id }),
    setSummaryOpen: (open) => set({ summaryOpen: open }),
    setAddTaskOpen: (open) => set({ addTaskOpen: open }),
    setTeamOpen: (open) => set({ teamOpen: open }),
    setZoom: (zoom) => {
      set({ zoom });
      savePrefs(zoom, get().timelineFilter);
    },
    setTimelineFilter: (timelineFilter) => {
      set({ timelineFilter });
      savePrefs(get().zoom, timelineFilter);
    },
    toggleTaskSelection: (taskId) => {
      const { selectedTaskIds } = get();
      set({
        selectedTaskIds: selectedTaskIds.includes(taskId)
          ? selectedTaskIds.filter((id) => id !== taskId)
          : [...selectedTaskIds, taskId],
      });
    },
    clearTaskSelection: () => set({ selectedTaskIds: [] }),
    selectAllTasks: (projectId) => {
      const { data } = get();
      const project = data?.projects.find((p) => p.id === projectId);
      if (project) {
        set({ selectedTaskIds: project.tasks.map((t) => t.id) });
      }
    },
    bulkUpdateTasks: (projectId, updates) => {
      const { data, handle, selectedTaskIds } = get();
      if (!data || !selectedTaskIds.length) return;
      const prev = structuredClone(data);
      const next = {
        ...data,
        projects: data.projects.map((project) =>
          project.id !== projectId
            ? project
            : {
                ...project,
                tasks: project.tasks.map((task) =>
                  selectedTaskIds.includes(task.id)
                    ? {
                        ...task,
                        ...updates,
                        status: computeTaskStatus({ ...task, ...updates }),
                      }
                    : task,
                ),
              },
        ),
      };
      const count = selectedTaskIds.length;
      set({ data: next, saveState: "idle", selectedTaskIds: [] });
      if (handle) triggerDebouncedSave(handle, next, set);
      get().pushUndo(
        `Bulk update ${count} tasks`,
        () => set({ data: prev }),
        () => set({ data: next }),
      );
    },
    bulkShiftDates: (projectId, days) => {
      const { data, handle, selectedTaskIds } = get();
      if (!data || !selectedTaskIds.length) return;
      const shift = (d: string) => {
        const date = new Date(d);
        date.setDate(date.getDate() + days);
        return date.toISOString().slice(0, 10);
      };
      const prev = structuredClone(data);
      const next = {
        ...data,
        projects: data.projects.map((project) =>
          project.id !== projectId
            ? project
            : {
                ...project,
                tasks: project.tasks.map((task) =>
                  selectedTaskIds.includes(task.id)
                    ? {
                        ...task,
                        startDate: shift(task.startDate),
                        endDate: shift(task.endDate),
                        expectedStartDate: shift(task.expectedStartDate),
                        expectedEndDate: shift(task.expectedEndDate),
                        status: computeTaskStatus({
                          ...task,
                          startDate: shift(task.startDate),
                          endDate: shift(task.endDate),
                          expectedStartDate: shift(task.expectedStartDate),
                          expectedEndDate: shift(task.expectedEndDate),
                        }),
                      }
                    : task,
                ),
              },
        ),
      };
      const count = selectedTaskIds.length;
      set({ data: next, saveState: "idle", selectedTaskIds: [] });
      if (handle) triggerDebouncedSave(handle, next, set);
      get().pushUndo(
        `Shift ${count} tasks by ${days}d`,
        () => set({ data: prev }),
        () => set({ data: next }),
      );
    },
    bulkDeleteTasks: (projectId) => {
      const { data, handle, selectedTaskIds } = get();
      if (!data || !selectedTaskIds.length) return;
      const prev = structuredClone(data);
      const next = {
        ...data,
        projects: data.projects.map((project) =>
          project.id !== projectId
            ? project
            : {
                ...project,
                tasks: project.tasks.filter(
                  (task) => !selectedTaskIds.includes(task.id),
                ),
              },
        ),
      };
      const count = selectedTaskIds.length;
      set({ data: next, saveState: "idle", selectedTaskIds: [] });
      if (handle) triggerDebouncedSave(handle, next, set);
      get().pushUndo(
        `Delete ${count} tasks`,
        () => set({ data: prev }),
        () => set({ data: next }),
      );
    },
    pushUndo: (description, undoFn, redoFn) => {
      const { undoStack } = get();
      set({
        undoStack: [
          ...undoStack.slice(-49),
          { description, undo: undoFn, redo: redoFn },
        ],
        redoStack: [],
      });
    },
    undo: () => {
      const { undoStack } = get();
      if (!undoStack.length) return;
      const entry = undoStack[undoStack.length - 1];
      entry.undo();
      set({
        undoStack: undoStack.slice(0, -1),
        redoStack: [...get().redoStack, entry],
      });
    },
    redo: () => {
      const { redoStack } = get();
      if (!redoStack.length) return;
      const entry = redoStack[redoStack.length - 1];
      entry.redo();
      set({
        redoStack: redoStack.slice(0, -1),
        undoStack: [...get().undoStack, entry],
      });
    },
    upsertPerson: (person) => {
      const { data, handle } = get();
      if (!data) return;
      const nextPeople = data.people.some((entry) => entry.id === person.id)
        ? data.people.map((entry) => (entry.id === person.id ? person : entry))
        : [...data.people, person];
      const next = { ...data, people: nextPeople };
      set({ data: next, saveState: "idle" });
      if (handle) triggerDebouncedSave(handle, next, set);
    },
    deletePerson: (personId) => {
      const { data, handle } = get();
      if (!data) return;
      const next = {
        ...data,
        people: data.people.filter((person) => person.id !== personId),
      };
      set({ data: next, saveState: "idle" });
      if (handle) triggerDebouncedSave(handle, next, set);
    },
    updateWorkspaceName: (name) => {
      const data = get().data;
      if (!data) return;
      const next = { ...data, workspace: { ...data.workspace, name } };
      set({ data: next });
      if (get().handle) triggerDebouncedSave(get().handle!, next, set);
    },
    upsertTask: (projectId, task) => {
      const { data, handle } = get();
      if (!data) return;
      const prev = structuredClone(data);
      const nextProjects = data.projects.map((project) =>
        project.id !== projectId
          ? project
          : {
              ...project,
              tasks: project.tasks.some((current) => current.id === task.id)
                ? project.tasks.map((current) =>
                    current.id === task.id
                      ? { ...task, status: computeTaskStatus(task) }
                      : current,
                  )
                : [
                    ...project.tasks,
                    { ...task, status: computeTaskStatus(task) },
                  ],
            },
      );
      const next = { ...data, projects: nextProjects };
      set({ data: next, saveState: "idle", recentlyDeletedTask: null });
      if (handle) triggerDebouncedSave(handle, next, set);
      const isNew = !prev.projects
        .find((p) => p.id === projectId)
        ?.tasks.some((t) => t.id === task.id);
      get().pushUndo(
        isNew ? `Create "${task.title}"` : `Update "${task.title}"`,
        () => set({ data: prev }),
        () => set({ data: next }),
      );
    },
    deleteTask: (projectId, taskId) => {
      const { data, handle } = get();
      if (!data) return;
      const project = data.projects.find((entry) => entry.id === projectId);
      const task = project?.tasks.find((entry) => entry.id === taskId);
      if (!task) return;
      const prev = structuredClone(data);
      const next = {
        ...data,
        projects: data.projects.map((project) =>
          project.id !== projectId
            ? project
            : {
                ...project,
                tasks: project.tasks.filter((task) => task.id !== taskId),
              },
        ),
      };
      set({ data: next, recentlyDeletedTask: { projectId, task } });
      if (handle) triggerDebouncedSave(handle, next, set);
      get().pushUndo(
        `Delete "${task.title}"`,
        () => set({ data: prev }),
        () => set({ data: next }),
      );
    },
    undoDeleteTask: () => {
      const { data, handle, recentlyDeletedTask } = get();
      if (!data || !recentlyDeletedTask) return;
      const next = {
        ...data,
        projects: data.projects.map((project) =>
          project.id !== recentlyDeletedTask.projectId
            ? project
            : {
                ...project,
                tasks: [
                  ...project.tasks,
                  {
                    ...recentlyDeletedTask.task,
                    status: computeTaskStatus(recentlyDeletedTask.task),
                  },
                ],
              },
        ),
      };
      set({ data: next, recentlyDeletedTask: null, saveState: "idle" });
      if (handle) triggerDebouncedSave(handle, next, set);
    },
    clearRecentlyDeletedTask: () => set({ recentlyDeletedTask: null }),
    createTaskFromNaturalLanguage: (projectId, input) => {
      const draft = parseNaturalLanguageTask(input);
      const task: Task = {
        id: draft.id ?? uid("task"),
        title: draft.title,
        description: draft.description ?? "",
        assignees: draft.assignees?.length
          ? draft.assignees
          : makeAssigneeHistory("Unassigned", draft.startDate!),
        accountable: draft.accountable?.length
          ? draft.accountable
          : makeAccountableHistory("Unassigned", draft.startDate!),
        jiraLink: draft.jiraLink ?? "",
        deliverable: draft.deliverable ?? "",
        startDate: draft.startDate!,
        endDate: draft.endDate!,
        expectedStartDate: draft.expectedStartDate!,
        expectedEndDate: draft.expectedEndDate!,
        progressPercent: draft.progressPercent ?? 0,
        priority: draft.priority ?? "Medium",
        labels: draft.labels ?? [],
        blockedReason: draft.blockedReason ?? "",
        dependencies: draft.dependencies ?? [],
        crossProjectDependencies: [],
        status: "Not Started",
        activityLog: [],
        isTemplate: false,
      };
      get().upsertTask(projectId, task);
      return task;
    },
    addActivityLogEntry: (projectId, taskId, entry) => {
      const { data, handle } = get();
      if (!data) return;
      const next = {
        ...data,
        projects: data.projects.map((project) =>
          project.id !== projectId
            ? project
            : {
                ...project,
                tasks: project.tasks.map((task) =>
                  task.id === taskId
                    ? {
                        ...task,
                        activityLog: [...task.activityLog, entry],
                      }
                    : task,
                ),
              },
        ),
      };
      set({ data: next, saveState: "idle" });
      if (handle) triggerDebouncedSave(handle, next, set);
    },
    addCrossProjectDependency: (projectId, taskId, dep) => {
      const { data, handle } = get();
      if (!data) return;
      const next = {
        ...data,
        projects: data.projects.map((project) =>
          project.id !== projectId
            ? project
            : {
                ...project,
                tasks: project.tasks.map((task) =>
                  task.id === taskId
                    ? {
                        ...task,
                        crossProjectDependencies: [
                          ...task.crossProjectDependencies,
                          dep,
                        ],
                      }
                    : task,
                ),
              },
        ),
      };
      set({ data: next, saveState: "idle" });
      if (handle) triggerDebouncedSave(handle, next, set);
    },
    removeCrossProjectDependency: (projectId, taskId, depIndex) => {
      const { data, handle } = get();
      if (!data) return;
      const next = {
        ...data,
        projects: data.projects.map((project) =>
          project.id !== projectId
            ? project
            : {
                ...project,
                tasks: project.tasks.map((task) =>
                  task.id === taskId
                    ? {
                        ...task,
                        crossProjectDependencies:
                          task.crossProjectDependencies.filter(
                            (_, i) => i !== depIndex,
                          ),
                      }
                    : task,
                ),
              },
        ),
      };
      set({ data: next, saveState: "idle" });
      if (handle) triggerDebouncedSave(handle, next, set);
    },
    saveTemplate: (template) => {
      const { templates } = get();
      const exists = templates.some((t) => t.id === template.id);
      const next = exists
        ? templates.map((t) => (t.id === template.id ? template : t))
        : [...templates, template];
      set({ templates: next });
      persistTemplates(next);
    },
    deleteTemplate: (templateId) => {
      const next = get().templates.filter((t) => t.id !== templateId);
      set({ templates: next });
      persistTemplates(next);
    },
    instantiateTemplate: (templateId, projectId, startDate) => {
      const template = get().templates.find((t) => t.id === templateId);
      if (!template) return null;
      const start = new Date(startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + template.durationDays);
      const task: Task = {
        id: uid("task"),
        title: template.title,
        description: template.description,
        assignees: template.assignees,
        accountable: template.accountable,
        jiraLink: "",
        deliverable: template.deliverable,
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        expectedStartDate: start.toISOString().slice(0, 10),
        expectedEndDate: end.toISOString().slice(0, 10),
        progressPercent: 0,
        priority: template.priority,
        labels: template.labels,
        blockedReason: "",
        dependencies: [],
        crossProjectDependencies: [],
        status: "Not Started",
        activityLog: [],
        isTemplate: false,
        templateId: template.id,
      };
      get().upsertTask(projectId, task);
      return task;
    },
    setWorkloadViewOpen: (open) => set({ workloadViewOpen: open }),
    setGanttViewOpen: (open) => set({ ganttViewOpen: open }),
    setExportImportOpen: (open) => set({ exportImportOpen: open }),
    exportWorkspace: () => {
      const { data } = get();
      if (!data) return;
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${data.workspace.name.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.timeliner.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
    importWorkspace: async (file) => {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        // Validate with Zod schema
        const validated = workspaceSchema.parse(parsed.workspace);
        const data = {
          workspace: validated,
          projects: parsed.projects ?? [],
          people: parsed.people ?? [],
          labels: parsed.labels ?? [],
        } as WorkspaceData;
        const next = withComputedStatuses(data);
        set({ data: next, saveState: "idle" });
        // Persist to file system if handle is available
        const { handle } = get();
        if (handle) {
          triggerDebouncedSave(handle, next, set);
        }
      } catch (error) {
        set({
          error:
            error instanceof Error
              ? error.message
              : "Failed to import workspace.",
        });
      }
    },
  };
});

export const selectActiveTabProjects = (
  data: WorkspaceData | null,
  activeTabId: string | null,
): Project[] => {
  if (!data) return [];
  const activeTab =
    data.workspace.tabs.find((tab) => tab.id === activeTabId) ??
    data.workspace.tabs[0];
  if (!activeTab) return data.projects.slice(0, 1);
  return activeTab.projectIds
    .map((projectId) =>
      data.projects.find((project) => project.id === projectId),
    )
    .filter(Boolean) as Project[];
};
