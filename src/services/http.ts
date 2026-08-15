const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

interface RequestOptions {
  query?: Record<string, string | number | undefined>
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
      method: 'GET',
      timeout: 10000,
      success: (response) => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data as T)
          return
        }
        reject(new Error(`请求失败（${response.statusCode}）`))
      },
      fail: (error) => reject(new Error(error.errMsg || '网络连接失败')),
    })
  })
}
