import type { BrowsingHistoryItem, DataResponse, ListResponse, ProviderListItem } from '@/types/api'
import { request } from './http'

export const getFavoriteProviders = (page = 1) => request<ListResponse<ProviderListItem>>('/favorites/providers/', { query: { page, page_size: 20 } })
export const favoriteProvider = (publicId: string) => request<DataResponse<{ is_favorited: true; created_at: string }>>(`/providers/${publicId}/favorite/`, { method: 'POST' })
export const unfavoriteProvider = (publicId: string) => request<void>(`/providers/${publicId}/favorite/`, { method: 'DELETE' })
export const recordProviderView = (publicId: string) => request(`/providers/${publicId}/history/`, { method: 'POST' })
export const recordActivityView = (id: number) => request(`/activities/${id}/history/`, { method: 'POST' })
export const getBrowsingHistory = (type: 'all' | 'provider' | 'activity' = 'all') => request<ListResponse<BrowsingHistoryItem>>('/browsing-history/', { query: { type, page_size: 50 } })
export const deleteBrowsingHistory = (id: number) => request<void>(`/browsing-history/${id}/`, { method: 'DELETE' })
export const clearBrowsingHistory = () => request<void>('/browsing-history/', { method: 'DELETE' })
