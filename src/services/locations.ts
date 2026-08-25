import type { DataResponse, LocationItem } from '@/types/api'
import { request } from './http'

export function searchLocations(keyword: string, region = '邯郸市') {
  return request<{ data: { items: LocationItem[] } }>('/locations/search/', {
    query: { keyword, region },
  })
}

export function getSavedAddresses() {
  return request<{ data: { items: LocationItem[] } }>('/addresses/')
}

export function getAddress(addressId: number) {
  return request<DataResponse<LocationItem>>(`/addresses/${addressId}/`)
}

export function createAddress(location: LocationItem) {
  return request<DataResponse<LocationItem>>('/addresses/', {
    method: 'POST', data: addressPayload(location),
  })
}

export function updateAddress(addressId: number, location: LocationItem) {
  return request<DataResponse<LocationItem>>(`/addresses/${addressId}/`, {
    method: 'PATCH', data: addressPayload(location),
  })
}

export function setDefaultAddress(addressId: number) {
  return request<DataResponse<LocationItem>>(`/addresses/${addressId}/`, {
    method: 'PATCH', data: { is_default: true },
  })
}

export function deleteAddress(addressId: number) {
  return request<void>(`/addresses/${addressId}/`, { method: 'DELETE' })
}

function addressPayload(location: LocationItem): Record<string, unknown> {
  return {
    name: location.name,
    address: location.address,
    city_name: location.city_name,
    contact_name: location.contact_name,
    contact_gender: location.contact_gender,
    contact_phone: location.contact_phone,
    longitude: location.longitude,
    latitude: location.latitude,
    is_default: Boolean(location.is_default),
  }
}
