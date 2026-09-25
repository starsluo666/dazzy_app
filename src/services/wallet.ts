import type { DataResponse, RechargeCampaign, RechargePaymentSession, UserWallet, WalletRechargeOrder } from '@/types/api'
import { request } from './http'

export function getMyWallet() {
  return request<DataResponse<UserWallet>>('/users/me/wallet/')
}

export function getRechargeCampaign() {
  return request<DataResponse<RechargeCampaign>>('/wallet/recharge-campaign/')
}

export function createRechargeOrder(quantity: number) {
  return request<DataResponse<WalletRechargeOrder>>('/wallet/recharge-orders/', {
    method: 'POST', data: { quantity },
  })
}

export function getRechargeOrders() {
  return request<{ data: { items: WalletRechargeOrder[] } }>('/wallet/recharge-orders/')
}

export function getRechargePaymentAuthorization(orderNo: string) {
  return request<DataResponse<{ authorized: boolean; authorize_url: string }>>(
    `/wallet/recharge-orders/${encodeURIComponent(orderNo)}/payment-authorization/`,
  )
}

export function createRechargePaymentSession(orderNo: string, paymentScene: 'official_account' | 'mobile_app') {
  return request<DataResponse<RechargePaymentSession>>(
    `/wallet/recharge-orders/${encodeURIComponent(orderNo)}/payment-session/`,
    { method: 'POST', data: { payment_scene: paymentScene } },
  )
}

export function confirmRechargePayment(orderNo: string) {
  return request<DataResponse<{ order: WalletRechargeOrder; changed: boolean }>>(
    `/wallet/recharge-orders/${encodeURIComponent(orderNo)}/payment-status/`,
    { method: 'POST' },
  )
}
