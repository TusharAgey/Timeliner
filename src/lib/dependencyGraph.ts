import type { Task } from "../models/types";
import { computeTaskStatus } from "./status";

export type GraphNode = {
  id: string;
  taskId: string;
  title: string;
  status: string;
  priority: string;
  assignee: string;
  startDate: string;
  endDate: string;
  progressPercent: number;
  /** Layered position computed by layout algorithm */
  layer: number;
  /** Index within the layer */
  index: number;
  /** Whether this node is part of the critical path */
  onCriticalPath: boolean;
  /** Whether this node has cross-project dependencies */
  hasCrossProjectDeps: boolean;
};

export type GraphEdge = {
  source: string;
  target: string;
  /** True if this is a cross-project dependency */
  crossProject: boolean;
  label?: string;
};

export type DependencyGraph = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  criticalPathTaskIds: string[];
  hasCycle: boolean;
};

/**
 * Build a dependency graph from a list of tasks.
 * Resolves intra-project dependencies (task.dependencies) and
 * cross-project dependencies (task.crossProjectDependencies).
 */
export function buildGraph(
  tasks: Task[],
  crossProjectTasks?: Map<
    string,
    { taskId: string; title: string; projectName: string }
  >,
): DependencyGraph {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const edges: GraphEdge[] = [];
  const nodeSet = new Set<string>();

  // Collect all task IDs that appear as dependencies
  for (const task of tasks) {
    nodeSet.add(task.id);
    for (const depId of task.dependencies) {
      if (taskMap.has(depId) || tasks.some((t) => t.id === depId)) {
        edges.push({ source: depId, target: task.id, crossProject: false });
        nodeSet.add(depId);
      }
    }
    for (const crossDep of task.crossProjectDependencies) {
      edges.push({
        source: crossDep.taskId,
        target: task.id,
        crossProject: true,
        label: crossDep.label || `[${crossDep.projectId}]`,
      });
      nodeSet.add(crossDep.taskId);
    }
  }

  // Build nodes
  const nodes: GraphNode[] = [];
  for (const taskId of nodeSet) {
    const task = taskMap.get(taskId);
    if (task) {
      const status = computeTaskStatus(task);
      nodes.push({
        id: taskId,
        taskId,
        title: task.title,
        status,
        priority: task.priority,
        assignee: task.assignees[0]?.name ?? "Unassigned",
        startDate: task.startDate,
        endDate: task.endDate,
        progressPercent: task.progressPercent,
        layer: 0,
        index: 0,
        onCriticalPath: false,
        hasCrossProjectDeps: task.crossProjectDependencies.length > 0,
      });
    } else if (crossProjectTasks?.has(taskId)) {
      const info = crossProjectTasks.get(taskId)!;
      nodes.push({
        id: taskId,
        taskId,
        title: info.title,
        status: "Unknown",
        priority: "Medium",
        assignee: "—",
        startDate: "",
        endDate: "",
        progressPercent: 0,
        layer: 0,
        index: 0,
        onCriticalPath: false,
        hasCrossProjectDeps: true,
      });
    }
  }

  // Compute layers using topological sort
  computeLayers(nodes, edges);

  // Compute critical path
  const criticalPathTaskIds = findCriticalPath(nodes, edges);

  // Mark critical path nodes
  for (const node of nodes) {
    if (criticalPathTaskIds.includes(node.taskId)) {
      node.onCriticalPath = true;
    }
  }

  return {
    nodes,
    edges,
    criticalPathTaskIds,
    hasCycle: false,
  };
}

/**
 * Assign layers to nodes using a simple longest-path layering algorithm.
 * Nodes with no incoming edges go to layer 0.
 * Each node's layer = max(layer of predecessors) + 1.
 */
function computeLayers(nodes: GraphNode[], edges: GraphEdge[]): void {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  for (const edge of edges) {
    if (edge.crossProject) continue; // Skip cross-project edges for layout
    const targets = adjacency.get(edge.source) ?? [];
    targets.push(edge.target);
    adjacency.set(edge.source, targets);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  // Kahn's algorithm for topological layering
  const queue: string[] = [];
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id);
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const visited = new Set<string>();
  while (queue.length > 0) {
    const current = queue.shift()!;
    visited.add(current);
    const node = nodeMap.get(current);
    if (node) {
      // Compute layer as max predecessor layer + 1
      let maxPredLayer = -1;
      for (const edge of edges) {
        if (edge.target === current && !edge.crossProject) {
          const pred = nodeMap.get(edge.source);
          if (pred && pred.layer > maxPredLayer) {
            maxPredLayer = pred.layer;
          }
        }
      }
      node.layer = maxPredLayer + 1;
    }

    for (const neighbor of adjacency.get(current) ?? []) {
      const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  // Handle unvisited nodes (cycles or disconnected)
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      node.layer = 0;
    }
  }

  // Assign indices within each layer
  const layerMap = new Map<number, GraphNode[]>();
  for (const node of nodes) {
    const layer = layerMap.get(node.layer) ?? [];
    layer.push(node);
    layerMap.set(node.layer, layer);
  }
  for (const [, layerNodes] of layerMap) {
    layerNodes.sort((a, b) => a.title.localeCompare(b.title));
    layerNodes.forEach((node, i) => {
      node.index = i;
    });
  }
}

/**
 * Find the critical path — the longest chain of dependent tasks.
 * Returns an array of task IDs on the critical path.
 */
export function findCriticalPath(
  nodes: GraphNode[],
  edges: GraphEdge[],
): string[] {
  if (nodes.length === 0) return [];

  const localEdges = edges.filter((e) => !e.crossProject);

  // Build adjacency list (source -> targets)
  const forward = new Map<string, string[]>();
  // Build reverse adjacency (target -> sources)
  const reverse = new Map<string, string[]>();

  for (const node of nodes) {
    forward.set(node.id, []);
    reverse.set(node.id, []);
  }

  for (const edge of localEdges) {
    forward.get(edge.source)?.push(edge.target);
    reverse.get(edge.target)?.push(edge.source);
  }

  // Find all source nodes (no incoming edges)
  const sources = nodes.filter((n) => (reverse.get(n.id)?.length ?? 0) === 0);

  // Find all sink nodes (no outgoing edges)
  const sinks = nodes.filter((n) => (forward.get(n.id)?.length ?? 0) === 0);

  if (sources.length === 0 || sinks.length === 0) return [];

  // DP: longest path from each node to a sink
  const memo = new Map<string, { length: number; next: string | null }>();

  function dfs(nodeId: string): { length: number; next: string | null } {
    if (memo.has(nodeId)) return memo.get(nodeId)!;
    const neighbors = forward.get(nodeId) ?? [];
    if (neighbors.length === 0) {
      const result = { length: 1, next: null };
      memo.set(nodeId, result);
      return result;
    }
    let best = { length: 0, next: null as string | null };
    for (const neighbor of neighbors) {
      const sub = dfs(neighbor);
      if (sub.length + 1 > best.length) {
        best = { length: sub.length + 1, next: neighbor };
      }
    }
    memo.set(nodeId, best);
    return best;
  }

  // Find the source with the longest path
  let bestSource = sources[0]?.id ?? "";
  let bestLength = 0;
  for (const source of sources) {
    const result = dfs(source.id);
    if (result.length > bestLength) {
      bestLength = result.length;
      bestSource = source.id;
    }
  }

  // Trace the path
  const path: string[] = [];
  let current: string | null = bestSource;
  while (current) {
    path.push(current);
    const result = memo.get(current);
    current = result?.next ?? null;
  }

  return path;
}

/**
 * Detect if adding a dependency (taskId -> depId) would create a cycle.
 * i.e. if taskId depends on depId, check if there's already a path from depId back to taskId.
 *
 * @param tasks - All tasks (with their current dependency lists)
 * @param taskId - The task that would gain a new dependency
 * @param depId - The task that would become a dependency of taskId
 * @returns true if adding the dependency would create a cycle
 */
export function detectCycle(
  tasks: Task[],
  taskId: string,
  depId: string,
): boolean {
  // Build adjacency list from existing dependencies
  // adj.get(X) returns the tasks that X depends on
  const adj = new Map<string, string[]>();
  for (const task of tasks) {
    adj.set(task.id, [...task.dependencies]);
  }

  // Add the proposed edge: taskId depends on depId
  const existing = adj.get(taskId) ?? [];
  adj.set(taskId, [...existing, depId]);

  // DFS from depId to see if we can reach taskId
  // If we can, adding taskId -> depId would create a cycle
  const visited = new Set<string>();
  const stack = [depId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === taskId) return true; // Cycle detected
    if (visited.has(current)) continue;
    visited.add(current);
    for (const neighbor of adj.get(current) ?? []) {
      if (!visited.has(neighbor)) {
        stack.push(neighbor);
      }
    }
  }

  return false;
}

/**
 * Get all tasks that depend on a given task (direct dependents).
 */
export function getDependents(tasks: Task[], taskId: string): Task[] {
  return tasks.filter((t) => t.dependencies.includes(taskId));
}

/**
 * Get all tasks that a given task depends on (direct dependencies).
 */
export function getDependencies(tasks: Task[], taskId: string): Task[] {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return [];
  return task.dependencies
    .map((depId) => tasks.find((t) => t.id === depId))
    .filter(Boolean) as Task[];
}
