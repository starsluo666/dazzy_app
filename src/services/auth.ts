import type { AuthSession, CurrentUser, CurrentUserOverview, DataResponse, SmsPurpose } from '@/types/api'

import { request, uploadFile } from './http'
import { clearSession, getRefreshToken, saveSession } from './session'

export function sendSmsCode(phone: string, purpose: SmsPurpose) {
  return request<DataResponse<{ expires_in: number; retry_after: number; debug_code?: string }>>(
    '/auth/sms-codes/', { method: 'POST', data: { phone, purpose }, skipAuth: true },
  )
}

export async function loginWithPassword(phone: string, password: string) {
  const response = await request<DataResponse<AuthSession>>('/auth/login/password/', {
    method: 'POST', data: { phone, password }, skipAuth: true,
  })
  saveSession(response.data)
  return response.data
}

export async function loginWithSms(phone: string, code: string) {
  const response = await request<DataResponse<AuthSession>>('/auth/login/sms/', {
    method: 'POST', data: { phone, code }, skipAuth: true,
  })
  saveSession(response.data)
  return response.data
}

export async function register(phone: string, code: string, password: string) {
  const response = await request<DataResponse<AuthSession>>('/auth/register/', {
    method: 'POST', data: { phone, code, password }, skipAuth: true,
  })
  saveSession(response.data)
  return response.data
}

export function resetPassword(phone: string, code: string, newPassword: string) {
  return request<DataResponse<{ reset: boolean }>>('/auth/password/reset/', {
    method: 'POST', data: { phone, code, new_password: newPassword }, skipAuth: true,
  })
}

export function getCurrentUser() {
  return request<DataResponse<CurrentUser>>('/users/me/')
}

export function updateCurrentUser(payload: Pick<CurrentUser, 'nickname' | 'gender' | 'birth_date'>) {
  return request<DataResponse<CurrentUser>>('/users/me/', {
    method: 'PATCH', data: payload as unknown as Record<string, unknown>,
  })
}

export function uploadAvatar(filePath: string, file?: unknown) {
  return uploadFile<DataResponse<{ id: string; url: string }>>('/media/avatars/', filePath, 'file', file)
}

export function getCurrentUserOverview() {
  return request<DataResponse<CurrentUserOverview>>('/users/me/overview/')
}

export async function logout() {
  const refresh = getRefreshToken()
  try {
    if (refresh) await request<void>('/auth/logout/', { method: 'POST', data: { refresh } })
  } catch {
    // Remote logout is best-effort; local credentials must always be removed.
  } finally {
    clearSession()
  }
}
