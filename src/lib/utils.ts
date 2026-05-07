import { clsx, type ClassValue } from 'clsx'

export const cn = (...inputs: ClassValue[]) => clsx(inputs)

export const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`

export const debounce = <TArgs extends unknown[]>(fn: (...args: TArgs) => void, delay = 400) => {
  let timeout: number | undefined
  return (...args: TArgs) => {
    window.clearTimeout(timeout)
    timeout = window.setTimeout(() => fn(...args), delay)
  }
}

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
