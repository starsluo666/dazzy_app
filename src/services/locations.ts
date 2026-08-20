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

export function saveAddress(location: LocationItem) {
  return request<DataResponse<LocationItem>>('/addresses/', {
    method: 'POST',
    data: {
      name: location.name,
      address: location.address,
      city_name: location.city_name,
      longitude: location.longitude,
      latitude: location.latitude,
      is_default: false,
    },
  })
}
