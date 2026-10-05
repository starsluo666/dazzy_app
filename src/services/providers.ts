import { request, uploadFile } from './http'
import type { DataResponse, ProviderApplication, ServiceCategory } from '@/types/api'

export type ProviderApplicationDraft = Pick<
  ProviderApplication,
  | 'application_real_name'
  | 'application_birth_date'
  | 'lifestyle_photo_id'
  | 'service_city_code'
  | 'service_city_name'
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

export const uploadProviderApplicationPhoto = (filePath: string, file?: unknown) =>
  uploadFile<DataResponse<{ id: string; url: string }>>(
    '/media/provider-lifestyle-photos/', filePath, 'file', file,
  )

export const getServiceCategories = () =>
  request<{ data: { items: ServiceCategory[] } }>('/service-categories/', { skipAuth: true })
