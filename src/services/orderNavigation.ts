import type { ProviderOrder } from '@/types/api'
// #ifdef H5
import { request } from './http'
// #endif

interface MeetingLocation {
  latitude: number
  longitude: number
  name: string
  address: string
}

export async function navigateToOrderMeeting(order: ProviderOrder, addressLabel: string) {
  const latitude = Number(order.meeting_latitude ?? NaN)
  const longitude = Number(order.meeting_longitude ?? NaN)
  if (!order.meeting_latitude || !order.meeting_longitude || !Number.isFinite(latitude)
    || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    offerAddressCopy(addressLabel, '当前订单只有文字地址，可复制后在地图中搜索。')
    return
  }

  const location = {
    latitude,
    longitude,
    name: order.meeting_location_name || '集合地点',
    address: order.meeting_address,
  }
  // #ifdef H5
  if (/MicroMessenger/i.test(navigator.userAgent)) {
    try {
      const sdk = await prepareWechatMaps(order.order_no)
      sdk.openLocation({ ...location, scale: 17, fail: () => showMapChoices(location, addressLabel) })
      return
    } catch {
      // A browser can still open the map links when WeChat configuration fails.
    }
  }
  showMapChoices(location, addressLabel)
  // #endif

  // #ifndef H5
  uni.openLocation({
    ...location,
    scale: 17,
    fail: ({ errMsg }) => {
      if (!errMsg?.includes('cancel')) offerAddressCopy(addressLabel, '地图暂时无法打开，可复制地址后搜索。')
    },
  })
  // #endif
}

function offerAddressCopy(address: string, content: string) {
  uni.showModal({
    title: '集合地点',
    content: address ? content : '此订单暂无集合地点。',
    showCancel: Boolean(address),
    confirmText: address ? '复制地址' : '确定',
    success: ({ confirm }) => {
      if (confirm && address) copyMeetingAddress(address)
    },
  })
}

function copyMeetingAddress(address: string) {
  uni.setClipboardData({
    data: address,
    fail: () => uni.showToast({ title: '复制失败，请长按地址复制', icon: 'none' }),
  })
}

// #ifdef H5
interface WechatMapConfig {
  appId: string
  timestamp: number
  nonceStr: string
  signature: string
}

interface WechatLocationSdk {
  config: (options: WechatMapConfig & { jsApiList: string[] }) => void
  ready: (callback: () => void) => void
  error: (callback: () => void) => void
  openLocation: (options: MeetingLocation & { scale: number; fail: () => void }) => void
}

let sdkScript: Promise<WechatLocationSdk> | undefined
let configuredMap: { url: string; ready: Promise<WechatLocationSdk> } | undefined

function loadWechatSdk() {
  if (sdkScript) return sdkScript
  const win = window as Window & { wx?: WechatLocationSdk; jWeixin?: WechatLocationSdk }
  const currentSdk = () => {
    const sdk = win.jWeixin || win.wx
    return typeof sdk?.config === 'function' && typeof sdk.openLocation === 'function' ? sdk : undefined
  }
  const existing = currentSdk()
  if (existing) return Promise.resolve(existing)

  sdkScript = new Promise<WechatLocationSdk>((resolve, reject) => {
    const script = document.createElement('script')
    const fail = () => {
      window.clearTimeout(timeout)
      script.remove()
      reject(new Error('微信地图组件加载失败'))
    }
    const timeout = window.setTimeout(fail, 5000)
    script.src = 'https://res.wx.qq.com/open/js/jweixin-1.6.0.js'
    script.onload = () => {
      window.clearTimeout(timeout)
      const sdk = currentSdk()
      if (sdk) resolve(sdk)
      else fail()
    }
    script.onerror = fail
    document.head.appendChild(script)
  }).catch((error: unknown) => {
    sdkScript = undefined
    throw error
  })
  return sdkScript
}

function prepareWechatMaps(orderNo: string) {
  const url = window.location.href.split('#', 1)[0]
  if (configuredMap?.url === url) return configuredMap.ready

  const ready = new Promise<WechatLocationSdk>((resolve, reject) => {
    const fail = () => {
      window.clearTimeout(timeout)
      reject(new Error('微信地图配置失败'))
    }
    let expired = false
    const timeout = window.setTimeout(() => { expired = true; fail() }, 6000)
    const config = request<{ data: WechatMapConfig }>(
      `/provider-orders/${encodeURIComponent(orderNo)}/navigation/`,
      { query: { url } },
    )
    Promise.all([loadWechatSdk(), config]).then(([sdk, { data }]) => {
      if (expired) return
      sdk.error(fail)
      sdk.config({ ...data, jsApiList: ['openLocation'] })
      sdk.ready(() => {
        window.clearTimeout(timeout)
        resolve(sdk)
      })
    }).catch(fail)
  }).catch((error: unknown) => {
    if (configuredMap?.ready === ready) configuredMap = undefined
    throw error
  })
  configuredMap = { url, ready }
  return ready
}

function showMapChoices({ latitude, longitude, name, address }: MeetingLocation, addressLabel: string) {
  const marker = `coord:${latitude},${longitude};title:${name.replace(/;/g, '；')};addr:${address.replace(/;/g, '；')}`
  const maps = [
    { label: '腾讯地图', url: `https://apis.map.qq.com/uri/v1/marker?marker=${encodeURIComponent(marker)}&referer=ledaban` },
    { label: '百度地图', url: `https://api.map.baidu.com/marker?location=${latitude},${longitude}&title=${encodeURIComponent(name)}&content=${encodeURIComponent(address)}&coord_type=gcj02&output=html&src=webapp.ledaban.h5` },
    { label: '高德地图', url: `https://uri.amap.com/marker?position=${longitude},${latitude}&name=${encodeURIComponent(name)}&coordinate=gaode&callnative=1&src=ledaban` },
  ]
  uni.showActionSheet({
    title: '选择地图',
    itemList: [...maps.map(map => map.label), '复制地址'],
    success: ({ tapIndex }) => {
      const selected = maps[tapIndex]
      if (selected) window.location.assign(selected.url)
      else if (tapIndex === maps.length) copyMeetingAddress(addressLabel)
    },
  })
}
// #endif
