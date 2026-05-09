import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  MoreHorizontal,
  Users,
  Plus,
  Save,
  Search,
  Undo2,
  Redo2,
  LayoutGrid,
  GitBranch,
  Download,
  ClipboardList,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { ThemeSwitcher } from "../components/ui/ThemeSwitcher";
import { useTheme } from "../hooks/useTheme";

import { matchesProjectSearch } from "../lib/search";
import {
  selectActiveTabProjects,
  useWorkspaceStore,
} from "../store/useWorkspaceStore";
import { WorkspaceLauncher } from "../features/workspace/WorkspaceLauncher";
import { TeamModal } from "../features/workspace/TeamModal";
import { SummaryModal } from "../features/tasks/SummaryModal";
import { AddTaskModal } from "../features/tasks/AddTaskModal";
import { TimelineView } from "../features/timeline/TimelineView";
import { SummaryChips } from "../features/timeline/SummaryChips";
import { ZoomControls } from "../features/timeline/ZoomControls";
import { aggregateVisibleSummary } from "../lib/summary";
import { WorkloadView } from "../features/workspace/WorkloadView";
import { GanttView } from "../features/timeline/GanttView";
import { ExportImportModal } from "../features/workspace/ExportImportModal";
import { TemplatesModal } from "../features/tasks/TemplatesModal";
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

  const { theme, setTheme } = useTheme();

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
    activeTabId,
    setActiveTab,
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
    exportImportOpen,
    setExportImportOpen,
    exportWorkspace,
    importWorkspace,
    templates,
    saveTemplate,
    deleteTemplate,
    instantiateTemplate,
  } = useWorkspaceStore();

  useEffect(() => {
    if (!recentlyDeletedTask) return undefined;
    const timeout = window.setTimeout(() => clearRecentlyDeletedTask(), 8000);
    return () => window.clearTimeout(timeout);
  }, [recentlyDeletedTask, clearRecentlyDeletedTask]);

  const visibleProjects = useMemo(() => {
    const current = selectActiveTabProjects(data, activeTabId);
    return current.map((project) => matchesProjectSearch(project, searchQuery));
  }, [data, activeTabId, searchQuery]);

  const primaryProject = visibleProjects[0] ?? null;
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
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-300">
        Loading Timeliner…
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
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-[1600px] flex-col rounded-[34px] bg-main-container shadow-glow ring-1 ring-white/8 backdrop-blur-xl">
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
            />
          </div>
          <div className="flex items-center justify-start gap-2 lg:justify-end">
            {/* Undo/Redo */}
            <Button
              variant="ghost"
              onClick={undo}
              disabled={undoStack.length === 0}
              className="rounded-full p-2"
              title="Undo"
            >
              <Undo2 className="size-4" />
            </Button>
            <Button
              variant="ghost"
              onClick={redo}
              disabled={redoStack.length === 0}
              className="rounded-full p-2"
              title="Redo"
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
            <ThemeSwitcher current={theme} onChange={setTheme} />
            <div className="relative">
              <Button
                variant="secondary"
                className="rounded-full px-3"
                onClick={() => setMenuOpen((value) => !value)}
              >
                <MoreHorizontal className="size-4" />
              </Button>
              {menuOpen ? (
                <div className="absolute right-0 top-12 z-30 min-w-52 rounded-2xl bg-panel-strong p-2 shadow-2xl ring-1 ring-white/10">
                  <button
                    onClick={() => {
                      openWorkspace();
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 transition hover:bg-white/6"
                  >
                    <FolderOpen className="size-4" /> Open workspace
                  </button>
                  <button
                    onClick={() => {
                      saveNow();
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 transition hover:bg-white/6"
                  >
                    <Save className="size-4" /> {saveLabel[saveState]}
                  </button>
                  <button
                    onClick={() => {
                      setSummaryOpen(true);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 transition hover:bg-white/6"
                  >
                    <BarChart3 className="size-4" /> Project intelligence
                  </button>
                  <button
                    onClick={() => {
                      setTeamOpen(true);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 transition hover:bg-white/6"
                  >
                    <Users className="size-4" /> Manage team
                  </button>
                  <button
                    onClick={() => {
                      setWorkloadViewOpen(true);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 transition hover:bg-white/6"
                  >
                    <LayoutGrid className="size-4" /> Workload view
                  </button>
                  <button
                    onClick={() => {
                      setGanttViewOpen(true);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 transition hover:bg-white/6"
                  >
                    <GitBranch className="size-4" /> Gantt chart
                  </button>
                  <button
                    onClick={() => {
                      setTemplatesOpen(true);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 transition hover:bg-white/6"
                  >
                    <ClipboardList className="size-4" /> Task templates
                  </button>
                  <button
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
            <nav className="inline-flex rounded-2xl bg-white/[0.04] p-1 ring-1 ring-white/8">
              {data.workspace.tabs.map((tab) => {
                const tabProjects = tab.projectIds
                  .map((pid) => data.projects.find((p) => p.id === pid))
                  .filter(Boolean);

                const taskCount = tabProjects.reduce(
                  (sum, p) => sum + (p?.tasks.length ?? 0),
                  0,
                );
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-2xl px-4 py-2 text-sm transition ${activeTabId === tab.id ? "bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" : "text-slate-400 hover:text-slate-200"}`}
                  >
                    {tab.name}
                    <span className="ml-2 rounded-full bg-white/8 px-2 py-0.5 text-[11px]">
                      {taskCount}
                    </span>
                  </button>
                );
              })}
            </nav>
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
                  >
                    Clear
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <main className="flex-1 px-6 pb-6 pt-1">
          {ganttViewOpen ? (
            <GanttView
              projects={visibleProjects}
              onClose={() => setGanttViewOpen(false)}
            />
          ) : workloadViewOpen ? (
            <WorkloadView
              projects={visibleProjects}
              people={data.people}
              onClose={() => setWorkloadViewOpen(false)}
            />
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
                      <div className="sticky top-0 z-10 mb-2 flex items-center justify-between gap-3 bg-[linear-gradient(180deg,var(--panel-strong),var(--panel),transparent)] pb-3 pt-1">
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

              {visibleProjects.some((p) => !collapsedProjects.has(p.id)) ? (
                <TimelineView
                  projects={visibleProjects.filter(
                    (p) => !collapsedProjects.has(p.id),
                  )}
                  people={data.people}
                  zoom={zoom}
                  filter={timelineFilter}
                  priorityFilter={priorityFilter}
                  onSaveTask={(projectId, task) => upsertTask(projectId, task)}
                  onDeleteTask={(projectId, taskId) =>
                    deleteTask(projectId, taskId)
                  }
                />
              ) : null}
            </>
          )}
        </main>
      </div>

      <SummaryModal
        open={summaryOpen}
        projects={visibleProjects}
        onClose={() => setSummaryOpen(false)}
      />
      <AddTaskModal
        open={addTaskOpen}
        project={primaryProject}
        onClose={() => setAddTaskOpen(false)}
        onSubmit={(projectId, task) => upsertTask(projectId, task)}
        onSubmitNatural={createTaskFromNaturalLanguage}
      />
      <TeamModal
        open={teamOpen}
        people={data.people}
        onClose={() => setTeamOpen(false)}
        onSave={upsertPerson}
        onDelete={deletePerson}
      />
      <ExportImportModal
        open={exportImportOpen}
        onClose={() => setExportImportOpen(false)}
        onExport={exportWorkspace}
        onImport={importWorkspace}
      />
      <TemplatesModal
        open={templatesOpen}
        templates={templates}
        projects={visibleProjects}
        onClose={() => setTemplatesOpen(false)}
        onSaveTemplate={saveTemplate}
        onDeleteTemplate={deleteTemplate}
        onInstantiate={instantiateTemplate}
      />

      {recentlyDeletedTask ? (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-2xl bg-panel-strong px-4 py-3 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl">
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
