import { create } from "zustand";
import { toast } from "sonner";
import { createSeedWorkspace } from "../services/seedData";
import {
  chooseWorkspaceFolder,
  createWorkspaceScaffold,
  deleteJson,
  getPersistedWorkspaceHandle,
  isFileSystemSupported,
  loadWorkspaceFromHandle,
  saveWorkspaceToHandle,
  type WorkspaceFolderHandle,
} from "../services/fileSystem";
import { debounce, slugify, uid } from "../lib/utils";
import { iso } from "../lib/date";
import { computeTaskStatus } from "../lib/status";
import { parseNaturalLanguageTask } from "../lib/parser";
import {
  makeAccountableHistory,
  makeAssigneeHistory,
  normalizeAssignees,
} from "../lib/assignees";
import type {
  Milestone,
  Person,
  Project,
  Task,
  WorkspaceData,
  ActivityLogEntry,
  TaskTemplate,
  CrossProjectDependency,
} from "../models/types";

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
  zoom: "week" | "month" | "quarter";
  timelineFilter: "all" | "overdue" | "atRisk" | "startsToday";
  selectedTaskIds: string[];
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
  templates: TaskTemplate[];
  workloadViewOpen: boolean;
  ganttViewOpen: boolean;
  dependencyGraphOpen: boolean;
  exportImportOpen: boolean;
  milestoneModalOpen: boolean;
  manageProjectsOpen: boolean;
  visibleProjectIds: string[];
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
  setDependencyGraphOpen: (open: boolean) => void;
  setExportImportOpen: (open: boolean) => void;
  setMilestoneModalOpen: (open: boolean) => void;
  upsertMilestone: (projectId: string, milestone: Milestone) => void;
  deleteMilestone: (projectId: string, milestoneId: string) => void;
  exportWorkspace: () => void;
  importWorkspace: (file: File) => Promise<void>;
  // Project management
  setVisibleProjects: (ids: string[]) => void;
  createProject: (name: string, description?: string) => void;
  updateProject: (project: Project) => void;
  deleteProject: (projectId: string) => Promise<void>;
  setManageProjectsOpen: (open: boolean) => void;
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
      if (version !== saveVersion) return;
      await saveWorkspaceToHandle(handle, data);
      if (version === saveVersion) {
        setState({ saveState: "saved", error: null });
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
  } catch {
    // localStorage may be unavailable; use defaults
  }
  return { zoom: "month" as const, timelineFilter: "all" as const };
};

const savePrefs = (zoom: string, timelineFilter: string) => {
  try {
    localStorage.setItem(
      "timeliner-prefs",
      JSON.stringify({ zoom, timelineFilter }),
    );
  } catch {
    // localStorage may be unavailable; silently continue
  }
};

const VISIBLE_PROJECTS_KEY = "timeliner-visible-projects";
const loadPersistedVisibleProjects = (): string[] | null => {
  try {
    const saved = localStorage.getItem(VISIBLE_PROJECTS_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};
const persistVisibleProjects = (ids: string[]) => {
  try {
    localStorage.setItem(VISIBLE_PROJECTS_KEY, JSON.stringify(ids));
  } catch {
    // localStorage may be unavailable; silently continue
  }
};

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
  } catch {
    // localStorage may be unavailable; silently continue
  }
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
    dependencyGraphOpen: false,
    exportImportOpen: false,
    milestoneModalOpen: false,
    manageProjectsOpen: false,
    visibleProjectIds: loadPersistedVisibleProjects() ?? [],
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
        const visibleProjects = loadPersistedVisibleProjects();
        const firstTab = loaded.workspace.tabs[0];
        const seededVisible =
          visibleProjects ??
          (firstTab
            ? firstTab.projectIds.slice(0, 2)
            : loaded.workspace.projectIds.slice(0, 2));
        set({
          data: loaded,
          handle,
          loading: false,
          activeTabId: loaded.workspace.tabs[0]?.id ?? null,
          selectedProjectId: loaded.workspace.projectIds[0] ?? null,
          visibleProjectIds: seededVisible,
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
        const firstTab = seeded.workspace.tabs[0];
        const seededVisible = firstTab
          ? firstTab.projectIds.slice(0, 2)
          : seeded.workspace.projectIds.slice(0, 2);
        set({
          data: seeded,
          handle,
          activeTabId: seeded.workspace.tabs[0]?.id ?? null,
          selectedProjectId: seeded.workspace.projectIds[0] ?? null,
          visibleProjectIds: seededVisible,
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
        const firstTab = loaded.workspace.tabs[0];
        const seededVisible = firstTab
          ? firstTab.projectIds.slice(0, 2)
          : loaded.workspace.projectIds.slice(0, 2);
        set({
          data: loaded,
          handle,
          activeTabId: loaded.workspace.tabs[0]?.id ?? null,
          selectedProjectId: loaded.workspace.projectIds[0] ?? null,
          visibleProjectIds: seededVisible,
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
      set({ saveState: "saving", error: null });
      try {
        // L5: Bump saveVersion so any in-flight debounced save with an older
        // version is discarded, preventing a stale overwrite after saveNow.
        saveVersion++;
        await saveWorkspaceToHandle(handle, data);
        set({ saveState: "saved", error: null });
        toast.success("Workspace saved");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to save workspace.";
        set({ saveState: "error", error: message });
        toast.error(message);
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
    /* H2 + M5: Use withComputedStatuses and persist via undo/redo */
    bulkUpdateTasks: (projectId, updates) => {
      const { data, handle, selectedTaskIds } = get();
      if (!data || !selectedTaskIds.length) return;
      const prev = structuredClone(data);
      const rawNext = {
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
      const next = withComputedStatuses(rawNext);
      const count = selectedTaskIds.length;
      set({ data: next, saveState: "idle", selectedTaskIds: [] });
      if (handle) triggerDebouncedSave(handle, next, set);
      get().pushUndo(
        `Bulk update ${count} tasks`,
        () => {
          set({ data: prev });
          if (get().handle) triggerDebouncedSave(get().handle!, prev, set);
        },
        () => {
          set({ data: next });
          if (get().handle) triggerDebouncedSave(get().handle!, next, set);
        },
      );
    },
    bulkShiftDates: (projectId, days) => {
      const { data, handle, selectedTaskIds } = get();
      if (!data || !selectedTaskIds.length) return;
      const shift = (d: string) => {
        const date = new Date(d);
        date.setDate(date.getDate() + days);
        return iso(date);
      };
      const prev = structuredClone(data);
      const rawNext = {
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
      const next = withComputedStatuses(rawNext);
      const count = selectedTaskIds.length;
      set({ data: next, saveState: "idle", selectedTaskIds: [] });
      if (handle) triggerDebouncedSave(handle, next, set);
      get().pushUndo(
        `Shift ${count} tasks by ${days}d`,
        () => {
          set({ data: prev });
          if (get().handle) triggerDebouncedSave(get().handle!, prev, set);
        },
        () => {
          set({ data: next });
          if (get().handle) triggerDebouncedSave(get().handle!, next, set);
        },
      );
    },
    bulkDeleteTasks: (projectId) => {
      const { data, handle, selectedTaskIds } = get();
      if (!data || !selectedTaskIds.length) return;
      const prev = structuredClone(data);
      const rawNext = {
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
      const next = withComputedStatuses(rawNext);
      const count = selectedTaskIds.length;
      set({ data: next, saveState: "idle", selectedTaskIds: [] });
      if (handle) triggerDebouncedSave(handle, next, set);
      get().pushUndo(
        `Delete ${count} tasks`,
        () => {
          set({ data: prev });
          if (get().handle) triggerDebouncedSave(get().handle!, prev, set);
        },
        () => {
          set({ data: next });
          if (get().handle) triggerDebouncedSave(get().handle!, next, set);
        },
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
      toast.info(`Undo: ${entry.description}`);
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
      toast.info(`Redo: ${entry.description}`);
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
      if (isNew) toast.success(`Task "${task.title}" created`);
      get().pushUndo(
        isNew ? `Create "${task.title}"` : `Update "${task.title}"`,
        () => {
          set({ data: prev });
          if (get().handle) triggerDebouncedSave(get().handle!, prev, set);
        },
        () => {
          set({ data: next });
          if (get().handle) triggerDebouncedSave(get().handle!, next, set);
        },
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
      toast.info(`Task "${task.title}" deleted (undo available)`);
      get().pushUndo(
        `Delete "${task.title}"`,
        () => {
          set({ data: prev, recentlyDeletedTask: null });
          if (get().handle) triggerDebouncedSave(get().handle!, prev, set);
        },
        () => {
          set({ data: next });
          if (get().handle) triggerDebouncedSave(get().handle!, next, set);
        },
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
        milestoneId: "",
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
        startDate: iso(start),
        endDate: iso(end),
        expectedStartDate: iso(start),
        expectedEndDate: iso(end),
        progressPercent: 0,
        priority: template.priority,
        labels: template.labels,
        blockedReason: "",
        milestoneId: "",
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
    setDependencyGraphOpen: (open) => set({ dependencyGraphOpen: open }),
    setExportImportOpen: (open) => set({ exportImportOpen: open }),
    setMilestoneModalOpen: (open) => set({ milestoneModalOpen: open }),
    upsertMilestone: (projectId, milestone) => {
      const { data, handle } = get();
      if (!data) return;
      const next = {
        ...data,
        projects: data.projects.map((project) =>
          project.id !== projectId
            ? project
            : {
                ...project,
                milestones: project.milestones.some(
                  (m) => m.id === milestone.id,
                )
                  ? project.milestones.map((m) =>
                      m.id === milestone.id ? milestone : m,
                    )
                  : [...project.milestones, milestone],
              },
        ),
      };
      set({ data: next, saveState: "idle" });
      if (handle) triggerDebouncedSave(handle, next, set);
    },
    deleteMilestone: (projectId, milestoneId) => {
      const { data, handle } = get();
      if (!data) return;
      // Also unlink all tasks that reference this milestone
      const next = {
        ...data,
        projects: data.projects.map((project) =>
          project.id !== projectId
            ? project
            : {
                ...project,
                milestones: project.milestones.filter(
                  (m) => m.id !== milestoneId,
                ),
                tasks: project.tasks.map((task) =>
                  task.milestoneId === milestoneId
                    ? { ...task, milestoneId: "" }
                    : task,
                ),
              },
        ),
      };
      set({ data: next, saveState: "idle" });
      if (handle) triggerDebouncedSave(handle, next, set);
    },
    /* L3: Append anchor to DOM for cross-browser download support */
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
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    /* H3: Validate all imported data with Zod schemas (lazy-loaded) */
    importWorkspace: async (file) => {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        // Dynamically import zod schemas only when importing — keeps zod out
        // of the initial bundle.
        const { workspaceSchema, projectSchema, personSchema, labelSchema } =
          await import("../models/schemas");
        const validated = workspaceSchema.parse(parsed.workspace);
        const data: WorkspaceData = {
          workspace: validated,
          projects: projectSchema.array().parse(parsed.projects ?? []),
          people: personSchema.array().parse(parsed.people ?? []),
          labels: labelSchema.array().parse(parsed.labels ?? []),
        };
        const next = withComputedStatuses(data);
        const firstTab = next.workspace.tabs[0];
        const seededVisible = firstTab
          ? firstTab.projectIds.slice(0, 2)
          : next.workspace.projectIds.slice(0, 2);
        set({
          data: next,
          saveState: "idle",
          visibleProjectIds: seededVisible,
        });
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
    // Project management
    setVisibleProjects: (ids) => {
      if (ids.length > 2) {
        toast.error("You can view at most 2 projects at a time.");
        return;
      }
      const unique = [...new Set(ids)];
      set({ visibleProjectIds: unique });
      persistVisibleProjects(unique);
    },
    /* H2: Ensure unique slug; H6: Add to active tab */
    createProject: (name, description = "") => {
      const { data, handle, activeTabId } = get();
      if (!data) return;
      const projectId = uid("project");
      let projectSlug = slugify(name);
      const existingSlugs = new Set(data.projects.map((p) => p.slug));
      if (existingSlugs.has(projectSlug)) {
        let counter = 2;
        while (existingSlugs.has(`${projectSlug}-${counter}`)) counter++;
        projectSlug = `${projectSlug}-${counter}`;
      }
      const project: Project = {
        id: projectId,
        name,
        slug: projectSlug,
        description,
        milestones: [],
        tasks: [],
      };
      const next: WorkspaceData = {
        ...data,
        workspace: {
          ...data.workspace,
          projectIds: [...data.workspace.projectIds, projectId],
          tabs: data.workspace.tabs.map((tab) =>
            tab.id === activeTabId
              ? { ...tab, projectIds: [...tab.projectIds, projectId] }
              : tab,
          ),
        },
        projects: [...data.projects, project],
      };
      set({ data: next, saveState: "idle" });
      if (handle) triggerDebouncedSave(handle, next, set);
      const { visibleProjectIds } = get();
      if (visibleProjectIds.length < 2) {
        const updated = [...visibleProjectIds, projectId];
        set({ visibleProjectIds: updated });
        persistVisibleProjects(updated);
      }
      toast.success(`Project "${name}" created`);
    },
    updateProject: (project) => {
      const { data, handle } = get();
      if (!data) return;
      const next: WorkspaceData = {
        ...data,
        projects: data.projects.map((p) =>
          p.id === project.id ? { ...project, slug: p.slug } : p,
        ),
      };
      set({ data: next, saveState: "idle" });
      if (handle) triggerDebouncedSave(handle, next, set);
    },
    /* C2 + L7: Synchronous save before project file delete, guarded error handling */
    deleteProject: async (projectId) => {
      const { data, handle, visibleProjectIds } = get();
      if (!data) return;
      const project = data.projects.find((p) => p.id === projectId);
      if (!project) return;
      const prev = structuredClone(data);
      const nextProjects = data.projects.filter((p) => p.id !== projectId);
      const nextTabs = data.workspace.tabs
        .map((tab) => ({
          ...tab,
          projectIds: tab.projectIds.filter((pid) => pid !== projectId),
        }))
        .filter((tab) => tab.projectIds.length > 0);
      const cleanedProjects = nextProjects.map((p) => ({
        ...p,
        tasks: p.tasks.map((task) => ({
          ...task,
          crossProjectDependencies: task.crossProjectDependencies.filter(
            (dep) => dep.projectId !== projectId,
          ),
        })),
      }));
      const next: WorkspaceData = {
        ...data,
        workspace: {
          ...data.workspace,
          projectIds: data.workspace.projectIds.filter(
            (pid) => pid !== projectId,
          ),
          tabs: nextTabs,
        },
        projects: cleanedProjects,
      };
      const nextVisible = visibleProjectIds.filter((id) => id !== projectId);
      set({
        data: next,
        visibleProjectIds: nextVisible,
        saveState: "idle",
      });
      persistVisibleProjects(nextVisible);
      if (handle) {
        try {
          saveVersion++;
          await saveWorkspaceToHandle(handle, next);
          set({ saveState: "saved" });
        } catch {
          // continue — the project file deletion is still attempted below
        }
        try {
          const projectsDir = await handle.getDirectoryHandle("projects");
          await deleteJson(projectsDir, `${project.slug}.json`);
        } catch (err) {
          if (!(err instanceof DOMException && err.name === "NotFoundError")) {
            console.error("Failed to delete project file:", err);
          }
        }
      }
      get().pushUndo(
        `Delete project "${project.name}"`,
        () => {
          set({
            data: prev,
            visibleProjectIds,
          });
          persistVisibleProjects(visibleProjectIds);
          if (get().handle) triggerDebouncedSave(get().handle!, prev, set);
          toast.info(`Restored project "${project.name}"`);
        },
        () => {
          set({
            data: next,
            visibleProjectIds: nextVisible,
          });
          persistVisibleProjects(nextVisible);
          if (get().handle) triggerDebouncedSave(get().handle!, next, set);
        },
      );
      toast.success(`Project "${project.name}" deleted (undo available)`);
    },
    setManageProjectsOpen: (open) => set({ manageProjectsOpen: open }),
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
