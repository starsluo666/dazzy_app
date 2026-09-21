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
  ProviderReviewListResponse,
  ServiceCategory,
} from '@/types/api'

import { request } from './http'

interface DiscoveryLocationQuery {
  city_code?: string
  longitude?: string
  latitude?: string
}

interface ProviderQuery extends DiscoveryLocationQuery {
  keyword?: string
  category?: string
  gender?: 'male' | 'female'
  online_only?: 1
  min_rating?: number
  max_price_amount?: number
  ordering?: 'recommended' | 'distance' | 'rating' | 'price'
  page_size?: number
}

interface ActivityQuery extends DiscoveryLocationQuery {
  category?: string
  tags?: string
  keyword?: string
  ordering?: 'recommended' | 'distance' | 'time' | 'latest' | 'popular'
  page_size?: number
}

export function getRecommendedProviders(query: ProviderQuery = {}) {
  return request<ListResponse<ProviderListItem>>('/providers/', {
    query: { page_size: 8, ...query },
  })
}

export function getServiceCategories() {
  return request<{ data: { items: ServiceCategory[] } }>('/service-categories/', {
    skipAuth: true,
  })
}

export function getNearbyActivities(query: ActivityQuery = {}) {
  return request<ListResponse<ActivityListItem>>('/activities/', {
    query: { ordering: 'distance', page_size: 3, ...query },
  })
}

export function getHomeCardAssets() {
  return request<DataResponse<HomeCardAssets>>('/content/home-cards/')
}

export function getHomeDiscovery(query: DiscoveryLocationQuery = {}) {
  return request<DataResponse<HomeDiscoveryData>>('/home/', {
    query: { ...query },
  })
}

export function getProviderDetail(publicId: string) {
  return request<DataResponse<ProviderDetail>>(`/providers/${publicId}/`)
}

export function getProviderReviews(publicId: string, page = 1, pageSize = 3, rating?: number) {
  return request<ProviderReviewListResponse>(`/providers/${publicId}/reviews/`, {
    query: { page, page_size: pageSize, rating }, skipAuth: true,
  })
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
