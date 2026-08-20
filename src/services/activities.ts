import type { ActivityCategoryItem, ActivityDraftResult, ActivityParticipationResult, DataResponse, ListResponse, MyActivityListItem } from '@/types/api'

import { request } from './http'

export function joinActivity(activityId: number) {
  return request<DataResponse<ActivityParticipationResult>>(
    `/activities/${activityId}/participation/`,
    { method: 'POST' },
  )
}

export function cancelActivityParticipation(activityId: number) {
  return request<void>(`/activities/${activityId}/participation/`, { method: 'DELETE' })
}

export function getMyActivities(options: {
  role: 'joined' | 'organized'
  state: 'all' | 'upcoming' | 'history'
}) {
  return request<ListResponse<MyActivityListItem>>('/activities/mine/', { query: options })
}

export function getActivityCategories() {
  return request<{ data: { items: ActivityCategoryItem[] } }>('/activity-categories/')
}

export interface ActivityDraftPayload {
  category_slug: string
  title: string
  starts_at: string
  ends_at: string
  formation_deadline: string
  meeting_place_name: string
  meeting_address: string
  longitude: number
  latitude: number
  capacity: number
  min_participants: number
  description: string
  participation_rules: string
  aa_principal_amount: number
  refund_template_version: 'standard-v1'
}

export function createActivityDraft(payload: ActivityDraftPayload) {
  return request<DataResponse<ActivityDraftResult>>('/activities/', { method: 'POST', data: payload as unknown as Record<string, unknown> })
}
