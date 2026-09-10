<template>
  <nav class="tabbar" aria-label="主导航">
    <view
      v-for="tab in tabs"
      :key="tab.key"
      class="tab"
      :class="{ active: tab.key === active }"
      hover-class="tab--pressed"
      role="button"
      :aria-label="tab.key === 'profile' && effectiveUnreadCount ? `${tab.label}，有未读通知` : tab.label"
      :aria-current="tab.key === active ? 'page' : undefined"
      @tap="openTab(tab.key)"
    >
      <view class="tab-icon-shell">
        <image
          class="tab-icon"
          :src="tab.key === active ? tab.activeIcon : tab.icon"
          mode="aspectFit"
          aria-hidden="true"
        />
        <i v-if="tab.key === 'profile' && effectiveUnreadCount" class="notification-dot" aria-hidden="true" />
      </view>
      <text>{{ tab.label }}</text>
    </view>
  </nav>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { openTab, type TabKey } from '@/services/navigation'
import { getNotificationSummary } from '@/services/notifications'
import { isAuthenticated } from '@/services/session'

const props = withDefaults(defineProps<{ active?: string; unreadCount?: number }>(), { active: 'home' })
const loadedUnreadCount = ref(0)
const effectiveUnreadCount = computed(() => props.unreadCount ?? loadedUnreadCount.value)

const tabs: Array<{ key: TabKey; label: string; icon: string; activeIcon: string }> = [
  { key: 'home', label: '首页', icon: '/static/tabbar/home.svg', activeIcon: '/static/tabbar/home-active.svg' },
  { key: 'provider', label: '达人', icon: '/static/tabbar/provider.svg', activeIcon: '/static/tabbar/provider-active.svg' },
  { key: 'activity', label: '活动', icon: '/static/tabbar/activity.svg', activeIcon: '/static/tabbar/activity-active.svg' },
  { key: 'profile', label: '我的', icon: '/static/tabbar/profile.svg', activeIcon: '/static/tabbar/profile-active.svg' },
]

async function loadUnreadCount() {
  if (props.unreadCount !== undefined || !isAuthenticated()) return
  try { loadedUnreadCount.value = (await getNotificationSummary()).data.unread }
  catch { loadedUnreadCount.value = 0 }
}

onMounted(loadUnreadCount)
</script>

<style lang="scss" scoped>
@use '../styles/tokens.scss' as *;
.tabbar { position: fixed; z-index: 10; right: 0; bottom: 0; left: 0; display: grid; grid-template-columns: repeat(4,1fr); height: calc(112rpx + env(safe-area-inset-bottom)); padding-bottom: env(safe-area-inset-bottom); border-top: 1rpx solid $dz-border-subtle; background: rgba(255,255,255,.97); box-sizing: border-box; }
.tab { display: flex; min-height: 88rpx; align-items: center; justify-content: center; color: $dz-text-secondary; font-size: 19rpx; touch-action: manipulation; flex-direction: column; }
.tab-icon-shell { position: relative; display: flex; width: 92rpx; height: 48rpx; align-items: center; justify-content: center; margin-bottom: 4rpx; border-radius: 24rpx; transition: background-color .18s ease-out, opacity .18s ease-out; }
.tab-icon { display: block; width: 44rpx; height: 44rpx; }
.notification-dot { position: absolute; top: -1rpx; right: 17rpx; width: 15rpx; height: 15rpx; border: 3rpx solid #fff; border-radius: 50%; background: #ff4141; box-sizing: border-box; }
.tab.active { color: $dz-brand-primary; font-weight: 600; }
.tab.active .tab-icon-shell { background: $dz-brand-soft; }
.tab--pressed .tab-icon-shell { opacity: .68; background: $dz-brand-soft; }
@media screen and (min-width: 480px) and (max-width: 767px) {
  .tabbar { max-width: 430px; margin-right: auto; margin-left: auto; border-right: 1rpx solid $dz-border-subtle; border-left: 1rpx solid $dz-border-subtle; }
}
@media screen and (min-width: 768px) {
  .tabbar { max-width: 720px; margin-right: auto; margin-left: auto; border-right: 1rpx solid $dz-border-subtle; border-left: 1rpx solid $dz-border-subtle; }
}
@media screen and (orientation: landscape) and (max-height: 600px) {
  .tabbar { height: calc(96rpx + env(safe-area-inset-bottom)); }
}
@media (prefers-reduced-motion: reduce) {
  .tab-icon-shell { transition: none; }
}
</style>
