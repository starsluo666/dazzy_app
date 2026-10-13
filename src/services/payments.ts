import type { DataResponse, PaymentCapabilities } from '@/types/api'

import { request } from './http'

export type ProviderOrderPaymentMode = 'mock' | 'official_account' | 'mobile_app'
export type ActivityPaymentCapability = 'activity_publish' | 'activity_participation'
export type ActivityPaymentMode = 'mock' | 'official_account'

export function getPaymentCapabilities() {
  return request<DataResponse<PaymentCapabilities>>('/payments/capabilities/', {
    skipAuth: true,
  })
}

function isWechatBrowser() {
  return typeof navigator !== 'undefined' && /MicroMessenger/i.test(navigator.userAgent)
}

function currentProviderOrderScene(): 'official_account' | 'mobile_app' | 'unsupported' {
  let scene: 'official_account' | 'mobile_app' | 'unsupported' = 'unsupported'
  // #ifdef H5
  scene = isWechatBrowser() ? 'official_account' : 'unsupported'
  // #endif
  // #ifdef APP-PLUS
  scene = 'mobile_app'
  // #endif
  return scene
}

export async function requireProviderOrderPaymentCapability(): Promise<ProviderOrderPaymentMode> {
  const capabilities = (await getPaymentCapabilities()).data.provider_order
  if (
    import.meta.env.DEV
    && import.meta.env.VITE_ENABLE_MOCK_PAYMENT === 'true'
    && capabilities.mock.available
  ) {
    return 'mock'
  }
  const scene = currentProviderOrderScene()
  if (scene === 'unsupported') {
    throw new Error('当前页面暂不支持支付，请从微信服务号进入后完成支付。')
  }
  const capability = capabilities[scene]
  if (!capability.available) throw new Error(capability.reason || '当前暂不支持此支付方式。')
  return scene
}

export async function requireActivityPaymentCapability(
  capability: ActivityPaymentCapability,
): Promise<ActivityPaymentMode> {
  const item = (await getPaymentCapabilities()).data[capability]
  if (
    import.meta.env.DEV
    && import.meta.env.VITE_ENABLE_MOCK_PAYMENT === 'true'
    && item.mock.available
  ) return 'mock'
  if (!isWechatBrowser()) throw new Error('请从微信服务号进入后完成活动支付。')
  if (item.real.available) return 'official_account'
  throw new Error(item.real.reason || item.mock.reason || '当前活动支付尚未开放。')
}
