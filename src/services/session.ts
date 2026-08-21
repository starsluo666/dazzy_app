import type { AuthSession } from '@/types/api'

const ACCESS_TOKEN_KEY = 'dazzy.accessToken'
const REFRESH_TOKEN_KEY = 'dazzy.refreshToken'
const USER_KEY = 'dazzy.currentUser'

export function getAccessToken(): string {
  return uni.getStorageSync(ACCESS_TOKEN_KEY) || ''
}

export function getRefreshToken(): string {
  return uni.getStorageSync(REFRESH_TOKEN_KEY) || ''
}

export function saveSession(session: AuthSession) {
  uni.setStorageSync(ACCESS_TOKEN_KEY, session.access)
  uni.setStorageSync(REFRESH_TOKEN_KEY, session.refresh)
  uni.setStorageSync(USER_KEY, session.user)
}

export function updateTokens(access: string, refresh?: string) {
  uni.setStorageSync(ACCESS_TOKEN_KEY, access)
  if (refresh) uni.setStorageSync(REFRESH_TOKEN_KEY, refresh)
}

export function clearSession() {
  uni.removeStorageSync(ACCESS_TOKEN_KEY)
  uni.removeStorageSync(REFRESH_TOKEN_KEY)
  uni.removeStorageSync(USER_KEY)
}

export function isAuthenticated(): boolean {
  return Boolean(getAccessToken())
}
