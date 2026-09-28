import { ApiError } from './http'

/** A recovered order is confirmed by the backend, never by a client payment callback. */
export async function handlePaymentRecovery(
  reason: unknown,
  refreshStatus: () => Promise<void>,
): Promise<boolean> {
  if (!(reason instanceof ApiError)) return false
  if (reason.code === 'huifu_payment_status_updated') {
    try { await refreshStatus() } catch (error) {
      uni.showToast({ title: error instanceof Error ? error.message : '请重新进入订单查看支付结果', icon: 'none' })
    }
    return true
  }
  if (reason.code === 'huifu_payment_pending_confirmation' || reason.code === 'huifu_payment_closed') {
    uni.showModal({
      title: reason.code === 'huifu_payment_closed' ? '原支付已结束' : '支付结果核对中',
      content: reason.message,
      showCancel: false,
      confirmText: '知道了',
    })
    return true
  }
  return false
}

type WechatBridgeResult = { err_msg?: string }
type WechatBridge = {
  invoke: (
    method: string,
    params: Record<string, string | number>,
    callback: (result: WechatBridgeResult) => void,
  ) => void
}

export function isWechatBrowser() {
  return typeof navigator !== 'undefined' && /MicroMessenger/i.test(navigator.userAgent)
}

function currentWechatBridge() {
  return typeof window === 'undefined'
    ? undefined
    : (window as typeof window & { WeixinJSBridge?: WechatBridge }).WeixinJSBridge
}

function waitWechatBridge() {
  const current = currentWechatBridge()
  if (current) return Promise.resolve(current)
  return new Promise<WechatBridge>((resolve, reject) => {
    if (typeof document === 'undefined') {
      reject(new Error('当前环境无法调起微信支付'))
      return
    }
    const onReady = () => {
      window.clearTimeout(timeout)
      const bridge = currentWechatBridge()
      if (bridge) resolve(bridge)
      else reject(new Error('微信支付组件不可用'))
    }
    const timeout = window.setTimeout(() => {
      document.removeEventListener('WeixinJSBridgeReady', onReady)
      reject(new Error('微信支付组件加载超时，请刷新后重试'))
    }, 8000)
    document.addEventListener('WeixinJSBridgeReady', onReady, { once: true })
  })
}

export async function invokeWechatPay(payInfo: Record<string, string | number>) {
  const bridge = await waitWechatBridge()
  await new Promise<void>((resolve, reject) => {
    bridge.invoke('getBrandWCPayRequest', payInfo, (result) => {
      const message = (result.err_msg || '').toLowerCase()
      if (message === 'get_brand_wcpay_request:ok') {
        resolve()
        return
      }
      if (message === 'get_brand_wcpay_request:cancel') {
        reject(new Error('已取消支付'))
        return
      }
      reject(new Error('微信支付未完成，请稍后重试'))
    })
  })
}
