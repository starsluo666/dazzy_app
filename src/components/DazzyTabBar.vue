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

.tabbar {
  position: fixed;
  z-index: 100;
  right: 0;
  bottom: calc(16rpx + env(safe-area-inset-bottom));
  left: 0;
  display: grid;
  width: calc(100% - 48rpx);
  height: 112rpx;
  grid-template-columns: repeat(4, 1fr);
  margin: 0 auto;
  padding: 8rpx;
  border: 1rpx solid $dz-border-material;
  border-radius: 36rpx;
  background: rgba(250, 252, 252, 0.95);
  box-shadow: $dz-shadow-floating;
  box-sizing: border-box;
  isolation: isolate;
}

.tabbar::before {
  position: absolute;
  z-index: -1;
  top: 1rpx;
  right: 28rpx;
  left: 28rpx;
  height: 1rpx;
  background: rgba(255, 255, 255, 0.96);
  content: '';
  pointer-events: none;
}

/* #ifdef H5 */
.tabbar {
  background: $dz-surface-glass;
  -webkit-backdrop-filter: saturate(180%) blur(24px);
  backdrop-filter: saturate(180%) blur(24px);
}
/* #endif */

.tab {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  border-radius: 28rpx;
  color: $dz-text-secondary;
  font-size: $dz-fs-micro;
  touch-action: manipulation;
  flex-direction: column;
  transition:
    transform $dz-duration-fast $dz-ease-out,
    opacity $dz-duration-fast $dz-ease-standard,
    background-color $dz-duration-base $dz-ease-standard;
}

.tab-icon-shell {
  position: relative;
  display: flex;
  width: 76rpx;
  height: 48rpx;
  align-items: center;
  justify-content: center;
  margin-bottom: 2rpx;
}

.tab-icon { display: block; width: 42rpx; height: 42rpx; }
.notification-dot { position: absolute; top: -2rpx; right: 9rpx; width: 16rpx; height: 16rpx; border: 3rpx solid $dz-surface-card; border-radius: 50%; background:$dz-status-danger; box-sizing: border-box; }
.tab.active { color: $dz-brand-deep; background: rgba(24, 199, 198, 0.11); box-shadow: inset 0 1rpx 0 $dz-surface-highlight, 0 5rpx 14rpx rgba(8,174,180,.07); font-weight: $dz-fw-semibold; }
.tab--pressed { transform: scale(0.95); opacity: .82; }
@media screen and (min-width: 480px) and (max-width: 767px) {
  .tabbar { max-width: 406px; }
}
@media screen and (min-width: 768px) {
  .tabbar { max-width: 672px; }
}
@media screen and (orientation: landscape) and (max-height: 600px) {
  .tabbar { bottom: calc(10rpx + env(safe-area-inset-bottom)); height: 96rpx; }
  .tab-icon-shell { height: 40rpx; }
}
@media (prefers-reduced-motion: reduce) {
  .tab { transition: none; }
  .tab--pressed { transform: none; }
}
@media (prefers-reduced-transparency: reduce) {
  .tabbar { background: $dz-surface-raised; -webkit-backdrop-filter: none; backdrop-filter: none; }
}
</style>
