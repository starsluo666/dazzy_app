import type {
  DataResponse,
  ListResponse,
  SupportCase,
  SupportCaseReason,
  SupportCaseType,
  SupportTargetType,
} from '@/types/api'

import { request, uploadFile } from './http'

export interface CreateSupportCasePayload {
  case_type: SupportCaseType
  target_type: SupportTargetType
  target_id?: string
  reason: SupportCaseReason
  description: string
  attachment_ids: string[]
  reward_eligible?: boolean
}

export interface RewardReportRules {
  review_timeout_days: number
  coupon_amount: number
  coupon_min_order_amount: number
  coupon_valid_days: number
  eligible_orders: Array<{
    order_no: string
    service_name: string
    provider_name: string
    review_expires_at: string
  }>
}

export function getRewardReportRules() {
  return request<DataResponse<RewardReportRules>>('/support/report-rules/')
}

export function getSupportCases(page = 1, pageSize = 20) {
  return request<ListResponse<SupportCase>>('/support/cases/', {
    query: { page, page_size: pageSize },
  })
}

export function getSupportCase(caseNo: string) {
  return request<DataResponse<SupportCase>>(`/support/cases/${encodeURIComponent(caseNo)}/`)
}

export function createSupportCase(payload: CreateSupportCasePayload) {
  return request<DataResponse<SupportCase> & { created: boolean }>('/support/cases/', {
    method: 'POST', data: { ...payload },
  })
}

export function replySupportCase(caseNo: string, content: string) {
  return request<DataResponse<SupportCase>>(
    `/support/cases/${encodeURIComponent(caseNo)}/reply/`,
    { method: 'POST', data: { content } },
  )
}

export function requestSupportCaseReview(caseNo: string, reason: string) {
  return request<DataResponse<SupportCase>>(
    `/support/cases/${encodeURIComponent(caseNo)}/review/`,
    { method: 'POST', data: { reason } },
  )
}

export function uploadSupportAttachment(filePath: string, file?: unknown) {
  return uploadFile<DataResponse<{ id: string; url: string }>>(
    '/media/support-attachments/', filePath, 'file', file,
  )
}
