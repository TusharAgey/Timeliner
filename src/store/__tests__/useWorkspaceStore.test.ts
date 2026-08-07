import { describe, it, expect, beforeEach, vi } from "vitest";
import { useWorkspaceStore } from "../useWorkspaceStore";
import type { Task, WorkspaceData } from "../../models/types";

// Mock the file system service so saveNow can be tested without real handles.
vi.mock("../../services/fileSystem", () => ({
  saveWorkspaceToHandle: vi.fn(async () => {}),
  chooseWorkspaceFolder: vi.fn(),
  loadWorkspaceFromHandle: vi.fn(),
  getPersistedWorkspaceHandle: vi.fn(),
  createWorkspaceScaffold: vi.fn(),
  isFileSystemSupported: vi.fn(() => true),
}));

// Reset the store before each test
beforeEach(() => {
  useWorkspaceStore.setState({
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
    selectedTaskIds: [],
    undoStack: [],
    redoStack: [],
    templates: [],
    workloadViewOpen: false,
    ganttViewOpen: false,
    exportImportOpen: false,
  });
  localStorage.clear();
});

const makeSeedData = (): WorkspaceData => ({
  workspace: {
    id: "ws-1",
    name: "Test Workspace",
    projectIds: ["proj-1"],
    tabs: [{ id: "tab-1", name: "Tab 1", projectIds: ["proj-1"] }],
  },
  projects: [
    {
      id: "proj-1",
      name: "Project 1",
      slug: "project-1",
      description: "",
      milestones: [],
      tasks: [
        {
          id: "task-1",
          title: "Task 1",
          description: "",
          assignees: [
            {
              name: "Alice",
              role: "responsible" as const,
              from: "2026-01-01",
              to: null,
            },
          ],
          accountable: [{ name: "Bob", from: "2026-01-01", to: null }],
          jiraLink: "",
          deliverable: "",
          startDate: "2026-05-01",
          endDate: "2026-05-15",
          expectedStartDate: "2026-05-01",
          expectedEndDate: "2026-05-15",
          progressPercent: 50,
          priority: "Medium" as const,
          labels: [],
          blockedReason: "",
          milestoneId: "",
          dependencies: [],
          crossProjectDependencies: [],
          status: "On Track" as const,
          activityLog: [],
          isTemplate: false,
        },
      ],
    },
  ],
  people: [
    { id: "person-1", name: "Alice", role: "Developer" },
    { id: "person-2", name: "Bob", role: "Manager" },
  ],
  labels: [],
});

describe("WorkspaceStore", () => {
  describe("initial state", () => {
    it("starts with loading true and no data", () => {
      const state = useWorkspaceStore.getState();
      expect(state.loading).toBe(true);
      expect(state.data).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  describe("setSearchQuery", () => {
    it("updates the search query", () => {
      useWorkspaceStore.getState().setSearchQuery("login");
      expect(useWorkspaceStore.getState().searchQuery).toBe("login");
    });
  });

  describe("setActiveTab", () => {
    it("updates the active tab", () => {
      useWorkspaceStore.getState().setActiveTab("tab-2");
      expect(useWorkspaceStore.getState().activeTabId).toBe("tab-2");
    });
  });

  describe("setZoom", () => {
    it("updates zoom level", () => {
      useWorkspaceStore.getState().setZoom("week");
      expect(useWorkspaceStore.getState().zoom).toBe("week");
    });

    it("persists zoom to localStorage", () => {
      useWorkspaceStore.getState().setZoom("quarter");
      const saved = JSON.parse(localStorage.getItem("timeliner-prefs") || "{}");
      expect(saved.zoom).toBe("quarter");
    });
  });

  describe("setTimelineFilter", () => {
    it("updates timeline filter", () => {
      useWorkspaceStore.getState().setTimelineFilter("overdue");
      expect(useWorkspaceStore.getState().timelineFilter).toBe("overdue");
    });
  });

  describe("toggleTaskSelection", () => {
    it("adds a task ID to selection", () => {
      useWorkspaceStore.getState().toggleTaskSelection("task-1");
      expect(useWorkspaceStore.getState().selectedTaskIds).toContain("task-1");
    });

    it("removes a task ID if already selected", () => {
      useWorkspaceStore.setState({ selectedTaskIds: ["task-1", "task-2"] });
      useWorkspaceStore.getState().toggleTaskSelection("task-1");
      expect(useWorkspaceStore.getState().selectedTaskIds).toEqual(["task-2"]);
    });
  });

  describe("clearTaskSelection", () => {
    it("clears all selected task IDs", () => {
      useWorkspaceStore.setState({ selectedTaskIds: ["task-1", "task-2"] });
      useWorkspaceStore.getState().clearTaskSelection();
      expect(useWorkspaceStore.getState().selectedTaskIds).toEqual([]);
    });
  });

  describe("selectAllTasks", () => {
    it("selects all tasks in a project", () => {
      useWorkspaceStore.setState({ data: makeSeedData() });
      useWorkspaceStore.getState().selectAllTasks("proj-1");
      expect(useWorkspaceStore.getState().selectedTaskIds).toContain("task-1");
    });
  });

  describe("upsertPerson", () => {
    it("adds a new person", () => {
      useWorkspaceStore.setState({ data: makeSeedData() });
      useWorkspaceStore
        .getState()
        .upsertPerson({ id: "person-3", name: "Carol", role: "Designer" });
      const people = useWorkspaceStore.getState().data!.people;
      expect(people).toHaveLength(3);
      expect(people.find((p) => p.id === "person-3")?.name).toBe("Carol");
    });

    it("updates an existing person", () => {
      useWorkspaceStore.setState({ data: makeSeedData() });
      useWorkspaceStore
        .getState()
        .upsertPerson({ id: "person-1", name: "Alice Updated", role: "Lead" });
      const people = useWorkspaceStore.getState().data!.people;
      expect(people).toHaveLength(2);
      expect(people.find((p) => p.id === "person-1")?.name).toBe(
        "Alice Updated",
      );
    });
  });

  describe("deletePerson", () => {
    it("removes a person", () => {
      useWorkspaceStore.setState({ data: makeSeedData() });
      useWorkspaceStore.getState().deletePerson("person-1");
      expect(useWorkspaceStore.getState().data!.people).toHaveLength(1);
    });
  });

  describe("updateWorkspaceName", () => {
    it("updates the workspace name", () => {
      useWorkspaceStore.setState({ data: makeSeedData() });
      useWorkspaceStore.getState().updateWorkspaceName("New Name");
      expect(useWorkspaceStore.getState().data!.workspace.name).toBe(
        "New Name",
      );
    });
  });

  describe("upsertTask", () => {
    it("adds a new task to a project", () => {
      useWorkspaceStore.setState({ data: makeSeedData() });
      const newTask: Task = {
        id: "task-2",
        title: "New Task",
        description: "",
        assignees: [
          {
            name: "Alice",
            role: "responsible" as const,
            from: "2026-01-01",
            to: null,
          },
        ],
        accountable: [{ name: "Bob", from: "2026-01-01", to: null }],
        jiraLink: "",
        deliverable: "",
        startDate: "2026-05-10",
        endDate: "2026-05-20",
        expectedStartDate: "2026-05-10",
        expectedEndDate: "2026-05-20",
        progressPercent: 0,
        priority: "Medium" as const,
        labels: [],
        blockedReason: "",
        milestoneId: "",
        dependencies: [],
        crossProjectDependencies: [],
        status: "Not Started" as const,
        activityLog: [],
        isTemplate: false,
      };
      useWorkspaceStore.getState().upsertTask("proj-1", newTask);
      const tasks = useWorkspaceStore.getState().data!.projects[0].tasks;
      expect(tasks).toHaveLength(2);
      expect(tasks.find((t) => t.id === "task-2")?.title).toBe("New Task");
    });

    it("updates an existing task", () => {
      useWorkspaceStore.setState({ data: makeSeedData() });
      const updatedTask: Task = {
        ...useWorkspaceStore.getState().data!.projects[0].tasks[0],
        title: "Updated Task",
        progressPercent: 75,
      };
      useWorkspaceStore.getState().upsertTask("proj-1", updatedTask);
      const task = useWorkspaceStore.getState().data!.projects[0].tasks[0];
      expect(task.title).toBe("Updated Task");
      expect(task.progressPercent).toBe(75);
    });

    it("pushes undo entry for new task", () => {
      useWorkspaceStore.setState({ data: makeSeedData() });
      const newTask: Task = {
        id: "task-2",
        title: "New Task",
        description: "",
        assignees: [
          {
            name: "Alice",
            role: "responsible" as const,
            from: "2026-01-01",
            to: null,
          },
        ],
        accountable: [{ name: "Bob", from: "2026-01-01", to: null }],
        jiraLink: "",
        deliverable: "",
        startDate: "2026-05-10",
        endDate: "2026-05-20",
        expectedStartDate: "2026-05-10",
        expectedEndDate: "2026-05-20",
        progressPercent: 0,
        priority: "Medium" as const,
        labels: [],
        blockedReason: "",
        milestoneId: "",
        dependencies: [],
        crossProjectDependencies: [],
        status: "Not Started" as const,
        activityLog: [],
        isTemplate: false,
      };
      useWorkspaceStore.getState().upsertTask("proj-1", newTask);
      expect(useWorkspaceStore.getState().undoStack).toHaveLength(1);
      expect(useWorkspaceStore.getState().undoStack[0].description).toContain(
        "Create",
      );
    });
  });

  describe("deleteTask", () => {
    it("removes a task and stores snapshot", () => {
      useWorkspaceStore.setState({ data: makeSeedData() });
      useWorkspaceStore.getState().deleteTask("proj-1", "task-1");
      const tasks = useWorkspaceStore.getState().data!.projects[0].tasks;
      expect(tasks).toHaveLength(0);
      expect(useWorkspaceStore.getState().recentlyDeletedTask).not.toBeNull();
      expect(useWorkspaceStore.getState().recentlyDeletedTask!.task.id).toBe(
        "task-1",
      );
    });
  });

  describe("undoDeleteTask", () => {
    it("restores a deleted task", () => {
      useWorkspaceStore.setState({ data: makeSeedData() });
      useWorkspaceStore.getState().deleteTask("proj-1", "task-1");
      useWorkspaceStore.getState().undoDeleteTask();
      const tasks = useWorkspaceStore.getState().data!.projects[0].tasks;
      expect(tasks).toHaveLength(1);
      expect(tasks[0].id).toBe("task-1");
      expect(useWorkspaceStore.getState().recentlyDeletedTask).toBeNull();
    });
  });

  describe("undo/redo", () => {
    it("undo restores previous state", () => {
      useWorkspaceStore.setState({ data: makeSeedData() });
      const prevTitle =
        useWorkspaceStore.getState().data!.projects[0].tasks[0].title;
      const updatedTask: Task = {
        ...useWorkspaceStore.getState().data!.projects[0].tasks[0],
        title: "Changed",
      };
      useWorkspaceStore.getState().upsertTask("proj-1", updatedTask);
      useWorkspaceStore.getState().undo();
      expect(
        useWorkspaceStore.getState().data!.projects[0].tasks[0].title,
      ).toBe(prevTitle);
    });

    it("redo re-applies the change", () => {
      useWorkspaceStore.setState({ data: makeSeedData() });
      const updatedTask: Task = {
        ...useWorkspaceStore.getState().data!.projects[0].tasks[0],
        title: "Changed",
      };
      useWorkspaceStore.getState().upsertTask("proj-1", updatedTask);
      useWorkspaceStore.getState().undo();
      useWorkspaceStore.getState().redo();
      expect(
        useWorkspaceStore.getState().data!.projects[0].tasks[0].title,
      ).toBe("Changed");
    });

    it("does nothing when undo stack is empty", () => {
      const stateBefore = useWorkspaceStore.getState();
      useWorkspaceStore.getState().undo();
      expect(useWorkspaceStore.getState().undoStack).toEqual(
        stateBefore.undoStack,
      );
    });
  });

  describe("pushUndo", () => {
    it("caps undo stack at 50 entries", () => {
      for (let i = 0; i < 55; i++) {
        useWorkspaceStore.getState().pushUndo(
          `Action ${i}`,
          () => {},
          () => {},
        );
      }
      expect(useWorkspaceStore.getState().undoStack).toHaveLength(50);
    });

    it("clears redo stack on new action", () => {
      useWorkspaceStore.setState({
        redoStack: [{ description: "old", undo: () => {}, redo: () => {} }],
      });
      useWorkspaceStore.getState().pushUndo(
        "new",
        () => {},
        () => {},
      );
      expect(useWorkspaceStore.getState().redoStack).toHaveLength(0);
    });
  });

  describe("bulkUpdateTasks", () => {
    it("updates multiple tasks", () => {
      useWorkspaceStore.setState({
        data: makeSeedData(),
        selectedTaskIds: ["task-1"],
      });
      useWorkspaceStore
        .getState()
        .bulkUpdateTasks("proj-1", { priority: "High" as const });
      const task = useWorkspaceStore.getState().data!.projects[0].tasks[0];
      expect(task.priority).toBe("High");
    });

    it("clears selection after bulk update", () => {
      useWorkspaceStore.setState({
        data: makeSeedData(),
        selectedTaskIds: ["task-1"],
      });
      useWorkspaceStore
        .getState()
        .bulkUpdateTasks("proj-1", { priority: "High" as const });
      expect(useWorkspaceStore.getState().selectedTaskIds).toEqual([]);
    });
  });

  describe("bulkDeleteTasks", () => {
    it("deletes selected tasks", () => {
      useWorkspaceStore.setState({
        data: makeSeedData(),
        selectedTaskIds: ["task-1"],
      });
      useWorkspaceStore.getState().bulkDeleteTasks("proj-1");
      expect(useWorkspaceStore.getState().data!.projects[0].tasks).toHaveLength(
        0,
      );
    });
  });

  describe("templates", () => {
    it("saves a template", () => {
      const template = {
        id: "tmpl-1",
        name: "Bug Fix",
        title: "Fix bug",
        description: "",
        assignees: [],
        accountable: [],
        deliverable: "",
        priority: "High" as const,
        labels: [],
        durationDays: 3,
      };
      useWorkspaceStore.getState().saveTemplate(template);
      expect(useWorkspaceStore.getState().templates).toHaveLength(1);
    });

    it("deletes a template", () => {
      const template = {
        id: "tmpl-1",
        name: "Bug Fix",
        title: "Fix bug",
        description: "",
        assignees: [],
        accountable: [],
        deliverable: "",
        priority: "High" as const,
        labels: [],
        durationDays: 3,
      };
      useWorkspaceStore.getState().saveTemplate(template);
      useWorkspaceStore.getState().deleteTemplate("tmpl-1");
      expect(useWorkspaceStore.getState().templates).toHaveLength(0);
    });

    it("instantiates a template into a task", () => {
      useWorkspaceStore.setState({ data: makeSeedData() });
      const template = {
        id: "tmpl-1",
        name: "Bug Fix",
        title: "Fix critical bug",
        description: "Need to fix this ASAP",
        assignees: [],
        accountable: [],
        deliverable: "Patch release",
        priority: "Critical" as const,
        labels: ["bug"],
        durationDays: 2,
      };
      useWorkspaceStore.getState().saveTemplate(template);
      const task = useWorkspaceStore
        .getState()
        .instantiateTemplate("tmpl-1", "proj-1", "2026-06-01");
      expect(task).not.toBeNull();
      expect(task!.title).toBe("Fix critical bug");
      expect(task!.startDate).toBe("2026-06-01");
      expect(task!.endDate).toBe("2026-06-03");
      expect(task!.templateId).toBe("tmpl-1");
    });
  });

  describe("exportWorkspace", () => {
    it("triggers a download", () => {
      useWorkspaceStore.setState({ data: makeSeedData() });
      const createObjectURL = vi
        .spyOn(URL, "createObjectURL")
        .mockReturnValue("blob:test");
      const click = vi.fn();
      const anchor = document.createElement("a");
      anchor.click = click;
      const createElement = vi
        .spyOn(document, "createElement")
        .mockReturnValue(anchor);
      const appendChild = vi
        .spyOn(document.body, "appendChild")
        .mockImplementation((node) => node);
      const removeChild = vi
        .spyOn(document.body, "removeChild")
        .mockImplementation((node) => node);

      useWorkspaceStore.getState().exportWorkspace();

      expect(createElement).toHaveBeenCalledWith("a");
      expect(appendChild).toHaveBeenCalled();
      expect(click).toHaveBeenCalled();
      expect(removeChild).toHaveBeenCalled();

      createObjectURL.mockRestore();
      createElement.mockRestore();
      appendChild.mockRestore();
      removeChild.mockRestore();
    });
  });

  describe("selectActiveTabProjects", () => {
    it("returns projects for the active tab", async () => {
      const { selectActiveTabProjects } = await import("../useWorkspaceStore");
      const data = makeSeedData();
      const projects = selectActiveTabProjects(data, "tab-1");
      expect(projects).toHaveLength(1);
      expect(projects[0].id).toBe("proj-1");
    });

    it("returns empty array for null data", async () => {
      const { selectActiveTabProjects } = await import("../useWorkspaceStore");
      expect(selectActiveTabProjects(null, null)).toEqual([]);
    });
  });

  describe("undo/redo persistence (C1)", () => {
    it("undo and redo trigger a debounced save when a handle exists", () => {
      const handle = { name: "ws" } as unknown as FileSystemDirectoryHandle;
      useWorkspaceStore.setState({ data: makeSeedData(), handle });
      const { upsertTask, undo, redo } = useWorkspaceStore.getState();
      const task = makeSeedData().projects[0].tasks[0];
      upsertTask("proj-1", { ...task, title: "Renamed" });
      expect(useWorkspaceStore.getState().undoStack).toHaveLength(1);
      undo();
      expect(
        useWorkspaceStore.getState().data?.projects[0].tasks[0].title,
      ).toBe("Task 1");
      redo();
      expect(
        useWorkspaceStore.getState().data?.projects[0].tasks[0].title,
      ).toBe("Renamed");
    });
  });

  describe("deleteProject (C2 + Bug 9)", () => {
    it("removes the project and pushes an undo entry", async () => {
      useWorkspaceStore.setState({ data: makeSeedData() });
      await useWorkspaceStore.getState().deleteProject("proj-1");
      const state = useWorkspaceStore.getState();
      expect(state.data?.projects).toHaveLength(0);
      expect(state.undoStack).toHaveLength(1);
      expect(state.undoStack[0].description).toContain("Delete project");
    });

    it("undo restores the deleted project", async () => {
      useWorkspaceStore.setState({ data: makeSeedData() });
      await useWorkspaceStore.getState().deleteProject("proj-1");
      useWorkspaceStore.getState().undo();
      const state = useWorkspaceStore.getState();
      expect(state.data?.projects).toHaveLength(1);
      expect(state.data?.projects[0].id).toBe("proj-1");
    });
  });

  describe("createProject (H2 slug + H6 active tab)", () => {
    it("generates a unique slug when a collision exists", () => {
      useWorkspaceStore.setState({ data: makeSeedData() });
      useWorkspaceStore.getState().createProject("Project 1");
      const projects = useWorkspaceStore.getState().data!.projects;
      const slugs = projects.map((p) => p.slug);
      expect(slugs).toContain("project-1-2");
    });

    it("adds the new project to the active tab", () => {
      useWorkspaceStore.setState({
        data: makeSeedData(),
        activeTabId: "tab-1",
      });
      useWorkspaceStore.getState().createProject("Brand New");
      const tab = useWorkspaceStore
        .getState()
        .data!.workspace.tabs.find((t) => t.id === "tab-1");
      expect(tab!.projectIds).toHaveLength(2);
    });
  });

  describe("importWorkspace validation (H3)", () => {
    it("rejects malformed project data", async () => {
      useWorkspaceStore.setState({ data: makeSeedData() });
      const file = new File(
        [
          JSON.stringify({
            workspace: {
              id: "ws-1",
              name: "Test",
              projectIds: [],
              tabs: [],
            },
            projects: [{ id: "bad", name: 123 }],
          }),
        ],
        "bad.json",
        { type: "application/json" },
      );
      await useWorkspaceStore.getState().importWorkspace(file);
      expect(useWorkspaceStore.getState().error).toBeTruthy();
    });

    it("rejects malformed people data", async () => {
      useWorkspaceStore.setState({ data: makeSeedData() });
      const file = new File(
        [
          JSON.stringify({
            workspace: {
              id: "ws-1",
              name: "Test",
              projectIds: [],
              tabs: [],
            },
            projects: [],
            people: [{ id: "p", name: 42 }],
          }),
        ],
        "bad.json",
        { type: "application/json" },
      );
      await useWorkspaceStore.getState().importWorkspace(file);
      expect(useWorkspaceStore.getState().error).toBeTruthy();
    });
  });

  describe("bulkShiftDates (Bug 2)", () => {
    it("shifts dates and recomputes statuses", () => {
      useWorkspaceStore.setState({ data: makeSeedData() });
      useWorkspaceStore.getState().selectAllTasks("proj-1");
      useWorkspaceStore.getState().bulkShiftDates("proj-1", 1);
      const task = useWorkspaceStore.getState().data!.projects[0].tasks[0];
      expect(task.startDate).toBe("2026-05-02");
      expect(task.endDate).toBe("2026-05-16");
      expect(task.expectedStartDate).toBe("2026-05-02");
      expect(task.expectedEndDate).toBe("2026-05-16");
    });
  });

  describe("deleteTask undo clears recentlyDeletedTask (N2)", () => {
    it("clears recentlyDeletedTask when undo is invoked", () => {
      useWorkspaceStore.setState({ data: makeSeedData() });
      useWorkspaceStore.getState().deleteTask("proj-1", "task-1");
      expect(useWorkspaceStore.getState().recentlyDeletedTask).not.toBeNull();
      useWorkspaceStore.getState().undo();
      expect(useWorkspaceStore.getState().recentlyDeletedTask).toBeNull();
      expect(useWorkspaceStore.getState().data?.projects[0].tasks).toHaveLength(
        1,
      );
    });
  });

  describe("modal open toggles", () => {
    it("setSummaryOpen updates summaryOpen", () => {
      useWorkspaceStore.getState().setSummaryOpen(true);
      expect(useWorkspaceStore.getState().summaryOpen).toBe(true);
    });

    it("setAddTaskOpen updates addTaskOpen", () => {
      useWorkspaceStore.getState().setAddTaskOpen(true);
      expect(useWorkspaceStore.getState().addTaskOpen).toBe(true);
    });

    it("setTeamOpen updates teamOpen", () => {
      useWorkspaceStore.getState().setTeamOpen(true);
      expect(useWorkspaceStore.getState().teamOpen).toBe(true);
    });
  });

  describe("saveNow", () => {
    it("does nothing when there is no handle", async () => {
      useWorkspaceStore.setState({ data: makeSeedData(), handle: null });
      await useWorkspaceStore.getState().saveNow();
      expect(useWorkspaceStore.getState().saveState).toBe("idle");
    });

    it("saves and sets saveState to saved", async () => {
      const handle = { name: "ws" } as unknown as FileSystemDirectoryHandle;
      useWorkspaceStore.setState({ data: makeSeedData(), handle });
      await useWorkspaceStore.getState().saveNow();
      expect(useWorkspaceStore.getState().saveState).toBe("saved");
      expect(useWorkspaceStore.getState().error).toBeNull();
    });

    it("sets error state when saving fails", async () => {
      const handle = { name: "ws" } as unknown as FileSystemDirectoryHandle;
      useWorkspaceStore.setState({ data: makeSeedData(), handle });
      const { saveWorkspaceToHandle } =
        await import("../../services/fileSystem");
      const mocked = vi.mocked(saveWorkspaceToHandle);
      mocked.mockRejectedValueOnce(new Error("disk full"));
      await useWorkspaceStore.getState().saveNow();
      expect(useWorkspaceStore.getState().saveState).toBe("error");
      expect(useWorkspaceStore.getState().error).toBe("disk full");
      mocked.mockReset();
    });
  });

  describe("addActivityLogEntry", () => {
    it("appends an activity log entry to a task", () => {
      useWorkspaceStore.setState({ data: makeSeedData() });
      useWorkspaceStore.getState().addActivityLogEntry("proj-1", "task-1", {
        id: "log-1",
        actor: "Alice",
        action: "updated",
        field: "status",
        timestamp: "2026-05-01T10:00:00.000Z",
      });
      const task = useWorkspaceStore.getState().data!.projects[0].tasks[0];
      expect(task.activityLog).toHaveLength(1);
      expect(task.activityLog[0].actor).toBe("Alice");
    });
  });

  describe("addCrossProjectDependency", () => {
    it("adds a cross-project dependency to a task", () => {
      useWorkspaceStore.setState({ data: makeSeedData() });
      useWorkspaceStore
        .getState()
        .addCrossProjectDependency("proj-1", "task-1", {
          taskId: "ext-1",
          projectId: "proj-x",
          label: "External",
        });
      const task = useWorkspaceStore.getState().data!.projects[0].tasks[0];
      expect(task.crossProjectDependencies).toHaveLength(1);
      expect(task.crossProjectDependencies[0].label).toBe("External");
    });
  });

  describe("removeCrossProjectDependency", () => {
    it("removes a cross-project dependency by index", () => {
      useWorkspaceStore.setState({ data: makeSeedData() });
      useWorkspaceStore
        .getState()
        .addCrossProjectDependency("proj-1", "task-1", {
          taskId: "ext-1",
          projectId: "proj-x",
          label: "External",
        });
      useWorkspaceStore
        .getState()
        .removeCrossProjectDependency("proj-1", "task-1", 0);
      const task = useWorkspaceStore.getState().data!.projects[0].tasks[0];
      expect(task.crossProjectDependencies).toHaveLength(0);
    });
  });

  describe("createTaskFromNaturalLanguage", () => {
    it("creates a task from natural language input", () => {
      useWorkspaceStore.setState({ data: makeSeedData() });
      const task = useWorkspaceStore
        .getState()
        .createTaskFromNaturalLanguage("proj-1", "Build login page by May 10");
      expect(task.title).toBeTruthy();
      expect(useWorkspaceStore.getState().data!.projects[0].tasks).toHaveLength(
        2,
      );
    });
  });

  describe("upsertMilestone", () => {
    it("adds a new milestone", () => {
      useWorkspaceStore.setState({ data: makeSeedData() });
      useWorkspaceStore.getState().upsertMilestone("proj-1", {
        id: "ms-1",
        title: "Launch",
        date: "2026-06-01",
        description: "",
        color: "blue",
      });
      const milestones =
        useWorkspaceStore.getState().data!.projects[0].milestones;
      expect(milestones).toHaveLength(1);
      expect(milestones[0].title).toBe("Launch");
    });

    it("updates an existing milestone", () => {
      useWorkspaceStore.setState({ data: makeSeedData() });
      useWorkspaceStore.getState().upsertMilestone("proj-1", {
        id: "ms-1",
        title: "Launch",
        date: "2026-06-01",
        description: "",
        color: "blue",
      });
      useWorkspaceStore.getState().upsertMilestone("proj-1", {
        id: "ms-1",
        title: "Launch v2",
        date: "2026-06-15",
        description: "",
        color: "blue",
      });
      const milestones =
        useWorkspaceStore.getState().data!.projects[0].milestones;
      expect(milestones).toHaveLength(1);
      expect(milestones[0].title).toBe("Launch v2");
    });
  });

  describe("deleteMilestone", () => {
    it("removes a milestone and unlinks tasks", () => {
      useWorkspaceStore.setState({ data: makeSeedData() });
      useWorkspaceStore.getState().upsertMilestone("proj-1", {
        id: "ms-1",
        title: "Launch",
        date: "2026-06-01",
        description: "",
        color: "blue",
      });

      const task = useWorkspaceStore.getState().data!.projects[0].tasks[0];
      useWorkspaceStore.getState().upsertTask("proj-1", {
        ...task,
        milestoneId: "ms-1",
      });
      useWorkspaceStore.getState().deleteMilestone("proj-1", "ms-1");
      const state = useWorkspaceStore.getState();
      expect(state.data!.projects[0].milestones).toHaveLength(0);
      expect(state.data!.projects[0].tasks[0].milestoneId).toBe("");
    });
  });

  describe("updateProject", () => {
    it("updates a project while preserving its slug", () => {
      useWorkspaceStore.setState({ data: makeSeedData() });
      const project = useWorkspaceStore.getState().data!.projects[0];
      useWorkspaceStore.getState().updateProject({
        ...project,
        name: "Renamed Project",
        slug: "should-not-change",
      });
      const updated = useWorkspaceStore.getState().data!.projects[0];
      expect(updated.name).toBe("Renamed Project");
      expect(updated.slug).toBe("project-1");
    });
  });

  describe("setVisibleProjects", () => {
    it("sets visible project IDs", () => {
      useWorkspaceStore.getState().setVisibleProjects(["proj-1"]);
      expect(useWorkspaceStore.getState().visibleProjectIds).toEqual([
        "proj-1",
      ]);
    });

    it("deduplicates IDs", () => {
      useWorkspaceStore.getState().setVisibleProjects(["proj-1", "proj-1"]);
      expect(useWorkspaceStore.getState().visibleProjectIds).toEqual([
        "proj-1",
      ]);
    });

    it("rejects more than 2 projects", () => {
      useWorkspaceStore.setState({ visibleProjectIds: ["proj-1"] });
      useWorkspaceStore
        .getState()
        .setVisibleProjects(["proj-1", "proj-2", "proj-3"]);
      expect(useWorkspaceStore.getState().visibleProjectIds).toEqual([
        "proj-1",
      ]);
    });
  });

  describe("bulkUpdateTasks guard", () => {
    it("does nothing when no tasks are selected", () => {
      useWorkspaceStore.setState({ data: makeSeedData(), selectedTaskIds: [] });
      useWorkspaceStore
        .getState()
        .bulkUpdateTasks("proj-1", { priority: "High" as const });
      const task = useWorkspaceStore.getState().data!.projects[0].tasks[0];
      expect(task.priority).toBe("Medium");
    });
  });
});
