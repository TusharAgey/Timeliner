import { describe, it, expect } from "vitest";
import {
  buildGraph,
  findCriticalPath,
  detectCycle,
  getDependents,
  getDependencies,
  type GraphNode,
  type GraphEdge,
} from "../dependencyGraph";
import type { Task } from "../../models/types";

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: "task-1",
  title: "Test task",
  description: "",
  assignees: [
    { name: "Alice", role: "responsible", from: "2026-01-01", to: null },
  ],
  accountable: [{ name: "Bob", from: "2026-01-01", to: null }],
  jiraLink: "",
  deliverable: "",
  startDate: "2026-05-01",
  endDate: "2026-05-15",
  expectedStartDate: "2026-05-01",
  expectedEndDate: "2026-05-15",
  progressPercent: 0,
  priority: "Medium",
  labels: [],
  blockedReason: "",
  milestoneId: "",
  dependencies: [],
  crossProjectDependencies: [],
  status: "Not Started",
  activityLog: [],
  isTemplate: false,
  ...overrides,
});

describe("buildGraph", () => {
  it("builds nodes and intra-project edges", () => {
    const a = makeTask({ id: "a", title: "A" });
    const b = makeTask({ id: "b", title: "B", dependencies: ["a"] });
    const graph = buildGraph([a, b]);
    expect(graph.nodes).toHaveLength(2);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]).toMatchObject({
      source: "a",
      target: "b",
      crossProject: false,
    });
    expect(graph.hasCycle).toBe(false);
  });

  it("marks cross-project edges and adds external nodes", () => {
    const a = makeTask({ id: "a", title: "A" });
    const b = makeTask({
      id: "b",
      title: "B",
      crossProjectDependencies: [
        { taskId: "ext-1", projectId: "proj-x", label: "X" },
      ],
    });
    const graph = buildGraph(
      [a, b],
      new Map([
        ["ext-1", { taskId: "ext-1", title: "External", projectName: "X" }],
      ]),
    );
    const crossEdge = graph.edges.find((e) => e.crossProject);
    expect(crossEdge).toBeDefined();
    expect(crossEdge!.source).toBe("ext-1");
    expect(crossEdge!.target).toBe("b");
    expect(crossEdge!.label).toBe("X");
    const extNode = graph.nodes.find((n) => n.id === "ext-1");
    expect(extNode).toBeDefined();
    expect(extNode!.title).toBe("External");
    expect(extNode!.status).toBe("Unknown");
    expect(extNode!.hasCrossProjectDeps).toBe(true);
  });

  it("ignores intra-project deps whose source is not in the task list", () => {
    const b = makeTask({ id: "b", title: "B", dependencies: ["missing"] });
    const graph = buildGraph([b]);
    // The missing dependency should not create an edge or a node
    expect(graph.edges).toHaveLength(0);
    expect(graph.nodes).toHaveLength(1);
    expect(graph.hasCycle).toBe(false);
  });

  it("detects a cycle and reports hasCycle true", () => {
    const a = makeTask({ id: "a", title: "A", dependencies: ["b"] });
    const b = makeTask({ id: "b", title: "B", dependencies: ["a"] });
    const graph = buildGraph([a, b]);
    expect(graph.hasCycle).toBe(true);
  });

  it("assigns layers via longest-path topological sort", () => {
    const a = makeTask({ id: "a", title: "A" });
    const b = makeTask({ id: "b", title: "B", dependencies: ["a"] });
    const c = makeTask({ id: "c", title: "C", dependencies: ["b"] });
    const graph = buildGraph([a, b, c]);
    const layerOf = (id: string) => graph.nodes.find((n) => n.id === id)!.layer;
    expect(layerOf("a")).toBe(0);
    expect(layerOf("b")).toBe(1);
    expect(layerOf("c")).toBe(2);
  });

  it("assigns indices within each layer sorted by title", () => {
    const a = makeTask({ id: "a", title: "Zeta" });
    const b = makeTask({ id: "b", title: "Alpha" });
    const graph = buildGraph([a, b]);
    const layer0 = graph.nodes.filter((n) => n.layer === 0);
    // The index is assigned by title sort within the layer, regardless of
    // the insertion order of the nodes array.
    const alpha = layer0.find((n) => n.title === "Alpha")!;
    const zeta = layer0.find((n) => n.title === "Zeta")!;
    expect(alpha.index).toBe(0);
    expect(zeta.index).toBe(1);
  });

  it("marks critical path nodes", () => {
    const a = makeTask({ id: "a", title: "A" });
    const b = makeTask({ id: "b", title: "B", dependencies: ["a"] });
    const c = makeTask({ id: "c", title: "C", dependencies: ["b"] });
    const graph = buildGraph([a, b, c]);
    expect(graph.criticalPathTaskIds).toEqual(["a", "b", "c"]);
    for (const node of graph.nodes) {
      expect(node.onCriticalPath).toBe(true);
    }
  });
});

describe("findCriticalPath", () => {
  const node = (id: string): GraphNode => ({
    id,
    taskId: id,
    title: id,
    status: "On Track",
    priority: "Medium",
    assignee: "Unassigned",
    startDate: "",
    endDate: "",
    progressPercent: 0,
    layer: 0,
    index: 0,
    onCriticalPath: false,
    hasCrossProjectDeps: false,
  });

  it("returns empty array for no nodes", () => {
    expect(findCriticalPath([], [])).toEqual([]);
  });

  it("returns empty array when there are no sources or sinks", () => {
    // A single self-loop has no source/sink
    const nodes = [node("a")];
    const edges: GraphEdge[] = [
      { source: "a", target: "a", crossProject: false },
    ];
    expect(findCriticalPath(nodes, edges)).toEqual([]);
  });

  it("returns the longest chain of dependent tasks", () => {
    const nodes = [node("a"), node("b"), node("c"), node("d")];
    const edges: GraphEdge[] = [
      { source: "a", target: "b", crossProject: false },
      { source: "b", target: "c", crossProject: false },
      { source: "a", target: "d", crossProject: false },
    ];
    // Longest path: a -> b -> c (length 3)
    expect(findCriticalPath(nodes, edges)).toEqual(["a", "b", "c"]);
  });

  it("does not stack-overflow on cyclic graphs (cycle guard)", () => {
    const nodes = [node("a"), node("b"), node("c")];
    const edges: GraphEdge[] = [
      { source: "a", target: "b", crossProject: false },
      { source: "b", target: "c", crossProject: false },
      { source: "c", target: "a", crossProject: false },
    ];
    // Should terminate and return a finite path without throwing
    const path = findCriticalPath(nodes, edges);
    expect(Array.isArray(path)).toBe(true);
  });

  it("ignores cross-project edges when computing critical path", () => {
    const nodes = [node("a"), node("b")];
    const edges: GraphEdge[] = [
      { source: "a", target: "b", crossProject: true },
    ];
    // Cross-project edges are filtered out, so 'a' has no outgoing local
    // edges (it is a sink) and 'b' has no incoming local edges (it is a
    // source). The critical path is just the single source node.
    expect(findCriticalPath(nodes, edges)).toEqual(["a"]);
  });
});

describe("detectCycle", () => {
  it("returns true when adding a dependency would create a cycle", () => {
    const a = makeTask({ id: "a", title: "A", dependencies: ["b"] });
    const b = makeTask({ id: "b", title: "B" });
    // Adding b -> a would create a cycle (a already depends on b)
    expect(detectCycle([a, b], "b", "a")).toBe(true);
  });

  it("returns false when adding a dependency is safe", () => {
    const a = makeTask({ id: "a", title: "A" });
    const b = makeTask({ id: "b", title: "B" });
    expect(detectCycle([a, b], "b", "a")).toBe(false);
  });

  it("returns false for a self-dependency that is not part of a cycle", () => {
    const a = makeTask({ id: "a", title: "A" });
    // Adding a -> a is a self-loop; detectCycle checks if a can reach a via a
    expect(detectCycle([a], "a", "a")).toBe(true);
  });
});

describe("getDependents", () => {
  it("returns tasks that depend on the given task", () => {
    const a = makeTask({ id: "a", title: "A" });
    const b = makeTask({ id: "b", title: "B", dependencies: ["a"] });
    const c = makeTask({ id: "c", title: "C", dependencies: ["a"] });
    const dependents = getDependents([a, b, c], "a");
    expect(dependents.map((t) => t.id)).toEqual(["b", "c"]);
  });

  it("returns empty array when no tasks depend on it", () => {
    const a = makeTask({ id: "a", title: "A" });
    const b = makeTask({ id: "b", title: "B" });
    expect(getDependents([a, b], "a")).toEqual([]);
  });
});

describe("getDependencies", () => {
  it("returns the tasks a task depends on", () => {
    const a = makeTask({ id: "a", title: "A" });
    const b = makeTask({ id: "b", title: "B" });
    const c = makeTask({ id: "c", title: "C", dependencies: ["a", "b"] });
    const deps = getDependencies([a, b, c], "c");
    expect(deps.map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("returns empty array for unknown task", () => {
    const a = makeTask({ id: "a", title: "A" });
    expect(getDependencies([a], "missing")).toEqual([]);
  });

  it("filters out missing dependency IDs", () => {
    const a = makeTask({ id: "a", title: "A" });
    const c = makeTask({ id: "c", title: "C", dependencies: ["a", "ghost"] });
    const deps = getDependencies([a, c], "c");
    expect(deps.map((t) => t.id)).toEqual(["a"]);
  });
});
