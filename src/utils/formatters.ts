const pad2 = (value: number) => String(value).padStart(2, '0')

export function formatAmount(amount: number, fractionDigits?: number) {
  const digits = fractionDigits ?? (amount % 100 === 0 ? 0 : 2)
  return (amount / 100).toFixed(digits)
}

export function formatDistance(distance: number | null) {
  return distance === null ? '距离未知' : `${distance.toFixed(1)}km`
}

export function formatActivityTime(value: string) {
  const date = new Date(value)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

export function formatActivityRange(start: string, end: string) {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][startDate.getDay()]
  return `${pad2(startDate.getMonth() + 1)}-${pad2(startDate.getDate())}（${week}）${pad2(startDate.getHours())}:${pad2(startDate.getMinutes())}–${pad2(endDate.getHours())}:${pad2(endDate.getMinutes())}`
}

export function formatMonthDay(value: Date) {
  return `${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`
}

export function getErrorMessage(reason: unknown, fallback = '加载失败') {
  return reason instanceof Error ? reason.message : fallback
}
