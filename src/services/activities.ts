import type { ActivityParticipationResult, DataResponse, ListResponse, MyActivityListItem } from '@/types/api'

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
