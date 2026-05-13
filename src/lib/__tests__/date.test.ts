import { describe, it, expect } from "vitest";
import {
  today,
  iso,
  parseDate,
  shortDate,
  fullDate,
  dayOffset,
  isPast,
  isFuture,
  isToday,
  weekRange,
  nextDays,
} from "../date";
import { addDays, subDays, format } from "date-fns";

describe("today", () => {
  it("returns start of today", () => {
    const result = today();
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
    // Verify the date components match today's local date
    const now = new Date();
    expect(result.getFullYear()).toBe(now.getFullYear());
    expect(result.getMonth()).toBe(now.getMonth());
    expect(result.getDate()).toBe(now.getDate());
  });
});

describe("iso", () => {
  it("formats a date as yyyy-MM-dd", () => {
    const date = new Date(2026, 0, 15); // Jan 15, 2026
    expect(iso(date)).toBe("2026-01-15");
  });
});

describe("parseDate", () => {
  it("parses an ISO string to start of day", () => {
    const result = parseDate("2026-05-13");
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
  });
});

describe("shortDate", () => {
  it("formats as MMM d", () => {
    expect(shortDate("2026-05-13")).toBe("May 13");
    expect(shortDate("2026-01-05")).toBe("Jan 5");
  });
});

describe("fullDate", () => {
  it("formats as MMM d, yyyy", () => {
    expect(fullDate("2026-05-13")).toBe("May 13, 2026");
  });
});

describe("dayOffset", () => {
  it("returns 0 for today", () => {
    const todayStr = iso(new Date());
    expect(dayOffset(todayStr)).toBe(0);
  });

  it("returns positive for future dates", () => {
    const future = iso(addDays(new Date(), 5));
    expect(dayOffset(future)).toBe(5);
  });

  it("returns negative for past dates", () => {
    const past = iso(subDays(new Date(), 3));
    expect(dayOffset(past)).toBe(-3);
  });
});

describe("isPast", () => {
  it("returns true for yesterday", () => {
    expect(isPast(iso(subDays(new Date(), 1)))).toBe(true);
  });

  it("returns false for tomorrow", () => {
    expect(isPast(iso(addDays(new Date(), 1)))).toBe(false);
  });

  it("returns false for today", () => {
    expect(isPast(iso(new Date()))).toBe(false);
  });
});

describe("isFuture", () => {
  it("returns true for tomorrow", () => {
    expect(isFuture(iso(addDays(new Date(), 1)))).toBe(true);
  });

  it("returns false for yesterday", () => {
    expect(isFuture(iso(subDays(new Date(), 1)))).toBe(false);
  });

  it("returns false for today", () => {
    expect(isFuture(iso(new Date()))).toBe(false);
  });
});

describe("isToday", () => {
  it("returns true for today", () => {
    expect(isToday(iso(new Date()))).toBe(true);
  });

  it("returns false for tomorrow", () => {
    expect(isToday(iso(addDays(new Date(), 1)))).toBe(false);
  });
});

describe("weekRange", () => {
  it("returns start and end of the current week (Monday start)", () => {
    const { start, end } = weekRange();
    expect(start.getDay()).toBe(1); // Monday
    expect(end.getDay()).toBe(0); // Sunday
    expect(end.getTime()).toBeGreaterThan(start.getTime());
  });
});

describe("nextDays", () => {
  it("returns an ISO string for N days from now", () => {
    const result = nextDays(3);
    const expected = format(addDays(new Date(), 3), "yyyy-MM-dd");
    expect(result).toBe(expected);
  });

  it("returns today for 0 days", () => {
    expect(nextDays(0)).toBe(iso(new Date()));
  });
});
