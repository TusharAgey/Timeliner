import { describe, it, expect, beforeEach, vi } from "vitest";
import { useWorkspaceStore } from "../useWorkspaceStore";
import type { Task, WorkspaceData } from "../../models/types";

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
      const createElement = vi
        .spyOn(document, "createElement")
        .mockReturnValue({
          href: "",
          download: "",
          click,
        } as unknown as HTMLAnchorElement);

      useWorkspaceStore.getState().exportWorkspace();

      expect(createElement).toHaveBeenCalledWith("a");
      expect(click).toHaveBeenCalled();

      createObjectURL.mockRestore();
      createElement.mockRestore();
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
});
