import type { ActivityAfterSalesCase, ActivityCategoryItem, ActivityCopySource, ActivityDraftResult, ActivityParticipationCancellationResult, ActivityParticipationCheckout, ActivityParticipationPaymentOrder, ActivityParticipationPaymentResult, ActivityPublishOrder, ActivityPublishRules, ActivityReportReceipt, DataResponse, ListResponse, MyActivityListItem, ProviderOrderPaymentAuthorization, ProviderOrderPaymentSession } from '@/types/api'

import { request, uploadFile } from './http'

export function createActivityParticipationOrder(activityId: number, channel: 'mock_wechat' | 'mock_alipay' | 'wechat') {
  return request<DataResponse<ActivityParticipationCheckout>>(
    `/activities/${activityId}/participation/`,
    { method: 'POST', data: { channel } },
  )
}

export function getActivityParticipationPaymentAuthorization(activityId: number) {
  return request<DataResponse<ProviderOrderPaymentAuthorization>>(
    `/activities/${activityId}/participation/payment-authorization/`,
  )
}

export function createActivityParticipationPaymentSession(activityId: number) {
  return request<DataResponse<ProviderOrderPaymentSession>>(
    `/activities/${activityId}/participation/payment-session/`,
    { method: 'POST' },
  )
}

export function confirmActivityParticipationPaymentStatus(activityId: number) {
  return request<DataResponse<{
    state: 'not_started' | 'processing' | 'failed' | 'paid' | 'refund_pending' | 'refunded' | 'refund_failed'
    payment_order: ActivityParticipationPaymentOrder
    participation_status: string
  }>>(`/activities/${activityId}/participation/payment-status/`, { method: 'POST' })
}

export function simulateActivityParticipationPayment(activityId: number) {
  return request<DataResponse<ActivityParticipationPaymentResult>>(
    `/activities/${activityId}/participation/simulate-payment/`,
    { method: 'POST' },
  )
}

export function cancelActivityParticipation(activityId: number, reason = '用户主动取消报名') {
  return request<DataResponse<ActivityParticipationCancellationResult>>(
    `/activities/${activityId}/participation/`,
    { method: 'DELETE', data: { reason } },
  )
}

export function createActivityAfterSales(activityId: number, reason: string, description: string) {
  return request<DataResponse<ActivityAfterSalesCase>>(`/activities/${activityId}/after-sales/`, {
    method: 'POST', data: { reason, description },
  })
}

export function getActivityAfterSales(activityId: number) {
  return request<{ data: { items: ActivityAfterSalesCase[] } }>(`/activities/${activityId}/after-sales/`)
}

export function cancelOrganizedActivity(activityId: number, reason: string) {
  return request<DataResponse<{ activity_id: number; status: 'cancelled'; refund_no: string; refund_amount: number }>>(
    `/activities/${activityId}/cancel/`, { method: 'POST', data: { reason } },
  )
}

export function getMyActivities(options: {
  role: 'joined' | 'organized'
  state: 'all' | 'upcoming' | 'history'
}) {
  return request<ListResponse<MyActivityListItem>>('/activities/mine/', { query: options })
}

export function getActivityTags(cityCode = '130400') {
  return request<{ data: { items: ActivityCategoryItem[] } }>('/activity-tags/', { query: { city_code: cityCode } })
}

export const getActivityCategories = getActivityTags

export function getActivityPublishRules() {
  return request<DataResponse<ActivityPublishRules>>('/activity-publish-rules/', { skipAuth: true })
}

export function getActivityCopySource(activityId: number) {
  return request<DataResponse<ActivityCopySource>>(`/activities/${activityId}/copy-source/`)
}

export function reportActivity(activityId: number, reason: string, description = '') {
  return request<DataResponse<ActivityReportReceipt>>(`/activities/${activityId}/reports/`, {
    method: 'POST', data: { reason, description },
  })
}

export interface ActivityDraftPayload {
  cover_id?: string
  tag_slugs: string[]
  title: string
  starts_at: string
  ends_at: string
  formation_deadline: string
  meeting_place_name: string
  meeting_address: string
  city_code: string
  city_name: string
  longitude: number
  latitude: number
  capacity: number
  min_participants: number
  description: string
  participation_rules: string
  aa_principal_amount: number
  refund_template_version: 'standard-v1'
}

export function createActivityDraft(payload: ActivityDraftPayload) {
  return request<DataResponse<ActivityDraftResult>>('/activities/', { method: 'POST', data: payload as unknown as Record<string, unknown> })
}

export function uploadActivityCover(filePath: string) {
  return uploadFile<DataResponse<{ id: string; url: string }>>('/media/activity-covers/', filePath)
}

export function createActivityPublishOrder(activityId: number) {
  return request<DataResponse<ActivityPublishOrder>>(`/activities/${activityId}/publish-order/`, { method: 'POST' })
}

export function simulateActivityPublishPayment(activityId: number) {
  return request<DataResponse<ActivityPublishOrder>>(`/activities/${activityId}/publish-order/simulate-payment/`, { method: 'POST' })
}

export function getActivityPublishPaymentAuthorization(activityId: number) {
  return request<DataResponse<ProviderOrderPaymentAuthorization>>(
    `/activities/${activityId}/publish-order/payment-authorization/`,
  )
}

export function createActivityPublishPaymentSession(activityId: number) {
  return request<DataResponse<ProviderOrderPaymentSession>>(
    `/activities/${activityId}/publish-order/payment-session/`,
    { method: 'POST' },
  )
}

export function confirmActivityPublishPaymentStatus(activityId: number) {
  return request<DataResponse<{
    state: 'not_started' | 'processing' | 'failed' | 'paid' | 'refund_pending' | 'refunded' | 'refund_failed'
    publish_order: ActivityPublishOrder
    activity_status: string
  }>>(`/activities/${activityId}/publish-order/payment-status/`, { method: 'POST' })
}
