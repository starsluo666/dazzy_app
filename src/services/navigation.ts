export type TabKey = 'home' | 'provider' | 'activity' | 'profile'

const tabRoutes: Record<TabKey, string> = {
  home: '/pages/index/index',
  provider: '/pages/providers/list',
  activity: '/pages/activities/index',
  profile: '/pages/profile/index',
}

export function openTab(tab: TabKey) {
  uni.reLaunch({ url: tabRoutes[tab] })
}

export function openPage(url: string) {
  uni.navigateTo({ url })
}
