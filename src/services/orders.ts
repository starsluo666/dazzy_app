import type { DataResponse, ListResponse, MyProviderOrderReview, ProviderOrder, ProviderOrderAfterSalesCase, ProviderOrderAfterSalesCreateType, ProviderOrderPaymentAuthorization, ProviderOrderPaymentSession, ProviderOrderQuote, UserCoupon } from '@/types/api'
import type { BookingDraft } from './bookingDraft'
import { request, uploadFile } from './http'
import { toBusinessDateTime } from '@/utils/businessTime'

function orderPayload(draft: BookingDraft, couponId?: string | null) {
  return {
    service_id: draft.serviceId,
    starts_at: toBusinessDateTime(draft.date, draft.startTime),
    duration_minutes: draft.durationMinutes,
    address_id: draft.addressId,
    note: draft.note,
    ...(draft.pricingToken ? { pricing_token: draft.pricingToken } : {}),
    ...(draft.transportMode ? { transport_mode: draft.transportMode } : {}),
    ...(draft.cancellationPolicyVersion ? { cancellation_policy_version: draft.cancellationPolicyVersion } : {}),
    ...(couponId ? { coupon_id: couponId } : {}),
  }
}

export function previewProviderOrder(draft: BookingDraft, couponId?: string | null) {
  return request<DataResponse<ProviderOrderQuote>>('/provider-orders/preview/', {
    method: 'POST', data: orderPayload(draft, couponId),
  })
}

export function createProviderOrder(draft: BookingDraft, couponId?: string | null) {
  return request<DataResponse<ProviderOrder>>('/provider-orders/', {
    method: 'POST', data: orderPayload(draft, couponId),
  })
}

export function getProviderOrder(orderNo: string) {
  return request<DataResponse<ProviderOrder>>(`/provider-orders/${orderNo}/`)
}

export function getProviderOrders() {
  return request<{ data: { items: ProviderOrder[] } }>('/provider-orders/')
}

export function getProviderOrderAfterSales(orderNo: string) {
  return request<{ data: { items: ProviderOrderAfterSalesCase[] } }>(
    `/provider-orders/${encodeURIComponent(orderNo)}/after-sales/`,
  )
}

export function createProviderOrderAfterSales(
  orderNo: string,
  data: {
    case_type: ProviderOrderAfterSalesCreateType
    requested_amount: number
    reason: string
    evidence_asset_ids: string[]
  },
) {
  return request<DataResponse<ProviderOrderAfterSalesCase>>(
    `/provider-orders/${encodeURIComponent(orderNo)}/after-sales/`,
    { method: 'POST', data },
  )
}

export function uploadProviderOrderAfterSalesEvidence(filePath: string, file?: unknown) {
  return uploadFile<DataResponse<{ id: string; url: string }>>(
    '/media/support-attachments/', filePath, 'file', file,
  )
}

export function cancelProviderOrder(orderNo: string) {
  return request<DataResponse<ProviderOrder>>(`/provider-orders/${orderNo}/cancel/`, { method: 'POST' })
}

export function simulateProviderOrderPayment(orderNo: string) {
  return request<DataResponse<ProviderOrder>>(`/provider-orders/${orderNo}/simulate-payment/`, { method: 'POST' })
}

export function createTerminationRequest(orderNo: string, data: { ended_at: string; reason: string; evidence_asset_ids: string[] }) {
  return request<DataResponse<ProviderOrderAfterSalesCase>>(`/provider-orders/${encodeURIComponent(orderNo)}/termination/`, { method: 'POST', data })
}

export function getMyCoupons() {
  return request<{ data: { items: UserCoupon[] } }>('/users/me/coupons/')
}

export function getProviderOrderPaymentAuthorization(orderNo: string) {
  return request<DataResponse<ProviderOrderPaymentAuthorization>>(
    `/provider-orders/${encodeURIComponent(orderNo)}/payment-authorization/`,
  )
}

export function createProviderOrderPaymentSession(
  orderNo: string,
  paymentScene: 'official_account' | 'mobile_app',
) {
  return request<DataResponse<ProviderOrderPaymentSession>>(
    `/provider-orders/${encodeURIComponent(orderNo)}/payment-session/`,
    { method: 'POST', data: { payment_scene: paymentScene } },
  )
}

export function confirmProviderOrderPaymentStatus(orderNo: string) {
  return request<DataResponse<ProviderOrder>>(
    `/provider-orders/${encodeURIComponent(orderNo)}/payment-status/`,
    { method: 'POST' },
  )
}

export function confirmProviderOrderCompletion(orderNo: string) {
  return request<DataResponse<ProviderOrder>>(`/provider-orders/${orderNo}/confirm-completion/`, {
    method: 'POST',
  })
}

export function uploadReviewImage(filePath: string, file?: unknown) {
  return uploadFile<DataResponse<{ id: string; url: string }>>(
    '/media/review-images/', filePath, 'file', file,
  )
}

export function reviewProviderOrder(
  orderNo: string,
  data: { rating: number; content: string; image_ids: string[]; is_anonymous: boolean },
) {
  return request<DataResponse<ProviderOrder>>(`/provider-orders/${orderNo}/review/`, {
    method: 'POST', data,
  })
}

export function getMyProviderOrderReviews(page = 1, pageSize = 20) {
  return request<ListResponse<MyProviderOrderReview>>('/users/me/provider-reviews/', {
    query: { page, page_size: pageSize },
  })
}
