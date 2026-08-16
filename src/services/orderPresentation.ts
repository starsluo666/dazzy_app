export type OrderBucket = 'all' | 'pending_payment' | 'upcoming' | 'active' | 'finished'

const upcoming = ['pending_acceptance', 'pending_support', 'pending_service']
const active = ['departed', 'in_service', 'pending_confirmation']
const finished = ['pending_review', 'completed', 'cancelled', 'after_sales', 'refunded']

export const orderTabs: { key: OrderBucket; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending_payment', label: '待付款' },
  { key: 'upcoming', label: '待服务' },
  { key: 'active', label: '进行中' },
  { key: 'finished', label: '已完成' },
]

export function inOrderBucket(status: string, bucket: OrderBucket) {
  if (bucket === 'all') return true
  if (bucket === 'pending_payment') return status === bucket
  if (bucket === 'upcoming') return upcoming.includes(status)
  if (bucket === 'active') return active.includes(status)
  return finished.includes(status)
}

export function orderStatusCopy(status: string) {
  const map: Record<string, { title: string; description: string; step: number }> = {
    pending_payment: { title: '待支付', description: '请在有效时间内完成支付，超时将释放档期。', step: 0 },
    pending_acceptance: { title: '待接单', description: '订单已支付，等待达人确认接单。', step: 1 },
    pending_support: { title: '待客服处理', description: '客服正在处理订单，请保持电话畅通。', step: 1 },
    pending_service: { title: '待服务', description: '达人已接单，请按时到达集合地点。', step: 2 },
    departed: { title: '达人已出发', description: '达人正在前往集合地点。', step: 3 },
    in_service: { title: '服务中', description: '服务正在进行，请注意安全。', step: 3 },
    pending_confirmation: { title: '待确认', description: '达人已提交完成，请确认服务结果。', step: 4 },
    pending_review: { title: '待评价', description: '服务已完成，期待你的真实评价。', step: 4 },
    completed: { title: '已完成', description: '本次服务已顺利完成。', step: 4 },
    cancelled: { title: '已取消', description: '订单已关闭，档期已经释放。', step: 0 },
    after_sales: { title: '售后中', description: '客服正在处理售后申请。', step: 4 },
    refunded: { title: '已退款', description: '退款已按原支付路径发起。', step: 4 },
  }
  return map[status] || { title: '处理中', description: '订单状态正在更新。', step: 0 }
}
