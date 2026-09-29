import { getSavedAddresses } from './locations'
import { isAuthenticated } from './session'
import { request } from './http'

export interface DiscoveryCity { city_code: string; city_name: string }
export interface DiscoveryContext {
  cityCode: string
  cityName: string
  longitude?: string
  latitude?: string
  source: 'default' | 'manual' | 'address' | 'location'
}

const STORAGE_KEY = 'dazzy.discoveryCity'
const CITY_CACHE_KEY = 'dazzy.discoveryCities'
let currentLocation: (DiscoveryContext & { expiresAt: number }) | null = null
let citiesRequest: Promise<DiscoveryCity[]> | null = null
let selectionVersion = 0

export async function getDiscoveryCities(): Promise<DiscoveryCity[]> {
  if (!citiesRequest) {
    citiesRequest = request<{ data: { items: DiscoveryCity[] } }>('/locations/cities/', { skipAuth: true })
      .then(response => {
        uni.setStorageSync(CITY_CACHE_KEY, response.data.items)
        return response.data.items
      }).finally(() => { citiesRequest = null })
  }
  return citiesRequest
}

function cachedCities(): DiscoveryCity[] {
  const cities = uni.getStorageSync(CITY_CACHE_KEY)
  return Array.isArray(cities) ? cities : []
}

export function getDiscoveryContext(): DiscoveryContext {
  const saved = uni.getStorageSync(STORAGE_KEY) as Partial<DiscoveryContext> | undefined
  const cities = cachedCities()
  const city = cities.find(city => city.city_code === saved?.cityCode) || cities[0]
  if (!city) return { cityCode: '', cityName: '选择城市', source: 'default' }
  if (currentLocation && currentLocation.cityCode === city.city_code && currentLocation.expiresAt > Date.now()) {
    return { ...currentLocation, cityName: city.city_name }
  }
  return {
    cityCode: city.city_code, cityName: city.city_name,
    source: saved?.source === 'manual' && saved.cityCode === city.city_code ? 'manual' : 'default',
  }
}

export function selectDiscoveryCity(city: DiscoveryCity): DiscoveryContext {
  selectionVersion++
  currentLocation = null
  const context: DiscoveryContext = { cityCode: city.city_code, cityName: city.city_name, source: 'manual' }
  // Never persist precise device coordinates; old city-center coordinates are discarded.
  uni.setStorageSync(STORAGE_KEY, context)
  return context
}

export async function resolveDiscoveryContext(): Promise<DiscoveryContext> {
  const cities = await getDiscoveryCities()
  if (!cities.length) throw new Error('暂未开通城市，请稍后再试')
  let selected = getDiscoveryContext()
  if (selected.source === 'location' || !isAuthenticated()) return selected
  try {
    const addresses = (await getSavedAddresses()).data.items
    selected = getDiscoveryContext()
    if (selected.source === 'location') return selected
    const address = addresses.find(item => item.is_default) || addresses[0]
    const addressCity = address && cities.find(city =>
      city.city_name.replace(/市$/, '') === address.city_name.trim().replace(/市$/, ''))
    if (!address || !addressCity || (selected.source === 'manual' && selected.cityCode !== addressCity.city_code)) return selected
    if (!validCoordinates(address.longitude, address.latitude)) return selected
    if (selected.source !== 'manual') {
      uni.setStorageSync(STORAGE_KEY, { cityCode: addressCity.city_code, cityName: addressCity.city_name, source: 'address' })
    }
    return {
      cityCode: addressCity.city_code, cityName: addressCity.city_name,
      longitude: Number(address.longitude).toFixed(7), latitude: Number(address.latitude).toFixed(7), source: 'address',
    }
  } catch { return getDiscoveryContext() }
}

function validCoordinates(longitude: unknown, latitude: unknown) {
  if (longitude == null || latitude == null || longitude === '' || latitude === '') return false
  const lng = Number(longitude), lat = Number(latitude)
  return Number.isFinite(lng) && Number.isFinite(lat) && Math.abs(lng) <= 180 && Math.abs(lat) <= 90
}

export async function locateDiscoveryCity(isActive: () => boolean = () => true): Promise<DiscoveryContext> {
  const version = selectionVersion
  const position = await new Promise<UniApp.GetLocationSuccess>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('定位超时，请重试或手动选择城市')), 15000)
    uni.getLocation({
      type: 'wgs84', isHighAccuracy: true,
      success: result => { clearTimeout(timeout); resolve(result) },
      fail: () => { clearTimeout(timeout); reject(new Error('未能获取定位，请开启定位权限或手动选择城市')) },
    })
  })
  if (!isActive() || selectionVersion !== version) throw new Error('已取消本次定位')
  const response = await request<{ data: DiscoveryCity & { is_open: boolean; longitude: string; latitude: string } }>('/locations/locate/', {
    skipAuth: true, method: 'POST',
    data: { longitude: position.longitude.toFixed(7), latitude: position.latitude.toFixed(7) },
  })
  const location = response.data
  if (!location.is_open) throw new Error((location.city_name || '当前城市') + '暂未开通，请手动选择其他城市')
  if (!isActive() || selectionVersion !== version) throw new Error('已取消本次定位')
  selectDiscoveryCity(location)
  currentLocation = {
    cityCode: location.city_code, cityName: location.city_name,
    longitude: location.longitude, latitude: location.latitude, source: 'location',
    expiresAt: Date.now() + 10 * 60 * 1000,
  }
  return currentLocation
}

export function openDiscoveryCityPicker() { uni.navigateTo({ url: '/pages/discovery/cities' }) }

export function discoveryQuery(context: DiscoveryContext) {
  return {
    city_code: context.cityCode || undefined,
    ...(validCoordinates(context.longitude, context.latitude)
      ? { longitude: context.longitude, latitude: context.latitude } : {}),
  }
}

export function discoveryLocationLabel(context: DiscoveryContext) {
  if (context.source === 'location') return '按本次定位筛选 · 可重新定位'
  if (context.source === 'address') return '按同城默认地址筛选 · 可切换定位'
  return '浏览同城 · 定位后查看距离与服务范围'
}
