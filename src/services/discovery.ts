import type { ActivityListItem, ListResponse, ProviderListItem } from '@/types/api'

import { request } from './http'

const DEMO_LOCATION = {
  longitude: '116.4039810',
  latitude: '39.9150010',
}

export function getRecommendedProviders() {
  return request<ListResponse<ProviderListItem>>('/providers/', {
    query: { ...DEMO_LOCATION, city_code: '110100', page_size: 8 },
  })
}

export function getNearbyActivities() {
  return request<ListResponse<ActivityListItem>>('/activities/', {
    query: { ...DEMO_LOCATION, ordering: 'distance', page_size: 3 },
  })
}
