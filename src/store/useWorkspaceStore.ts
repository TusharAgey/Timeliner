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
import type { Person, Project, Task, WorkspaceData } from "../models/types";

type SaveState = "idle" | "saving" | "saved" | "error";

type DeletedTaskSnapshot = {
  projectId: string;
  task: Task;
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

const debouncedSave = debounce(
  async (
    handle: WorkspaceFolderHandle,
    data: WorkspaceData,
    setState: (partial: Partial<WorkspaceStore>) => void,
  ) => {
    try {
      setState({ saveState: "saving" });
      await saveWorkspaceToHandle(handle, data);
      setState({ saveState: "saved" });
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

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
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
        error:
          error instanceof Error
            ? error.message
            : "Unable to create workspace.",
      });
    }
  },
  openWorkspace: async () => {
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
        error:
          error instanceof Error ? error.message : "Unable to open workspace.",
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
          error instanceof Error ? error.message : "Failed to save workspace.",
      });
    }
  },
  setSearchQuery: (value) => set({ searchQuery: value }),
  setActiveTab: (id) => set({ activeTabId: id }),
  setSummaryOpen: (open) => set({ summaryOpen: open }),
  setAddTaskOpen: (open) => set({ addTaskOpen: open }),
  setTeamOpen: (open) => set({ teamOpen: open }),
  upsertPerson: (person) => {
    const { data, handle } = get();
    if (!data) return;
    const nextPeople = data.people.some((entry) => entry.id === person.id)
      ? data.people.map((entry) => (entry.id === person.id ? person : entry))
      : [...data.people, person];
    const next = { ...data, people: nextPeople };
    set({ data: next, saveState: "idle" });
    if (handle) debouncedSave(handle, next, set);
  },
  deletePerson: (personId) => {
    const { data, handle } = get();
    if (!data) return;
    const next = {
      ...data,
      people: data.people.filter((person) => person.id !== personId),
    };
    set({ data: next, saveState: "idle" });
    if (handle) debouncedSave(handle, next, set);
  },
  updateWorkspaceName: (name) => {
    const data = get().data;
    if (!data) return;
    const next = { ...data, workspace: { ...data.workspace, name } };
    set({ data: next });
    if (get().handle) debouncedSave(get().handle!, next, set);
  },
  upsertTask: (projectId, task) => {
    const { data, handle } = get();
    if (!data) return;
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
    if (handle) debouncedSave(handle, next, set);
  },
  deleteTask: (projectId, taskId) => {
    const { data, handle } = get();
    if (!data) return;
    const project = data.projects.find((entry) => entry.id === projectId);
    const task = project?.tasks.find((entry) => entry.id === taskId);
    if (!task) return;
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
    if (handle) debouncedSave(handle, next, set);
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
    if (handle) debouncedSave(handle, next, set);
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
      status: "Not Started",
    };
    get().upsertTask(projectId, task);
    return task;
  },
}));

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
