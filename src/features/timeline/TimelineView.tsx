import {
  differenceInCalendarDays,
  formatDistanceToNowStrict,
  isBefore,
  startOfWeek,
} from "date-fns";
import { useCallback, useMemo, useState } from "react";
import { fullDate, today } from "../../lib/date";
import { computeTaskStatus } from "../../lib/status";
import type { Milestone, Person, Project, Task } from "../../models/types";
import { TaskCard } from "./TaskCard";
import type {
  PriorityFilter,
  TimelineFilter,
  TimelineZoom,
} from "./timelineTypes";

import {
  AXIS_GUTTER,
  AXIS_WIDTH,
  CARD_HEIGHT,
  CARD_GAP,
  getTaskTargetDate,
  resolveCardTop,
  resolveFutureCollisions,
  resolvePastCollisions,
} from "./timelineLayout";

const zoomScale: Record<TimelineZoom, number> = {
  week: 96,
  month: 64,
  quarter: 40,
};

const weekKey = (date: Date) =>
  startOfWeek(date, { weekStartsOn: 1 }).toISOString().slice(0, 10);

const weekStartTime = (key: string) => new Date(`${key}T00:00:00`).getTime();

const formatMarkerLabel = (offset: number) => {
  if (offset === 0) return "Today";
  const targetDate = new Date(today());
  targetDate.setDate(targetDate.getDate() + offset);
  if (Math.abs(offset) <= 7) {
    return offset > 0
      ? `In ${formatDistanceToNowStrict(targetDate, { addSuffix: false })}`
      : `${formatDistanceToNowStrict(targetDate, { addSuffix: false })} ago`;
  }
  return targetDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

type TimelineViewProps = {
  projects: Project[];
  people: Person[];
  milestones: Milestone[];
  zoom: TimelineZoom;
  filter?: TimelineFilter;
  priorityFilter?: PriorityFilter;
  onSaveTask: (projectId: string, task: Task) => void;
  onDeleteTask: (projectId: string, taskId: string) => void;
};

export const TimelineView = ({
  projects,
  people,
  milestones,
  zoom,
  filter = "all",
  priorityFilter = "all",
  onSaveTask,
  onDeleteTask,
}: TimelineViewProps) => {
  const [cardHeights, setCardHeights] = useState<Record<string, number>>({});
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const currentDay = today();
  const allTasks = useMemo(() => projects.flatMap((p) => p.tasks), [projects]);
  const measureCard = useCallback(
    (taskId: string) => (node: HTMLDivElement | null) => {
      if (!node) return undefined;

      const updateHeight = () => {
        const nextHeight = Math.ceil(node.getBoundingClientRect().height);
        setCardHeights((current) =>
          current[taskId] === nextHeight
            ? current
            : { ...current, [taskId]: nextHeight },
        );
      };

      updateHeight();
      const observer = new ResizeObserver(updateHeight);
      observer.observe(node);
      return () => observer.disconnect();
    },
    [],
  );

  const lanes = useMemo(
    () =>
      projects.map((project, index) => ({
        side: index === 0 ? ("left" as const) : ("right" as const),
        project,
        accentClassName: index === 0 ? "bg-fuchsia-400" : "bg-emerald-400",
      })),
    [projects],
  );

  const filterTask = useCallback(
    (task: Task) => {
      const status = computeTaskStatus(task);
      // Apply timeline filter first
      if (filter === "overdue" && status !== "Overdue") return false;
      if (filter === "atRisk" && status !== "At Risk" && status !== "Delayed")
        return false;
      if (
        filter === "startsToday" &&
        task.startDate !== currentDay.toISOString().slice(0, 10)
      )
        return false;
      // Apply priority filter (independent of timeline filter)
      if (priorityFilter !== "all" && task.priority !== priorityFilter)
        return false;
      return true;
    },
    [filter, priorityFilter, currentDay],
  );

  const items = useMemo(
    () =>
      lanes.flatMap((lane) =>
        lane.project.tasks.filter(filterTask).map((task) => ({
          lane,
          task,
          targetDate: getTaskTargetDate(task),
        })),
      ),
    [lanes, filterTask],
  );

  const scale = zoomScale[zoom];

  const { scheduledWeekKeys, weekIndexByKey } = useMemo(() => {
    const keys = Array.from(
      new Set([
        ...items.map((item) => weekKey(item.targetDate)),
        weekKey(currentDay),
      ]),
    ).sort((a, b) => weekStartTime(a) - weekStartTime(b));
    const indexByKey = new Map(keys.map((key, index) => [key, index]));
    return { scheduledWeekKeys: keys, weekIndexByKey: indexByKey };
  }, [items, currentDay]);

  const weekSlotHeight = Math.max(scale, CARD_HEIGHT + CARD_GAP);
  const compactTimeToY = useCallback(
    (date: Date) => (weekIndexByKey.get(weekKey(date)) ?? 0) * weekSlotHeight,
    [weekIndexByKey, weekSlotHeight],
  );

  const totalHeight = Math.max(scheduledWeekKeys.length * weekSlotHeight, 1);
  const baseTodayY = compactTimeToY(currentDay);

  const markers = useMemo(
    () =>
      scheduledWeekKeys
        .filter((key) => key !== weekKey(currentDay))
        .map((key) => {
          const markerDate = new Date(`${key}T00:00:00`);
          const offset = differenceInCalendarDays(markerDate, currentDay);
          return {
            offset,
            label: formatMarkerLabel(offset),
            y: compactTimeToY(markerDate),
          };
        }),
    [scheduledWeekKeys, currentDay, compactTimeToY],
  );

  const { leftItems, rightItems } = useMemo(() => {
    const allItems = items.map((item) => {
      const baseY = compactTimeToY(item.targetDate);
      const height = cardHeights[item.task.id] ?? CARD_HEIGHT;
      return {
        ...item,
        height,
        top: resolveCardTop({
          baseY,
          todayY: baseTodayY,
          targetDate: item.targetDate,
          currentDay,
          height,
        }),
      };
    });

    const pastItems = allItems.filter((item) =>
      isBefore(item.targetDate, currentDay),
    );
    const futureItems = allItems.filter(
      (item) => !isBefore(item.targetDate, currentDay),
    );

    const resolved = [
      ...resolvePastCollisions(pastItems),
      ...resolveFutureCollisions(futureItems),
    ].sort((a, b) => a.top - b.top);

    const left = resolved.filter((item) => item.lane.side === "left");
    const right = resolved.filter((item) => item.lane.side === "right");
    return { leftItems: left, rightItems: right };
  }, [items, cardHeights, compactTimeToY, baseTodayY, currentDay]);

  const {
    todayY,
    shiftedMarkers,
    shiftedLeftItems,
    shiftedRightItems,
    renderedHeight,
  } = useMemo(() => {
    const minRenderedTop = Math.min(
      0,
      ...leftItems.map((item) => item.top),
      ...rightItems.map((item) => item.top),
    );
    const shift = minRenderedTop < 0 ? Math.abs(minRenderedTop) + CARD_GAP : 0;
    const tY = baseTodayY + shift;
    const sMarkers = markers.map((marker) => ({
      ...marker,
      y: marker.y + shift,
    }));
    const sLeftItems = leftItems.map((item) => ({
      ...item,
      top: item.top + shift,
    }));
    const sRightItems = rightItems.map((item) => ({
      ...item,
      top: item.top + shift,
    }));
    const rHeight = Math.max(
      totalHeight + shift,
      ...sLeftItems.map((item) => item.top + item.height),
      ...sRightItems.map((item) => item.top + item.height),
      tY + 80,
    );
    return {
      yShift: shift,
      todayY: tY,
      shiftedMarkers: sMarkers,
      shiftedLeftItems: sLeftItems,
      shiftedRightItems: sRightItems,
      renderedHeight: rHeight,
    };
  }, [leftItems, rightItems, baseTodayY, markers, totalHeight]);

  return (
    <div className="relative h-full overflow-auto scroll-smooth">
      <div
        className="relative min-w-[900px] overflow-x-hidden pb-12"
        style={{ height: renderedHeight }}
      >
        {/* Vertical timeline bar — rendered outside the grid so it spans full height */}
        <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-px -translate-x-1/2 bg-gradient-to-b from-white/10 via-white/10 to-white/10" />

        {/* Today glow */}
        <div
          className="pointer-events-none absolute inset-x-0 z-[1] bg-cyan-300/[0.035] shadow-[0_0_80px_rgba(34,211,238,0.06)]"
          style={{ top: todayY - scale * 3, height: scale * 6 }}
        />

        {/* Week marker rows — subtle horizontal guides */}
        <div className="pointer-events-none absolute inset-0 z-[1]">
          {shiftedMarkers.map((marker) => {
            const markerDate = new Date(currentDay);
            markerDate.setDate(markerDate.getDate() + marker.offset);
            const inFocus =
              Math.abs(differenceInCalendarDays(markerDate, currentDay)) <= 3;
            return (
              <div
                key={`row-${marker.offset}`}
                className={`absolute border-t ${inFocus ? "border-white/6" : "border-white/[0.015]"}`}
                style={{
                  top: marker.y,
                  left: "calc(50% - 480px)",
                  right: "calc(50% - 480px)",
                }}
              />
            );
          })}
        </div>

        {/* Today line */}
        <div
          className="pointer-events-none absolute inset-x-0 z-30"
          style={{ top: todayY }}
        >
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-x-0 top-1/2 z-0 h-px -translate-y-1/2 bg-cyan-300/60 shadow-[0_0_24px_rgba(34,211,238,0.35)]" />
            <div className="relative z-10 rounded-full bg-cyan-300 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.35)]">
              Today
            </div>
          </div>
        </div>

        {/* Axis markers (labels + dots) — positioned over the vertical bar */}
        <div className="pointer-events-none absolute inset-0 z-10">
          {shiftedMarkers.map((marker) => (
            <div
              key={`axis-${marker.offset}`}
              className="absolute left-1/2 flex -translate-x-1/2 flex-col items-center"
              style={{
                top: (() => {
                  const markerY = marker.y;
                  return (
                    markerY +
                    (Math.abs(markerY - todayY) < scale * 0.9
                      ? marker.offset <= 0
                        ? -26
                        : 26
                      : 0)
                  );
                })(),
              }}
            >
              <div className="h-2.5 w-2.5 rounded-full border border-white/15 bg-[#0f1b2d]" />
              <div className="mt-1 h-3 w-px bg-white/10" />
              <div className="mt-2 rounded-full bg-[#0f1b2d]/90 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-400 ring-1 ring-white/8">
                {marker.label}
              </div>
            </div>
          ))}
          <div className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-[#0f1b2d]/90 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-500 ring-1 ring-white/8">
            {fullDate(new Date().toISOString().slice(0, 10))}
          </div>
        </div>

        {/* Card grid */}
        <div className="grid grid-cols-[minmax(0,1fr)_0_minmax(0,1fr)]">
          <div className="relative z-20" style={{ marginRight: AXIS_GUTTER }}>
            {shiftedLeftItems.map((item) => {
              return (
                <div
                  key={item.task.id}
                  ref={measureCard(item.task.id)}
                  className={`absolute right-0 w-full max-w-[520px] transition-[top] duration-300 ease-out ${editingTaskId === item.task.id ? "z-30" : "z-20"}`}
                  style={{ top: item.top }}
                >
                  <TaskCard
                    task={item.task}
                    people={people}
                    milestones={milestones}
                    allTasks={allTasks}
                    side="left"
                    accentClassName={item.lane.accentClassName}
                    onSave={(task) => onSaveTask(item.lane.project.id, task)}
                    onDelete={(taskId) =>
                      onDeleteTask(item.lane.project.id, taskId)
                    }
                    onEditingChange={(editing) =>
                      setEditingTaskId(editing ? item.task.id : null)
                    }
                  />
                </div>
              );
            })}
          </div>

          <div className="relative z-10" style={{ width: AXIS_WIDTH }} />

          <div className="relative z-20" style={{ marginLeft: AXIS_GUTTER }}>
            {shiftedRightItems.map((item) => {
              return (
                <div
                  key={item.task.id}
                  ref={measureCard(item.task.id)}
                  className={`absolute left-0 w-full max-w-[520px] transition-[top] duration-300 ease-out ${editingTaskId === item.task.id ? "z-30" : "z-20"}`}
                  style={{ top: item.top }}
                >
                  <TaskCard
                    task={item.task}
                    people={people}
                    milestones={milestones}
                    allTasks={allTasks}
                    side="right"
                    accentClassName={item.lane.accentClassName}
                    onSave={(task) => onSaveTask(item.lane.project.id, task)}
                    onDelete={(taskId) =>
                      onDeleteTask(item.lane.project.id, taskId)
                    }
                    onEditingChange={(editing) =>
                      setEditingTaskId(editing ? item.task.id : null)
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
