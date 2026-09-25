import type { DataResponse, GrowthCampaign, MyInvitationSummary } from '@/types/api'

import { request } from './http'

const INVITE_CODE_KEY = 'dazzy_pending_invite_code'

export function getGrowthCampaign(inviteCode?: string) {
  return request<DataResponse<GrowthCampaign>>('/growth/campaign/', {
    query: { invite_code: inviteCode || undefined },
  })
}

export function getMyInvitations() {
  return request<DataResponse<MyInvitationSummary>>('/growth/invitations/me/')
}

export function savePendingInviteCode(value?: string) {
  const code = value?.trim()
  if (code) uni.setStorageSync(INVITE_CODE_KEY, code)
}

export function getPendingInviteCode() {
  return String(uni.getStorageSync(INVITE_CODE_KEY) || '')
}

export function clearPendingInviteCode() {
  uni.removeStorageSync(INVITE_CODE_KEY)
}
