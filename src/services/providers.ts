import { request } from './http'
import type { DataResponse, ProviderApplication, ServiceCategory } from '@/types/api'

export type ProviderApplicationDraft = Pick<
  ProviderApplication,
  | 'bio'
  | 'service_city_code'
  | 'service_city_name'
  | 'max_service_radius_km'
  | 'invitation_code'
>

export const getProviderApplication = () =>
  request<DataResponse<ProviderApplication | null>>('/providers/me/application/')

export const saveProviderApplication = (data: ProviderApplicationDraft) =>
  request<DataResponse<ProviderApplication>>('/providers/me/application/', { method: 'PATCH', data })

export const submitProviderApplication = () =>
  request<DataResponse<ProviderApplication>>('/providers/me/application/submit/', {
    method: 'POST', data: { agreement_accepted: true },
  })

export const getServiceCategories = () =>
  request<{ data: { items: ServiceCategory[] } }>('/service-categories/', { skipAuth: true })
