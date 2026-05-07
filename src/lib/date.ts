import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfDay,
  startOfWeek,
} from 'date-fns'

export const today = () => startOfDay(new Date())
export const iso = (value: Date) => format(value, 'yyyy-MM-dd')
export const parseDate = (value: string) => startOfDay(parseISO(value))
export const shortDate = (value: string) => format(parseDate(value), 'MMM d')
export const fullDate = (value: string) => format(parseDate(value), 'MMM d, yyyy')
export const dayOffset = (value: string, from = today()) => differenceInCalendarDays(parseDate(value), from)
export const betweenDays = (start: string, end: string) => eachDayOfInterval({ start: parseDate(start), end: parseDate(end) })
export const isPast = (value: string) => isBefore(parseDate(value), today())
export const isFuture = (value: string) => isAfter(parseDate(value), today())
export const isToday = (value: string) => isSameDay(parseDate(value), today())
export const weekRange = () => {
  const start = startOfWeek(today(), { weekStartsOn: 1 })
  const end = endOfWeek(today(), { weekStartsOn: 1 })
  return { start, end }
}
export const nextDays = (days: number) => iso(addDays(today(), days))
