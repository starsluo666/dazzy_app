import { getSavedAddresses } from './locations'
import { isAuthenticated } from './session'

export interface DiscoveryContext {
  cityCode: string
  cityName: string
  longitude: string
  latitude: string
  source: 'default' | 'manual' | 'address'
}

type DiscoveryCity = Omit<DiscoveryContext, 'source'>

const STORAGE_KEY = 'dazzy.discoveryCity'

export const DISCOVERY_CITIES: DiscoveryCity[] = [
  {
    cityCode: '130400',
    cityName: '邯郸市',
    longitude: '114.5240070',
    latitude: '36.6074460',
  },
  {
    cityCode: '110100',
    cityName: '北京市',
    longitude: '116.4039810',
    latitude: '39.9150010',
  },
  {
    cityCode: '310100',
    cityName: '上海市',
    longitude: '121.4737000',
    latitude: '31.2304000',
  },
]

const defaultCity = DISCOVERY_CITIES[0]

function cityByCode(cityCode: unknown): DiscoveryCity | undefined {
  return DISCOVERY_CITIES.find(city => city.cityCode === cityCode)
}

function cityByName(cityName: string): DiscoveryCity | undefined {
  const normalized = cityName.trim().replace(/市$/, '')
  return DISCOVERY_CITIES.find(city => city.cityName.replace(/市$/, '') === normalized)
}

export function getDiscoveryContext(): DiscoveryContext {
  const saved = uni.getStorageSync(STORAGE_KEY) as Partial<DiscoveryContext> | undefined
  const city = cityByCode(saved?.cityCode) || defaultCity
  return {
    ...city,
    source: saved?.source === 'manual' ? 'manual' : 'default',
  }
}

export function selectDiscoveryCity(cityCode: string): DiscoveryContext {
  const city = cityByCode(cityCode) || defaultCity
  const context: DiscoveryContext = { ...city, source: 'manual' }
  uni.setStorageSync(STORAGE_KEY, context)
  return context
}

export async function resolveDiscoveryContext(): Promise<DiscoveryContext> {
  const selected = getDiscoveryContext()
  if (!isAuthenticated()) return selected

  try {
    const addresses = (await getSavedAddresses()).data.items
    const address = addresses.find(item => item.is_default) || addresses[0]
    if (!address) return selected

    const addressCity = cityByName(address.city_name)
    if (!addressCity) return selected
    if (selected.source === 'manual' && selected.cityCode !== addressCity.cityCode) {
      return selected
    }

    return {
      ...addressCity,
      longitude: String(address.longitude),
      latitude: String(address.latitude),
      source: 'address',
    }
  } catch {
    return selected
  }
}

export function showDiscoveryCityPicker(): Promise<DiscoveryContext | null> {
  return new Promise((resolve) => {
    uni.showActionSheet({
      itemList: DISCOVERY_CITIES.map(city => city.cityName),
      success(result) {
        const city = DISCOVERY_CITIES[result.tapIndex]
        resolve(city ? selectDiscoveryCity(city.cityCode) : null)
      },
      fail() {
        resolve(null)
      },
    })
  })
}

export function discoveryQuery(context: DiscoveryContext) {
  return {
    city_code: context.cityCode,
    longitude: context.longitude,
    latitude: context.latitude,
  }
}
