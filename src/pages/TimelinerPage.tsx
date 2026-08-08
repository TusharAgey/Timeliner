import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";

import BarChart3 from "lucide-react/dist/esm/icons/bar-chart-3";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import FolderOpen from "lucide-react/dist/esm/icons/folder-open";
import MoreHorizontal from "lucide-react/dist/esm/icons/more-horizontal";
import Users from "lucide-react/dist/esm/icons/users";
import Plus from "lucide-react/dist/esm/icons/plus";
import Save from "lucide-react/dist/esm/icons/save";
import Search from "lucide-react/dist/esm/icons/search";
import Undo2 from "lucide-react/dist/esm/icons/undo-2";
import Redo2 from "lucide-react/dist/esm/icons/redo-2";
import LayoutGrid from "lucide-react/dist/esm/icons/layout-grid";
import GitBranch from "lucide-react/dist/esm/icons/git-branch";
import Download from "lucide-react/dist/esm/icons/download";
import ClipboardList from "lucide-react/dist/esm/icons/clipboard-list";
import SearchX from "lucide-react/dist/esm/icons/search-x";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2";
import Flag from "lucide-react/dist/esm/icons/flag";
import Settings from "lucide-react/dist/esm/icons/settings";

import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { EmptyState } from "../components/ui/EmptyState";
import { TaskCardSkeleton } from "../features/timeline/TaskCardSkeleton";

import { matchesProjectSearch } from "../lib/search";
import { useWorkspaceStore } from "../store/useWorkspaceStore";
import { WorkspaceLauncher } from "../features/workspace/WorkspaceLauncher";
import { TimelineView } from "../features/timeline/TimelineView";
import { SummaryChips } from "../features/timeline/SummaryChips";
import { ZoomControls } from "../features/timeline/ZoomControls";
import { aggregateVisibleSummary } from "../lib/summary";
import { computeTaskStatus } from "../lib/status";

// Lazy-loaded heavy components
const SummaryModal = lazy(() =>
  import("../features/tasks/SummaryModal").then((m) => ({
    default: m.SummaryModal,
  })),
);
const TeamModal = lazy(() =>
  import("../features/workspace/TeamModal").then((m) => ({
    default: m.TeamModal,
  })),
);
const WorkloadView = lazy(() =>
  import("../features/workspace/WorkloadView").then((m) => ({
    default: m.WorkloadView,
  })),
);
const GanttView = lazy(() =>
  import("../features/timeline/GanttView").then((m) => ({
    default: m.GanttView,
  })),
);
const ExportImportModal = lazy(() =>
  import("../features/workspace/ExportImportModal").then((m) => ({
    default: m.ExportImportModal,
  })),
);
const TemplatesModal = lazy(() =>
  import("../features/tasks/TemplatesModal").then((m) => ({
    default: m.TemplatesModal,
  })),
);
const MilestoneModal = lazy(() =>
  import("../features/tasks/MilestoneModal").then((m) => ({
    default: m.MilestoneModal,
  })),
);
const DependencyGraphView = lazy(() =>
  import("../features/tasks/DependencyGraphView").then((m) => ({
    default: m.DependencyGraphView,
  })),
);
const AddTaskModal = lazy(() =>
  import("../features/tasks/AddTaskModal").then((m) => ({
    default: m.AddTaskModal,
  })),
);
const ManageProjectsModal = lazy(() =>
  import("../features/workspace/ManageProjectsModal").then((m) => ({
    default: m.ManageProjectsModal,
  })),
);

import type {
  PriorityFilter,
  TimelineFilter,
} from "../features/timeline/timelineTypes";

const saveLabel: Record<string, string> = {
  idle: "Idle",
  saving: "Saving…",
  saved: "Saved",
  error: "Save error",
};

const priorityFilterOptions: {
  value: PriorityFilter;
  label: string;
  color: string;
}[] = [
  { value: "all", label: "All", color: "" },
  { value: "Critical", label: "Critical", color: "bg-rose-500" },
  { value: "High", label: "High", color: "bg-amber-500" },
  { value: "Medium", label: "Medium", color: "bg-blue-500" },
  { value: "Low", label: "Low", color: "bg-slate-500" },
];

export const TimelinerPage = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(
    new Set(),
  );
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const menuRef = useRef<HTMLDivElement | null>(null);

  const {
    data,
    loading,
    error,
    fsSupported,
    createWorkspace,
    openWorkspace,
    saveNow,
    saveState,
    searchQuery,
    setSearchQuery,
    summaryOpen,
    setSummaryOpen,
    addTaskOpen,
    setAddTaskOpen,
    teamOpen,
    setTeamOpen,
    upsertPerson,
    deletePerson,
    recentlyDeletedTask,
    undoDeleteTask,
    clearRecentlyDeletedTask,
    createTaskFromNaturalLanguage,
    upsertTask,
    deleteTask,
    zoom,
    setZoom,
    timelineFilter,
    setTimelineFilter,
    selectedTaskIds,
    clearTaskSelection,
    undoStack,
    redoStack,
    undo,
    redo,
    workloadViewOpen,
    setWorkloadViewOpen,
    ganttViewOpen,
    setGanttViewOpen,
    dependencyGraphOpen,
    setDependencyGraphOpen,
    exportImportOpen,
    setExportImportOpen,
    exportWorkspace,
    importWorkspace,
    templates,
    saveTemplate,
    deleteTemplate,
    instantiateTemplate,
    milestoneModalOpen,
    setMilestoneModalOpen,
    upsertMilestone,
    deleteMilestone,
    visibleProjectIds,
    setVisibleProjects,
    createProject,
    updateProject,
    deleteProject,
    manageProjectsOpen,
    setManageProjectsOpen,
  } = useWorkspaceStore();

  useEffect(() => {
    if (!recentlyDeletedTask) return undefined;
    const timeout = window.setTimeout(() => clearRecentlyDeletedTask(), 8000);
    return () => window.clearTimeout(timeout);
  }, [recentlyDeletedTask, clearRecentlyDeletedTask]);

  // Close the header menu on outside click or Escape
  useEffect(() => {
    if (!menuOpen) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const visibleProjects = useMemo(() => {
    const current = visibleProjectIds
      .map((id) => data?.projects.find((p) => p.id === id))
      .filter(Boolean) as typeof data.projects;
    return current.map((project) =>
      matchesProjectSearch(
        project as Parameters<typeof matchesProjectSearch>[0],
        searchQuery,
      ),
    );
  }, [data, visibleProjectIds, searchQuery]);

  const insight = aggregateVisibleSummary(visibleProjects);
  const summaryChips = [
    {
      label: "Overdue",
      value: String(insight.overdue),
      tone: insight.overdue ? ("danger" as const) : ("default" as const),
      filter: "overdue",
    },
    {
      label: "At Risk",
      value: String(insight.atRisk),
      tone: insight.atRisk ? ("warning" as const) : ("default" as const),
      filter: "atRisk",
    },
    {
      label: "Starts Today",
      value: String(insight.startsToday),
      tone: insight.startsToday ? ("accent" as const) : ("default" as const),
      filter: "startsToday",
    },
    {
      label: "Next Milestone",
      value: insight.nextMilestoneLabel,
      tone: "default" as const,
    },
  ];

  if (loading && !data) {
    return (
      <div className="min-h-screen px-5 py-5 lg:px-8 lg:py-6">
        <div className="mx-auto max-w-[1600px] rounded-[34px] bg-[rgba(8,17,29,0.72)] p-6 ring-1 ring-white/8 backdrop-blur-xl">
          <div className="mb-8 h-8 w-48 animate-pulse rounded-md bg-white/8" />
          <div className="grid grid-cols-2 gap-8">
            {[1, 2, 3, 4].map((i) => (
              <TaskCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <WorkspaceLauncher
        onCreate={createWorkspace}
        onOpen={openWorkspace}
        disabled={loading}
        fsSupported={fsSupported}
        error={error}
      />
    );
  }

  return (
    <div className="min-h-screen px-5 py-5 lg:px-8 lg:py-6">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-[1600px] flex-col rounded-[34px] bg-[rgba(8,17,29,0.72)] shadow-[0_24px_80px_rgba(2,8,23,0.45)] ring-1 ring-white/8 backdrop-blur-xl">
        <header className="grid gap-3 px-6 py-3.5 lg:grid-cols-[1fr_minmax(240px,360px)_1fr] lg:items-center">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.28em] text-slate-500">
              Timeliner
            </div>
            <div className="mt-1 flex items-baseline gap-3">
              <h1 className="text-xl font-semibold tracking-tight text-white">
                {data.workspace.name}
              </h1>
              <span className="text-sm text-slate-500">Workspace</span>
            </div>
          </div>
          <div className="relative min-w-0 lg:max-w-[360px] lg:justify-self-center lg:w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              className="pl-10 text-center lg:text-left"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search tasks, people, Jira, labels, status"
              aria-label="Search tasks"
            />
          </div>
          <div className="flex items-center justify-start gap-2 lg:justify-end">
            {/* Undo/Redo */}
            <Button
              variant="ghost"
              onClick={undo}
              disabled={undoStack.length === 0}
              className="rounded-full p-2"
              aria-label="Undo last action"
            >
              <Undo2 className="size-4" />
            </Button>
            <Button
              variant="ghost"
              onClick={redo}
              disabled={redoStack.length === 0}
              className="rounded-full p-2"
              aria-label="Redo last undone action"
            >
              <Redo2 className="size-4" />
            </Button>

            <Button
              variant="secondary"
              onClick={() => setSummaryOpen(true)}
              className="px-5"
            >
              <BarChart3 className="size-4" />
              Summary
            </Button>
            <Button onClick={() => setAddTaskOpen(true)} className="px-5">
              <Plus className="size-4" />
              Add Task
            </Button>
            <div ref={menuRef} className="relative">
              <Button
                variant="secondary"
                className="rounded-full px-3"
                onClick={() => setMenuOpen((value) => !value)}
                aria-label="Open menu"
                aria-expanded={menuOpen}
                aria-haspopup="true"
              >
                <MoreHorizontal className="size-4" />
              </Button>
              {menuOpen ? (
                <div
                  className="absolute right-0 top-12 z-30 min-w-52 rounded-2xl bg-[#0d1726] p-2 shadow-2xl ring-1 ring-white/10"
                  role="menu"
                  aria-label="Workspace actions"
                >
                  <button
                    role="menuitem"
                    onClick={() => {
                      openWorkspace();
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 transition hover:bg-white/6"
                  >
                    <FolderOpen className="size-4" /> Open workspace
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      saveNow();
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 transition hover:bg-white/6"
                  >
                    <Save className="size-4" /> {saveLabel[saveState]}
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setSummaryOpen(true);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 transition hover:bg-white/6"
                  >
                    <BarChart3 className="size-4" /> Project intelligence
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setTeamOpen(true);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 transition hover:bg-white/6"
                  >
                    <Users className="size-4" /> Manage team
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setWorkloadViewOpen(true);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 transition hover:bg-white/6"
                  >
                    <LayoutGrid className="size-4" /> Workload view
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setGanttViewOpen(true);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 transition hover:bg-white/6"
                  >
                    <GitBranch className="size-4" /> Gantt chart
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setDependencyGraphOpen(true);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 transition hover:bg-white/6"
                  >
                    <GitBranch className="size-4" /> Dependency graph
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setTemplatesOpen(true);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 transition hover:bg-white/6"
                  >
                    <ClipboardList className="size-4" /> Task templates
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setMilestoneModalOpen(true);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 transition hover:bg-white/6"
                  >
                    <Flag className="size-4" /> Milestones
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setManageProjectsOpen(true);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 transition hover:bg-white/6"
                  >
                    <Settings className="size-4" /> Manage projects
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setExportImportOpen(true);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 transition hover:bg-white/6"
                  >
                    <Download className="size-4" /> Export / Import
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <div className="px-6 pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              {/* Left project picker */}
              <div className="inline-flex items-center gap-2 rounded-2xl bg-white/[0.04] p-1 ring-1 ring-white/8">
                <div
                  className={`h-2 w-2 rounded-full ml-2 ${visibleProjectIds[0] ? "bg-violet-400" : "bg-slate-600"}`}
                />
                <select
                  value={visibleProjectIds[0] ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) {
                      setVisibleProjects(visibleProjectIds.slice(1));
                    } else if (val === visibleProjectIds[1]) {
                      // Swap
                      setVisibleProjects([
                        visibleProjectIds[1]!,
                        visibleProjectIds[0]!,
                      ]);
                    } else {
                      setVisibleProjects([val, ...visibleProjectIds.slice(1)]);
                    }
                  }}
                  className="bg-transparent text-sm text-white outline-none min-w-[140px]"
                  aria-label="Left project"
                >
                  {visibleProjectIds[0] ? null : (
                    <option value="" className="bg-[#0d1726]">
                      – Pick project –
                    </option>
                  )}
                  {data.projects
                    .filter((p) => p.id !== visibleProjectIds[1])
                    .map((p) => (
                      <option key={p.id} value={p.id} className="bg-[#0d1726]">
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Right project picker */}
              <div className="inline-flex items-center gap-2 rounded-2xl bg-white/[0.04] p-1 ring-1 ring-white/8">
                <div
                  className={`h-2 w-2 rounded-full ml-2 ${visibleProjectIds[1] ? "bg-cyan-400" : "bg-slate-600"}`}
                />
                <select
                  value={visibleProjectIds[1] ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) {
                      setVisibleProjects(visibleProjectIds.slice(0, 1));
                    } else {
                      setVisibleProjects([
                        ...visibleProjectIds.slice(0, 1),
                        val,
                      ]);
                    }
                  }}
                  className="bg-transparent text-sm text-white outline-none min-w-[140px]"
                  aria-label="Right project"
                >
                  <option value="" className="bg-[#0d1726]">
                    – None –
                  </option>
                  {data.projects
                    .filter((p) => p.id !== visibleProjectIds[0])
                    .map((p) => (
                      <option key={p.id} value={p.id} className="bg-[#0d1726]">
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* New project quick button */}
              <button
                onClick={() => setManageProjectsOpen(true)}
                className="rounded-2xl px-3 py-2 text-sm text-slate-400 transition hover:bg-white/8 hover:text-white ring-1 ring-white/8"
                aria-label="New project"
              >
                <Plus className="size-4" />
              </button>
            </div>

            <ZoomControls value={zoom} onChange={setZoom} />
          </div>
          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <SummaryChips
              chips={summaryChips}
              activeFilter={timelineFilter}
              onFilterChange={(filter) =>
                setTimelineFilter(filter as TimelineFilter)
              }
            />
            <div className="flex items-center gap-2">
              {/* Priority filter */}
              <div className="flex items-center gap-1 rounded-2xl bg-white/[0.04] p-1 ring-1 ring-white/8">
                {priorityFilterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setPriorityFilter(option.value)}
                    className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-medium transition ${
                      priorityFilter === option.value
                        ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                    aria-label={`Filter by ${option.label} priority`}
                    aria-pressed={priorityFilter === option.value}
                  >
                    {option.color ? (
                      <span
                        className={`inline-block size-1.5 rounded-full ${option.color}`}
                      />
                    ) : null}
                    {option.label}
                  </button>
                ))}
              </div>
              {selectedTaskIds.length > 0 ? (
                <div className="flex items-center gap-2 rounded-2xl bg-cyan-500/10 px-3 py-1.5 text-sm text-cyan-200 ring-1 ring-cyan-400/20">
                  <span className="font-medium">{selectedTaskIds.length}</span>{" "}
                  selected
                  <button
                    onClick={clearTaskSelection}
                    className="ml-2 rounded-full bg-white/8 px-2 py-0.5 text-xs hover:bg-white/14"
                    aria-label="Clear task selection"
                  >
                    Clear
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <main className="flex-1 px-6 pb-6 pt-1">
          {dependencyGraphOpen ? (
            <Suspense fallback={<TaskCardSkeleton />}>
              <DependencyGraphView
                projects={visibleProjects}
                onClose={() => setDependencyGraphOpen(false)}
              />
            </Suspense>
          ) : ganttViewOpen ? (
            <Suspense fallback={<TaskCardSkeleton />}>
              <GanttView
                projects={visibleProjects}
                onClose={() => setGanttViewOpen(false)}
              />
            </Suspense>
          ) : workloadViewOpen ? (
            <Suspense fallback={<TaskCardSkeleton />}>
              <WorkloadView
                projects={visibleProjects}
                people={data.people}
                onClose={() => setWorkloadViewOpen(false)}
              />
            </Suspense>
          ) : (
            <>
              <div className="grid grid-cols-[minmax(0,1fr)_180px_minmax(0,1fr)] gap-8 pb-4">
                {visibleProjects.map((project, index) => {
                  const isCollapsed = collapsedProjects.has(project.id);
                  return (
                    <section
                      key={project.id}
                      className={index === 0 ? "col-start-1" : "col-start-3"}
                    >
                      <div className="sticky top-0 z-10 mb-2 flex items-center justify-between gap-3 bg-[linear-gradient(180deg,rgba(8,17,29,0.98),rgba(8,17,29,0.84),transparent)] pb-3 pt-1">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() =>
                              setCollapsedProjects((prev) => {
                                const next = new Set(prev);
                                if (next.has(project.id)) {
                                  next.delete(project.id);
                                } else {
                                  next.add(project.id);
                                }
                                return next;
                              })
                            }
                            className="rounded-full p-1 text-slate-400 transition hover:bg-white/8 hover:text-white"
                            aria-label={
                              isCollapsed
                                ? `Expand ${project.name}`
                                : `Collapse ${project.name}`
                            }
                          >
                            {isCollapsed ? (
                              <ChevronRight className="size-4" />
                            ) : (
                              <ChevronDown className="size-4" />
                            )}
                          </button>
                          <div
                            className={`h-2.5 w-2.5 rounded-full ${index === 0 ? "bg-violet-400" : "bg-cyan-400"}`}
                          />
                          <div>
                            <h2 className="text-xl font-semibold tracking-tight text-white">
                              {project.name}
                            </h2>
                            <p className="mt-0.5 max-w-md text-sm text-slate-500">
                              {project.description}
                            </p>
                          </div>
                        </div>
                        <div className="text-right text-[11px] uppercase tracking-[0.18em] text-slate-500">
                          <div>{project.tasks.length} Tasks</div>
                          <div className="mt-1">
                            {project.milestones.length} Milestones
                          </div>
                        </div>
                      </div>
                    </section>
                  );
                })}
              </div>

              {visibleProjects.some((p) => !collapsedProjects.has(p.id))
                ? (() => {
                    const uncollapsed = visibleProjects.filter(
                      (p) => !collapsedProjects.has(p.id),
                    );
                    const totalTasks = uncollapsed.reduce(
                      (sum, p) => sum + p.tasks.length,
                      0,
                    );
                    const allDone = uncollapsed.every((p) =>
                      p.tasks.every((t) => computeTaskStatus(t) === "Done"),
                    );

                    if (totalTasks === 0) {
                      return (
                        <EmptyState
                          icon={<ClipboardList className="size-6" />}
                          title="No tasks in this project"
                          description="Add your first task to start tracking progress."
                          action={{
                            label: "Add Task",
                            onClick: () => setAddTaskOpen(true),
                          }}
                        />
                      );
                    }

                    if (searchQuery && totalTasks === 0) {
                      return (
                        <EmptyState
                          icon={<SearchX className="size-6" />}
                          title="No results found"
                          description={`No tasks match "${searchQuery}". Try a different search term.`}
                        />
                      );
                    }

                    if (allDone && totalTasks > 0) {
                      return (
                        <EmptyState
                          icon={<CheckCircle2 className="size-6" />}
                          title="All tasks done!"
                          description="Great work! All tasks in this view are completed."
                        />
                      );
                    }

                    return (
                      <TimelineView
                        projects={uncollapsed}
                        people={data.people}
                        milestones={uncollapsed.flatMap((p) => p.milestones)}
                        zoom={zoom}
                        filter={timelineFilter}
                        priorityFilter={priorityFilter}
                        onSaveTask={(projectId, task) =>
                          upsertTask(projectId, task)
                        }
                        onDeleteTask={(projectId, taskId) =>
                          deleteTask(projectId, taskId)
                        }
                      />
                    );
                  })()
                : null}
            </>
          )}
        </main>
      </div>

      <Suspense fallback={null}>
        <SummaryModal
          open={summaryOpen}
          projects={visibleProjects}
          onClose={() => setSummaryOpen(false)}
        />
      </Suspense>
      <Suspense fallback={null}>
        <AddTaskModal
          open={addTaskOpen}
          projects={visibleProjects}
          onClose={() => setAddTaskOpen(false)}
          onSubmit={(projectId, task) => upsertTask(projectId, task)}
          onSubmitNatural={createTaskFromNaturalLanguage}
        />
      </Suspense>
      <Suspense fallback={null}>
        <TeamModal
          open={teamOpen}
          people={data.people}
          onClose={() => setTeamOpen(false)}
          onSave={upsertPerson}
          onDelete={deletePerson}
        />
      </Suspense>
      <Suspense fallback={null}>
        <ExportImportModal
          open={exportImportOpen}
          onClose={() => setExportImportOpen(false)}
          onExport={exportWorkspace}
          onImport={importWorkspace}
        />
      </Suspense>
      <Suspense fallback={null}>
        <TemplatesModal
          open={templatesOpen}
          templates={templates}
          projects={visibleProjects}
          onClose={() => setTemplatesOpen(false)}
          onSaveTemplate={saveTemplate}
          onDeleteTemplate={deleteTemplate}
          onInstantiate={instantiateTemplate}
        />
      </Suspense>
      <Suspense fallback={null}>
        <MilestoneModal
          open={milestoneModalOpen}
          projects={visibleProjects}
          onClose={() => setMilestoneModalOpen(false)}
          onSaveMilestone={upsertMilestone}
          onDeleteMilestone={deleteMilestone}
        />
      </Suspense>

      <Suspense fallback={null}>
        <ManageProjectsModal
          open={manageProjectsOpen}
          projects={data.projects}
          visibleProjectIds={visibleProjectIds}
          onClose={() => setManageProjectsOpen(false)}
          onCreateProject={createProject}
          onUpdateProject={updateProject}
          onDeleteProject={(id) => {
            deleteProject(id);
          }}
        />
      </Suspense>

      {recentlyDeletedTask ? (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-2xl bg-[#0d1726]/96 px-4 py-3 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl">
          <div>
            <p className="text-sm font-medium text-white">Task deleted</p>
            <p className="text-xs text-slate-400">
              {recentlyDeletedTask.task.title} can be restored for a few
              seconds.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={undoDeleteTask}
            className="whitespace-nowrap"
          >
            Undo
          </Button>
        </div>
      ) : null}
    </div>
  );
};
