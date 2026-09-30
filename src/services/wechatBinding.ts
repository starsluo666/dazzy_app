import { request } from './http'
import type { DataResponse } from '@/types/api'

export type WechatBindingChannel = 'official_account' | 'mobile_app'
export interface WechatBindingStatus { bound: boolean; channels: WechatBindingChannel[] }

export function getWechatBindingStatus() {
  return request<DataResponse<WechatBindingStatus>>('/auth/wechat/binding/')
}
export function startWechatH5Binding() {
  return request<DataResponse<{ authorize_url: string; state: string }>>('/auth/wechat/binding/h5/start/', { method: 'POST' })
}
export function completeWechatH5Binding(ticket: string) {
  return request<DataResponse<WechatBindingStatus>>('/auth/wechat/binding/h5/complete/', { method: 'POST', data: { ticket } })
}
export function bindWechatMobile(code: string) {
  return request<DataResponse<WechatBindingStatus>>('/auth/wechat/binding/mobile/', { method: 'POST', data: { code } })
}
