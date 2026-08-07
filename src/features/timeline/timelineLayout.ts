import { differenceInCalendarDays, isBefore, isValid } from "date-fns";
import { parseDate, today } from "../../lib/date";
import type { Task } from "../../models/types";

export const CARD_HEIGHT = 190;
export const CARD_GAP = 16;
export const TODAY_GAP = 24;
export const AXIS_GUTTER = 48;
export const AXIS_WIDTH = 0;
export const PILL_WIDTH = "53px"; // Pill width from the card to ensure it lines up perfectly with the vertical axis marker.
type TimeScale = {
  minOffset: number;
  scale: number;
  today: Date;
};

export const timeToY = (date: Date, { minOffset, scale, today }: TimeScale) =>
  (differenceInCalendarDays(date, today) - minOffset) * scale;

export const getTaskTargetDate = (task: Task) => {
  const dateStr = task.expectedEndDate || task.endDate;
  if (!dateStr) return today();
  const parsed = parseDate(dateStr);
  if (!isValid(parsed)) return today();
  return parsed;
};

export const resolveCardTop = ({
  baseY,
  todayY,
  targetDate,
  currentDay,
  height = CARD_HEIGHT,
}: {
  baseY: number;
  todayY: number;
  targetDate: Date;
  currentDay: Date;
  height?: number;
}) => {
  if (isBefore(targetDate, currentDay)) {
    return Math.min(baseY - height, todayY - TODAY_GAP - height);
  }

  return Math.max(baseY, todayY + TODAY_GAP);
};

export const resolveFutureCollisions = <
  T extends { top: number; height: number },
>(
  items: T[],
) => {
  let previousBottom = -Infinity;

  return [...items]
    .sort((a, b) => a.top - b.top)
    .map((item) => {
      const top = Math.max(item.top, previousBottom + CARD_GAP);
      previousBottom = top + item.height;
      return { ...item, top };
    });
};

export const resolvePastCollisions = <
  T extends { top: number; height: number },
>(
  items: T[],
) => {
  let previousTop = Infinity;

  return [...items]
    .sort((a, b) => b.top - a.top)
    .map((item) => {
      const top = Math.min(item.top, previousTop - CARD_GAP - item.height);
      previousTop = top;
      return { ...item, top };
    })
    .sort((a, b) => a.top - b.top);
};
