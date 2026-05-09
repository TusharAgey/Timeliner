import { useMemo } from "react";
import { X } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { computeTaskStatus } from "../../lib/status";
import { parseDate } from "../../lib/date";
import { differenceInCalendarDays } from "date-fns";
import type { Project } from "../../models/types";

type GanttViewProps = {
  projects: Project[];
  onClose: () => void;
};

export const GanttView = ({ projects, onClose }: GanttViewProps) => {
  const { tasks, dateRange } = useMemo(() => {
    const allTasks = projects.flatMap((project) =>
      project.tasks.map((task) => ({ ...task, projectName: project.name })),
    );

    if (!allTasks.length)
      return { tasks: [], dateRange: { start: new Date(), days: 30 } };

    const dates = allTasks.flatMap((t) => [
      parseDate(t.startDate),
      parseDate(t.endDate),
    ]);
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
    const days = Math.max(30, differenceInCalendarDays(maxDate, minDate) + 14);

    return {
      tasks: allTasks.sort(
        (a, b) =>
          parseDate(a.startDate).getTime() - parseDate(b.startDate).getTime(),
      ),
      dateRange: { start: minDate, days },
    };
  }, [projects]);

  const today = new Date();
  const todayOffset = differenceInCalendarDays(today, dateRange.start);

  const dayWidth = Math.max(12, Math.min(24, 800 / dateRange.days));
  const totalWidth = dateRange.days * dayWidth;

  return (
    <div className="rounded-[24px] bg-white/[0.035] p-6 ring-1 ring-white/8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-white">
            Gantt chart
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Horizontal timeline of all tasks across visible projects
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      <div className="overflow-auto rounded-2xl bg-black/18 ring-1 ring-white/6">
        {/* Header with dates */}
        <div
          className="sticky top-0 z-10 flex border-b border-white/6 bg-bg"
          style={{ minWidth: totalWidth + 240 }}
        >
          <div className="w-60 shrink-0 border-r border-white/6 px-4 py-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
            Task
          </div>
          <div className="flex">
            {Array.from({ length: dateRange.days }).map((_, i) => {
              const date = new Date(dateRange.start);
              date.setDate(date.getDate() + i);
              const isToday =
                date.toISOString().slice(0, 10) ===
                today.toISOString().slice(0, 10);
              const isWeekStart = date.getDay() === 1;
              return (
                <div
                  key={i}
                  className={`shrink-0 border-r border-white/4 px-1 py-3 text-center text-[10px] ${
                    isToday
                      ? "bg-cyan-500/10 font-semibold text-cyan-300"
                      : isWeekStart
                        ? "text-slate-400"
                        : "text-slate-600"
                  }`}
                  style={{ width: dayWidth }}
                >
                  {isWeekStart || isToday
                    ? date.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })
                    : ""}
                </div>
              );
            })}
          </div>
        </div>

        {/* Task rows */}
        <div style={{ minWidth: totalWidth + 240 }}>
          {tasks.map((task) => {
            const start = parseDate(task.startDate);
            const end = parseDate(task.endDate);
            const startOffset = differenceInCalendarDays(
              start,
              dateRange.start,
            );
            const duration = Math.max(
              1,
              differenceInCalendarDays(end, start) + 1,
            );
            const status = computeTaskStatus(task);
            const barColor =
              status === "Overdue"
                ? "bg-rose-400"
                : status === "Delayed"
                  ? "bg-orange-400"
                  : status === "At Risk"
                    ? "bg-amber-400"
                    : status === "Done"
                      ? "bg-emerald-400"
                      : status === "Ahead"
                        ? "bg-cyan-400"
                        : "bg-violet-400";

            return (
              <div
                key={task.id}
                className="flex border-b border-white/4 hover:bg-white/[0.02]"
              >
                <div className="flex w-60 shrink-0 items-center gap-2 border-r border-white/6 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-200">
                      {task.title}
                    </p>
                    <p className="truncate text-[11px] text-slate-500">
                      {task.projectName}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                      status === "Overdue"
                        ? "border-rose-400/20 bg-rose-500/10 text-rose-200"
                        : status === "Delayed" || status === "At Risk"
                          ? "border-amber-400/20 bg-amber-500/10 text-amber-200"
                          : "border-slate-400/20 bg-slate-500/10 text-slate-300"
                    }`}
                  >
                    {status}
                  </span>
                </div>
                <div className="relative flex-1">
                  {/* Today line */}
                  {todayOffset >= 0 && todayOffset < dateRange.days ? (
                    <div
                      className="absolute top-0 z-10 h-full w-px bg-cyan-400/60 shadow-[0_0_8px_rgba(34,211,238,0.3)]"
                      style={{ left: todayOffset * dayWidth }}
                    />
                  ) : null}
                  {/* Task bar */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 rounded-full px-2 py-1"
                    style={{
                      left: startOffset * dayWidth,
                      width: Math.max(duration * dayWidth, 8),
                    }}
                  >
                    <div
                      className={`h-2 rounded-full ${barColor} opacity-80 shadow-[0_0_8px_rgba(255,255,255,0.06)]`}
                      style={{
                        width: `${task.progressPercent}%`,
                        minWidth: task.progressPercent > 0 ? "4px" : "0",
                      }}
                    />
                    <div
                      className={`absolute inset-0 rounded-full ${barColor}/20 ring-1 ring-white/10`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
