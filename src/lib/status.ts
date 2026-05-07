import { differenceInCalendarDays, isAfter, isBefore } from 'date-fns'
import { parseDate, today } from './date'
import type { Task, TaskStatus } from '../models/types'

export const computeTaskStatus = (task: Task): TaskStatus => {
  if (task.progressPercent >= 100) return 'Done'

  const now = today()
  const start = parseDate(task.startDate)
  const end = parseDate(task.endDate)
  const expectedStart = parseDate(task.expectedStartDate)
  const expectedEnd = parseDate(task.expectedEndDate)

  if (isBefore(now, start) && task.progressPercent === 0) return 'Not Started'
  if (isAfter(now, end)) return 'Overdue'
  if (task.blockedReason.trim()) return 'At Risk'

  const totalDuration = Math.max(1, differenceInCalendarDays(expectedEnd, expectedStart) + 1)
  const elapsedDuration = Math.min(totalDuration, Math.max(0, differenceInCalendarDays(now, expectedStart) + 1))
  const expectedProgress = (elapsedDuration / totalDuration) * 100
  const delta = task.progressPercent - expectedProgress

  if (delta >= 15) return 'Ahead'
  if (delta <= -30) return 'Delayed'
  if (delta <= -12) return 'At Risk'
  return 'On Track'
}

export const statusTone: Record<TaskStatus, string> = {
  'Not Started': 'text-slate-300 bg-slate-500/15 border-slate-400/20',
  'On Track': 'text-cyan-200 bg-cyan-500/15 border-cyan-400/20',
  Ahead: 'text-emerald-200 bg-emerald-500/15 border-emerald-400/20',
  'At Risk': 'text-amber-200 bg-amber-500/15 border-amber-400/20',
  Delayed: 'text-orange-200 bg-orange-500/15 border-orange-400/20',
  Overdue: 'text-rose-200 bg-rose-500/15 border-rose-400/20',
  Done: 'text-emerald-100 bg-emerald-500/20 border-emerald-300/20',
}
