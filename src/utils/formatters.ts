import { businessTimeParts } from './businessTime'

const pad2 = (value: number) => String(value).padStart(2, '0')

export function formatAmount(amount: number, fractionDigits?: number) {
  const digits = fractionDigits ?? (amount % 100 === 0 ? 0 : 2)
  return (amount / 100).toFixed(digits)
}

export function formatDistance(distance: number | null) {
  return distance === null ? '距离未知' : `${distance.toFixed(1)}km`
}

export function formatActivityTime(value: string) {
  const parts = businessTimeParts(value)
  return `${parts.month}月${parts.day}日 ${pad2(parts.hour)}:${pad2(parts.minute)}`
}

export function formatActivityRange(start: string, end: string) {
  const startParts = businessTimeParts(start)
  const endParts = businessTimeParts(end)
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][startParts.weekday]
  return `${pad2(startParts.month)}-${pad2(startParts.day)}（${week}）${pad2(startParts.hour)}:${pad2(startParts.minute)}–${pad2(endParts.hour)}:${pad2(endParts.minute)}`
}

export function formatBusinessDateTime(value: string) {
  const parts = businessTimeParts(value)
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)} ${pad2(parts.hour)}:${pad2(parts.minute)}`
}

export function formatBusinessDate(value: string) {
  const parts = businessTimeParts(value)
  return `${parts.year}年${parts.month}月${parts.day}日`
}

export function formatOrderTimeRange(start: string, end: string) {
  const startParts = businessTimeParts(start)
  const endParts = businessTimeParts(end)
  return `${pad2(startParts.month)}月${pad2(startParts.day)}日 ${pad2(startParts.hour)}:${pad2(startParts.minute)}—${pad2(endParts.hour)}:${pad2(endParts.minute)}`
}

export function formatMonthDay(value: Date) {
  const parts = businessTimeParts(value)
  return `${pad2(parts.month)}-${pad2(parts.day)}`
}

export function getErrorMessage(reason: unknown, fallback = '加载失败') {
  return reason instanceof Error ? reason.message : fallback
}
