import { useMemo, useState, useCallback } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { buildGraph, type GraphNode } from "../../lib/dependencyGraph";
import type { Project } from "../../models/types";

type DependencyGraphViewProps = {
  projects: Project[];
  onClose: () => void;
};

const NODE_WIDTH = 180;
const NODE_HEIGHT = 64;
const LAYER_GAP = 80;
const NODE_GAP = 24;
const PADDING = 40;

const statusColors: Record<string, string> = {
  Overdue:
    "border-rose-400/40 bg-rose-500/10 shadow-[0_0_16px_rgba(244,63,94,0.08)]",
  Delayed:
    "border-amber-400/40 bg-amber-500/10 shadow-[0_0_16px_rgba(251,146,60,0.08)]",
  "At Risk":
    "border-amber-400/40 bg-amber-500/10 shadow-[0_0_16px_rgba(251,146,60,0.08)]",
  Done: "border-emerald-400/40 bg-emerald-500/10 shadow-[0_0_16px_rgba(52,211,153,0.08)]",
  Ahead:
    "border-cyan-400/40 bg-cyan-500/10 shadow-[0_0_16px_rgba(34,211,238,0.08)]",
  "On Track":
    "border-violet-400/40 bg-violet-500/10 shadow-[0_0_16px_rgba(139,92,246,0.08)]",
  "Not Started":
    "border-slate-400/30 bg-slate-500/8 shadow-[0_0_16px_rgba(148,163,184,0.04)]",
  Unknown: "border-slate-400/20 bg-slate-500/5",
};

const statusDotColors: Record<string, string> = {
  Overdue: "bg-rose-400",
  Delayed: "bg-amber-400",
  "At Risk": "bg-amber-400",
  Done: "bg-emerald-400",
  Ahead: "bg-cyan-400",
  "On Track": "bg-violet-400",
  "Not Started": "bg-slate-400",
  Unknown: "bg-slate-500",
};

const priorityColors: Record<string, string> = {
  Critical: "bg-rose-500",
  High: "bg-amber-500",
  Medium: "bg-blue-500",
  Low: "bg-slate-500",
};

export const DependencyGraphView = ({
  projects,
  onClose,
}: DependencyGraphViewProps) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(
    null,
  );
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const allTasks = useMemo(() => projects.flatMap((p) => p.tasks), [projects]);

  const graph = useMemo(() => buildGraph(allTasks), [allTasks]);

  // Compute layout positions
  const layout = useMemo(() => {
    if (graph.nodes.length === 0)
      return {
        width: 0,
        height: 0,
        nodePositions: new Map<string, { x: number; y: number }>(),
      };

    // Group nodes by layer
    const layerMap = new Map<number, GraphNode[]>();
    for (const node of graph.nodes) {
      const layer = layerMap.get(node.layer) ?? [];
      layer.push(node);
      layerMap.set(node.layer, layer);
    }

    const sortedLayers = Array.from(layerMap.entries()).sort(
      (a, b) => a[0] - b[0],
    );

    const nodePositions = new Map<string, { x: number; y: number }>();
    let maxWidth = 0;

    for (const [, layerNodes] of sortedLayers) {
      const layerWidth =
        layerNodes.length * NODE_WIDTH + (layerNodes.length - 1) * NODE_GAP;
      if (layerWidth > maxWidth) maxWidth = layerWidth;

      const startX = -layerWidth / 2 + NODE_WIDTH / 2;
      layerNodes.forEach((node, i) => {
        nodePositions.set(node.id, {
          x: startX + i * (NODE_WIDTH + NODE_GAP),
          y: node.layer * (NODE_HEIGHT + LAYER_GAP),
        });
      });
    }

    const height =
      sortedLayers.length > 0
        ? sortedLayers[sortedLayers.length - 1][0] * (NODE_HEIGHT + LAYER_GAP) +
          NODE_HEIGHT +
          PADDING * 2
        : 0;

    return {
      width: maxWidth + PADDING * 2,
      height,
      nodePositions,
    };
  }, [graph.nodes]);

  // Build edge paths
  const edgePaths = useMemo(() => {
    const paths: {
      path: string;
      crossProject: boolean;
      label?: string;
      source: string;
      target: string;
    }[] = [];

    for (const edge of graph.edges) {
      const sourcePos = layout.nodePositions.get(edge.source);
      const targetPos = layout.nodePositions.get(edge.target);
      if (!sourcePos || !targetPos) continue;

      const x1 = sourcePos.x + NODE_WIDTH / 2;
      const y1 = sourcePos.y + NODE_HEIGHT;
      const x2 = targetPos.x + NODE_WIDTH / 2;
      const y2 = targetPos.y;

      // Curved path
      const midY = (y1 + y2) / 2;
      const path = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

      paths.push({
        path,
        crossProject: edge.crossProject,
        label: edge.label,
        source: edge.source,
        target: edge.target,
      });
    }

    return paths;
  }, [graph.edges, layout.nodePositions]);

  // Get connected node IDs (for highlighting)
  const getConnectedNodes = useCallback(
    (nodeId: string): Set<string> => {
      const connected = new Set<string>();
      connected.add(nodeId);
      for (const edge of graph.edges) {
        if (edge.source === nodeId) connected.add(edge.target);
        if (edge.target === nodeId) connected.add(edge.source);
      }
      return connected;
    },
    [graph.edges],
  );

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((z) => Math.max(0.3, Math.min(3, z + delta)));
    }
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only pan on background click (not on nodes)
      if ((e.target as HTMLElement).closest("[data-node-id]")) return;
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    },
    [pan],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    },
    [isDragging, dragStart],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedNodeId(null);
    setHighlightedNodeId(null);
  }, []);

  const totalTasks = allTasks.length;
  const tasksWithDeps = allTasks.filter(
    (t) => t.dependencies.length > 0 || t.crossProjectDependencies.length > 0,
  ).length;

  return (
    <div className="rounded-[24px] bg-white/[0.035] p-6 ring-1 ring-white/8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-white">
            Dependency graph
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Visual map of task dependencies across{" "}
            {projects.length === 1
              ? projects[0].name
              : `${projects.length} projects`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Stats */}
          <div className="mr-4 flex items-center gap-3 text-xs text-slate-500">
            <span>
              <span className="font-medium text-slate-300">
                {graph.nodes.length}
              </span>{" "}
              nodes
            </span>
            <span>
              <span className="font-medium text-slate-300">
                {graph.edges.length}
              </span>{" "}
              edges
            </span>
            <span>
              <span className="font-medium text-slate-300">
                {tasksWithDeps}
              </span>
              /{totalTasks} with deps
            </span>
            {graph.criticalPathTaskIds.length > 0 && (
              <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[11px] font-medium text-cyan-300 ring-1 ring-cyan-400/20">
                Critical path: {graph.criticalPathTaskIds.length} tasks
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            onClick={resetView}
            className="rounded-full p-2"
            aria-label="Reset view"
          >
            <RotateCcw className="size-4" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))}
            className="rounded-full p-2"
            aria-label="Zoom out"
          >
            <ZoomOut className="size-4" />
          </Button>
          <span className="min-w-[3ch] text-center text-xs text-slate-500">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
            className="rounded-full p-2"
            aria-label="Zoom in"
          >
            <ZoomIn className="size-4" />
          </Button>
          <Button variant="secondary" onClick={onClose} className="px-4">
            ← Back to timeline
          </Button>
          <Button
            variant="ghost"
            onClick={onClose}
            className="rounded-full p-2"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {graph.nodes.length === 0 ? (
        <div className="flex min-h-[300px] items-center justify-center rounded-2xl bg-black/18 ring-1 ring-white/6">
          <p className="text-sm text-slate-500">
            No tasks with dependencies found. Add dependencies to tasks to see
            them here.
          </p>
        </div>
      ) : (
        <div
          className="relative overflow-hidden rounded-2xl bg-black/18 ring-1 ring-white/6"
          style={{ height: Math.max(400, layout.height + 80) }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <svg
            className="absolute inset-0"
            style={{ cursor: isDragging ? "grabbing" : "grab" }}
          >
            <g
              transform={`translate(${layout.width / 2 + pan.x}, ${PADDING + pan.y}) scale(${zoom})`}
            >
              {/* Edge arrows (arrowhead markers) */}
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="8"
                  markerHeight="6"
                  refX="8"
                  refY="3"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 8 3, 0 6"
                    fill="rgba(148,163,184,0.4)"
                  />
                </marker>
                <marker
                  id="arrowhead-critical"
                  markerWidth="8"
                  markerHeight="6"
                  refX="8"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3, 0 6" fill="rgba(34,211,238,0.7)" />
                </marker>
                <marker
                  id="arrowhead-cross"
                  markerWidth="8"
                  markerHeight="6"
                  refX="8"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3, 0 6" fill="rgba(251,146,60,0.5)" />
                </marker>
                <marker
                  id="arrowhead-highlighted"
                  markerWidth="8"
                  markerHeight="6"
                  refX="8"
                  refY="3"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 8 3, 0 6"
                    fill="rgba(255,255,255,0.6)"
                  />
                </marker>
              </defs>

              {/* Edges */}
              {edgePaths.map((edge, i) => {
                const isHighlighted =
                  highlightedNodeId &&
                  (edge.source === highlightedNodeId ||
                    edge.target === highlightedNodeId);
                const isCritical =
                  !edge.crossProject &&
                  graph.criticalPathTaskIds.includes(edge.source) &&
                  graph.criticalPathTaskIds.includes(edge.target);

                let strokeColor = "rgba(148,163,184,0.25)";
                let strokeWidth = 1.5;
                let markerEnd = "url(#arrowhead)";
                let strokeDasharray = "";

                if (edge.crossProject) {
                  strokeColor = "rgba(251,146,60,0.4)";
                  strokeDasharray = "6,4";
                  markerEnd = "url(#arrowhead-cross)";
                }
                if (isCritical) {
                  strokeColor = "rgba(34,211,238,0.6)";
                  strokeWidth = 2.5;
                  markerEnd = "url(#arrowhead-critical)";
                }
                if (isHighlighted) {
                  strokeColor = "rgba(255,255,255,0.5)";
                  strokeWidth = 2;
                  markerEnd = "url(#arrowhead-highlighted)";
                }

                return (
                  <g key={i}>
                    <path
                      d={edge.path}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={strokeDasharray}
                      markerEnd={markerEnd}
                      className="transition-all duration-200"
                    />
                    {edge.label && (
                      <text
                        x={
                          (layout.nodePositions.get(edge.source)!.x +
                            NODE_WIDTH / 2 +
                            layout.nodePositions.get(edge.target)!.x +
                            NODE_WIDTH / 2) /
                          2
                        }
                        y={
                          (layout.nodePositions.get(edge.source)!.y +
                            NODE_HEIGHT +
                            layout.nodePositions.get(edge.target)!.y) /
                          2
                        }
                        textAnchor="middle"
                        className="fill-amber-400/60 text-[9px]"
                      >
                        {edge.label}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Nodes */}
              {graph.nodes.map((node) => {
                const pos = layout.nodePositions.get(node.id);
                if (!pos) return null;

                const isSelected = selectedNodeId === node.id;
                const isHighlighted =
                  highlightedNodeId &&
                  getConnectedNodes(highlightedNodeId).has(node.id);
                const isDimmed = highlightedNodeId && !isHighlighted;
                const isCritical = node.onCriticalPath;

                const statusClass =
                  statusColors[node.status] ?? statusColors.Unknown;
                const dotColor =
                  statusDotColors[node.status] ?? statusDotColors.Unknown;
                const priorityColor =
                  priorityColors[node.priority] ?? priorityColors.Medium;

                return (
                  <g
                    key={node.id}
                    data-node-id={node.id}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedNodeId(isSelected ? null : node.id);
                      setHighlightedNodeId(
                        highlightedNodeId === node.id ? null : node.id,
                      );
                    }}
                    style={{
                      opacity: isDimmed ? 0.3 : 1,
                      transition: "opacity 0.2s",
                    }}
                  >
                    {/* Node background */}
                    <rect
                      x={pos.x}
                      y={pos.y}
                      width={NODE_WIDTH}
                      height={NODE_HEIGHT}
                      rx={12}
                      className={`fill-[#0d1726] stroke-1 ${
                        isSelected
                          ? "stroke-white/40"
                          : isCritical
                            ? "stroke-cyan-400/50"
                            : statusClass
                      }`}
                      style={{
                        strokeWidth: isSelected || isCritical ? 2 : 1,
                        filter: isSelected
                          ? "drop-shadow(0 0 12px rgba(255,255,255,0.1))"
                          : isCritical
                            ? "drop-shadow(0 0 8px rgba(34,211,238,0.15))"
                            : "none",
                      }}
                    />

                    {/* Priority dot */}
                    <circle
                      cx={pos.x + 10}
                      cy={pos.y + 12}
                      r={4}
                      className={priorityColor}
                    />

                    {/* Status dot */}
                    <circle
                      cx={pos.x + NODE_WIDTH - 10}
                      cy={pos.y + 12}
                      r={4}
                      className={dotColor}
                    />

                    {/* Critical path indicator */}
                    {isCritical && (
                      <text
                        x={pos.x + NODE_WIDTH / 2}
                        y={pos.y + 10}
                        textAnchor="middle"
                        className="fill-cyan-400/70 text-[7px] font-medium uppercase tracking-wider"
                      >
                        Critical
                      </text>
                    )}

                    {/* Title */}
                    <text
                      x={pos.x + NODE_WIDTH / 2}
                      y={pos.y + 30}
                      textAnchor="middle"
                      className="fill-white text-[11px] font-medium"
                      style={{
                        pointerEvents: "none",
                        maxWidth: NODE_WIDTH - 16,
                      }}
                    >
                      {node.title.length > 22
                        ? node.title.slice(0, 21) + "…"
                        : node.title}
                    </text>

                    {/* Assignee */}
                    <text
                      x={pos.x + NODE_WIDTH / 2}
                      y={pos.y + 46}
                      textAnchor="middle"
                      className="fill-slate-500 text-[9px]"
                      style={{ pointerEvents: "none" }}
                    >
                      {node.assignee}
                    </text>

                    {/* Cross-project indicator */}
                    {node.hasCrossProjectDeps && (
                      <text
                        x={pos.x + NODE_WIDTH - 6}
                        y={pos.y + NODE_HEIGHT - 4}
                        textAnchor="end"
                        className="fill-amber-400/50 text-[8px]"
                        style={{ pointerEvents: "none" }}
                      >
                        ↕
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Legend */}
          <div className="absolute bottom-3 left-3 rounded-xl bg-black/60 px-3 py-2 text-[10px] text-slate-400 ring-1 ring-white/6 backdrop-blur-sm">
            <div className="mb-1 font-medium text-slate-300">Legend</div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <div className="h-px w-4 bg-slate-400/40" />
                <span>Dependency</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-px w-4 border-t-2 border-dashed border-amber-400/40" />
                <span>Cross-project</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="h-px w-4 bg-cyan-400/60"
                  style={{ height: 2 }}
                />
                <span>Critical path</span>
              </div>
            </div>
          </div>

          {/* Selected node info */}
          {selectedNodeId &&
            (() => {
              const node = graph.nodes.find((n) => n.id === selectedNodeId);
              if (!node) return null;
              const task = allTasks.find((t) => t.id === selectedNodeId);
              return (
                <div className="absolute right-3 top-3 max-w-64 rounded-xl bg-black/70 px-3 py-2.5 text-xs text-slate-300 ring-1 ring-white/6 backdrop-blur-sm">
                  <div className="mb-1 font-medium text-white">
                    {node.title}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
                    <span>
                      Status:{" "}
                      <span className="text-slate-300">{node.status}</span>
                    </span>
                    <span>
                      Priority:{" "}
                      <span className="text-slate-300">{node.priority}</span>
                    </span>
                    <span>
                      Assignee:{" "}
                      <span className="text-slate-300">{node.assignee}</span>
                    </span>
                    {task && (
                      <>
                        <span>
                          Progress:{" "}
                          <span className="text-slate-300">
                            {task.progressPercent}%
                          </span>
                        </span>
                        <span>
                          Dates:{" "}
                          <span className="text-slate-300">
                            {task.startDate} → {task.endDate}
                          </span>
                        </span>
                      </>
                    )}
                    <span>
                      Dependencies:{" "}
                      <span className="text-slate-300">
                        {graph.edges.filter((e) => e.target === node.id).length}
                      </span>
                    </span>
                    <span>
                      Dependents:{" "}
                      <span className="text-slate-300">
                        {graph.edges.filter((e) => e.source === node.id).length}
                      </span>
                    </span>
                  </div>
                </div>
              );
            })()}
        </div>
      )}
    </div>
  );
};
