import type {
  ActivityDetail,
  ActivityListItem,
  DataResponse,
  HomeCardAssets,
  HomeDiscoveryData,
  ListResponse,
  ProviderDetail,
  ProviderAvailability,
  ProviderListItem,
} from '@/types/api'

import { request } from './http'

const DEMO_LOCATION = {
  longitude: '114.5240070',
  latitude: '36.6074460',
}

interface ProviderQuery {
  category?: string
  ordering?: 'recommended' | 'distance' | 'rating' | 'price'
  page_size?: number
}

interface ActivityQuery {
  category?: string
  ordering?: 'recommended' | 'distance' | 'time' | 'latest'
  page_size?: number
}

export function getRecommendedProviders(query: ProviderQuery = {}) {
  return request<ListResponse<ProviderListItem>>('/providers/', {
    query: { ...DEMO_LOCATION, city_code: '130400', page_size: 8, ...query },
  })
}

export function getNearbyActivities(query: ActivityQuery = {}) {
  return request<ListResponse<ActivityListItem>>('/activities/', {
    query: { ...DEMO_LOCATION, ordering: 'distance', page_size: 3, ...query },
  })
}

export function getHomeCardAssets() {
  return request<DataResponse<HomeCardAssets>>('/content/home-cards/')
}

export function getHomeDiscovery() {
  return request<DataResponse<HomeDiscoveryData>>('/home/', {
    query: { ...DEMO_LOCATION, city_code: '130400' },
  })
}

export function getProviderDetail(publicId: string) {
  return request<DataResponse<ProviderDetail>>(`/providers/${publicId}/`)
}

export function getProviderAvailability(
  publicId: string,
  serviceId: number,
  durationMinutes?: number,
) {
  return request<DataResponse<ProviderAvailability>>(`/providers/${publicId}/availability/`, {
    query: { service_id: serviceId, days: 4, duration_minutes: durationMinutes },
  })
}

export function getActivityDetail(id: number) {
  return request<DataResponse<ActivityDetail>>(`/activities/${id}/`)
}
