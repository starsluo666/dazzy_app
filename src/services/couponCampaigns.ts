import type { CouponCampaign, DataResponse } from '@/types/api'
import { request } from './http'

export const getCouponCampaign = (id: string) => request<DataResponse<CouponCampaign>>(`/coupon-campaigns/${encodeURIComponent(id)}/`)
export const claimCouponCampaign = (id: string) => request<DataResponse<CouponCampaign>>(`/coupon-campaigns/${encodeURIComponent(id)}/claim/`, { method: 'POST' })
