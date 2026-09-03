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
  return Boolean(getAccessToken() || import.meta.env.VITE_DEMO_USER_PUBLIC_ID)
}

const protectedRoutes = [
  '/pages/booking/confirm',
  '/pages/booking/payment',
  '/pages/booking/success',
  '/pages/orders/list',
  '/pages/orders/detail',
  '/pages/activities/mine',
  '/pages/activities/publish-payment',
  '/pages/publish/index',
  '/pages/messages/index',
  '/pages/settings/index',
  '/pages/profile/edit',
  '/pages/addresses/index',
  '/pages/addresses/edit',
  '/pages/addresses/search',
  '/pages/favorites/index',
  '/pages/history/index',
  '/pages/reviews/index',
  '/pages/providers/apply',
  '/pages/providers/services',
  '/pages/providers/schedule',
  '/pages/providers/orders',
]

let redirectingToLogin = false

function normalizeUrl(url: string): string {
  return url.startsWith('/') ? url : `/${url}`
}

export function isProtectedRoute(url: string): boolean {
  const path = normalizeUrl(url).split('?')[0]
  return protectedRoutes.includes(path)
}

export function currentPageUrl(): string {
  const pages = getCurrentPages()
  const page = pages[pages.length - 1] as { route?: string; options?: Record<string, unknown> } | undefined
  if (!page?.route) return '/pages/index/index'
  const query = Object.entries(page.options || {})
    .filter(([, value]) => value != null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&')
  return `/${page.route}${query ? `?${query}` : ''}`
}

export function loginUrl(returnUrl = currentPageUrl()): string {
  return `/pages/auth/login?redirect=${encodeURIComponent(normalizeUrl(returnUrl))}`
}

export function requireAuthentication(returnUrl = currentPageUrl()): boolean {
  if (isAuthenticated()) return true
  if (!redirectingToLogin) {
    redirectingToLogin = true
    uni.navigateTo({
      url: loginUrl(returnUrl),
      complete: () => setTimeout(() => { redirectingToLogin = false }, 300),
    })
  }
  return false
}

function safeReturnUrl(value?: string): string {
  if (!value || !value.startsWith('/pages/') || value.includes('://') || value.startsWith('/pages/auth/')) {
    return '/pages/profile/index'
  }
  return value
}

export function returnAfterAuthentication(returnUrl?: string) {
  uni.reLaunch({ url: safeReturnUrl(returnUrl) })
}

export function guardCurrentPage(): boolean {
  const url = currentPageUrl()
  return !isProtectedRoute(url) || requireAuthentication(url)
}

export function installAuthenticationGuards() {
  const guard = (args: { url?: string }) => {
    if (!args.url || !isProtectedRoute(args.url) || isAuthenticated()) return true
    args.url = loginUrl(args.url)
    return true
  }
  uni.addInterceptor('navigateTo', { invoke: guard })
  uni.addInterceptor('redirectTo', { invoke: guard })
  uni.addInterceptor('reLaunch', { invoke: guard })
}
