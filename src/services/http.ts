const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

interface RequestOptions {
  query?: Record<string, string | number | undefined>
  method?: 'GET' | 'POST' | 'DELETE'
  data?: Record<string, unknown> | string | ArrayBuffer
}

export function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const query = Object.entries(options.query || {})
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&')
  const url = `${API_BASE_URL}${path}${query ? `?${query}` : ''}`

  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...(import.meta.env.VITE_DEMO_USER_PUBLIC_ID
          ? { 'X-Dazzy-Demo-User': import.meta.env.VITE_DEMO_USER_PUBLIC_ID }
          : {}),
      },
      timeout: 10000,
      success: (response) => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data as T)
          return
        }
        const body = response.data as Record<string, unknown> | undefined
        const firstError = body && Object.values(body).find((value) => typeof value === 'string' || Array.isArray(value))
        const message = typeof firstError === 'string'
          ? firstError
          : Array.isArray(firstError) && typeof firstError[0] === 'string' ? firstError[0] : undefined
        reject(new Error(message || `请求失败（${response.statusCode}）`))
      },
      fail: (error) => reject(new Error(error.errMsg || '网络连接失败')),
    })
  })
}
