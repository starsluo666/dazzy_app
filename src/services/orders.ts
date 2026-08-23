import type { DataResponse, ProviderManagedOrder, ProviderOrder, ProviderOrderQuote } from '@/types/api'
import type { BookingDraft } from './bookingDraft'
import { request, uploadFile } from './http'

function orderPayload(draft: BookingDraft) {
  const localStart = new Date(`${draft.date}T${draft.startTime}:00`)
  return {
    service_id: draft.serviceId,
    starts_at: localStart.toISOString(),
    duration_minutes: draft.durationMinutes,
    meeting_address: [draft.addressName, draft.address]
      .filter((value, index, values) => value && values.indexOf(value) === index)
      .join('，'),
    longitude: draft.longitude ?? undefined,
    latitude: draft.latitude ?? undefined,
    contact_name: draft.contactName,
    contact_phone: draft.contactPhone,
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
