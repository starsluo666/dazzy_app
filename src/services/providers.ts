import { request, uploadFile } from './http'
import type { DataResponse, ProviderApplication, ProviderManagedService, ProviderScheduleDay, ProviderWorkbench, ServiceCategory } from '@/types/api'

export type ProviderApplicationDraft = Pick<
  ProviderApplication,
  | 'bio'
  | 'lifestyle_photo_id'
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

export const uploadProviderLifestylePhoto = (filePath: string, file?: unknown) =>
  uploadFile<DataResponse<{ id: string; url: string }>>(
    '/media/provider-lifestyle-photos/', filePath, 'file', file,
  )

export const getServiceCategories = () =>
  request<{ data: { items: ServiceCategory[] } }>('/service-categories/', { skipAuth: true })

export const getMyProviderServices = () =>
  request<{ data: { items: ProviderManagedService[] } }>('/providers/me/services/')

export const createMyProviderService = (data: Record<string, unknown>) =>
  request<DataResponse<ProviderManagedService>>('/providers/me/services/', { method: 'POST', data })

export const updateMyProviderService = (id: number, data: Record<string, unknown>) =>
  request<DataResponse<ProviderManagedService>>(`/providers/me/services/${id}/`, { method: 'PATCH', data })

export const disableMyProviderService = (id: number) =>
  request<void>(`/providers/me/services/${id}/`, { method: 'DELETE' })

export const getProviderWorkbench = () =>
  request<DataResponse<ProviderWorkbench>>('/providers/me/workbench/')

export const updateAcceptingOrders = (is_accepting_orders: boolean) =>
  request<DataResponse<{ is_accepting_orders: boolean }>>('/providers/me/workbench/', {
    method: 'PATCH', data: { is_accepting_orders },
  })

export const getProviderSchedule = (startDate: string, days = 7) =>
  request<DataResponse<{ start_date: string; days: ProviderScheduleDay[] }>>('/providers/me/schedule/', {
    query: { start_date: startDate, days },
  })

export const addProviderSchedulePeriod = (data: Record<string, unknown>) =>
  request<DataResponse<{ ids: string[] }>>('/providers/me/schedule/', { method: 'POST', data })

export const deleteProviderSchedulePeriod = (id: string) =>
  request<void>(`/providers/me/schedule/periods/${id}/`, { method: 'DELETE' })

export const setProviderScheduleDayClosed = (date: string, is_closed: boolean) =>
  request<DataResponse<{ date: string; is_closed: boolean }>>(`/providers/me/schedule/days/${date}/`, {
    method: 'PUT', data: { is_closed },
  })
