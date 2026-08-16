import type { DataResponse, ProviderOrder, ProviderOrderQuote } from '@/types/api'
import type { BookingDraft } from './bookingDraft'
import { request } from './http'

function orderPayload(draft: BookingDraft) {
  const localStart = new Date(`${draft.date}T${draft.startTime}:00`)
  return {
    service_id: draft.serviceId,
    starts_at: localStart.toISOString(),
    duration_minutes: draft.durationMinutes,
    meeting_address: draft.address,
    route_distance_km: draft.routeDistanceKm ?? undefined,
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
