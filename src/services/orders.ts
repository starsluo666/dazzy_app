import type { DataResponse, ListResponse, MyProviderOrderReview, ProviderManagedOrder, ProviderOrder, ProviderOrderAfterSalesCase, ProviderOrderAfterSalesCreateType, ProviderOrderQuote } from '@/types/api'
import type { BookingDraft } from './bookingDraft'
import { request, uploadFile } from './http'

function orderPayload(draft: BookingDraft) {
  const localStart = new Date(`${draft.date}T${draft.startTime}:00`)
  return {
    service_id: draft.serviceId,
    starts_at: localStart.toISOString(),
    duration_minutes: draft.durationMinutes,
    address_id: draft.addressId,
    note: draft.note,
  }
}

export function previewProviderOrder(draft: BookingDraft) {
  return request<DataResponse<ProviderOrderQuote>>('/provider-orders/preview/', {
    method: 'POST', data: orderPayload(draft),
  })
}

export function createProviderOrder(draft: BookingDraft) {
  return request<DataResponse<ProviderOrder>>('/provider-orders/', {
    method: 'POST', data: orderPayload(draft),
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

export function getManagedProviderOrders(status = '') {
  const query = status ? `?status=${encodeURIComponent(status)}` : ''
  return request<{ data: { items: ProviderManagedOrder[] } }>(`/providers/me/orders/${query}`)
}

export function acceptManagedProviderOrder(orderNo: string) {
  return request<DataResponse<ProviderManagedOrder>>(`/providers/me/orders/${orderNo}/accept/`, {
    method: 'POST',
  })
}

export function departManagedProviderOrder(orderNo: string) {
  return request<DataResponse<ProviderManagedOrder>>(`/providers/me/orders/${orderNo}/depart/`, {
    method: 'POST',
  })
}

export function uploadManagedOrderEvidence(filePath: string, file?: unknown) {
  return uploadFile<DataResponse<{ id: string; url: string }>>(
    '/media/order-evidence/', filePath, 'file', file,
  )
}

export function attachManagedOrderArrivalEvidence(
  orderNo: string,
  evidence: { photo_id: string; longitude: number; latitude: number; accuracy_m?: number },
) {
  return request<DataResponse<ProviderManagedOrder>>(
    `/providers/me/orders/${orderNo}/arrival-evidence/`,
    { method: 'POST', data: evidence },
  )
}

export function startManagedProviderOrder(orderNo: string) {
  return request<DataResponse<ProviderManagedOrder>>(`/providers/me/orders/${orderNo}/start/`, {
    method: 'POST',
  })
}

export function completeManagedProviderOrder(orderNo: string) {
  return request<DataResponse<ProviderManagedOrder>>(`/providers/me/orders/${orderNo}/complete/`, {
    method: 'POST',
  })
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
