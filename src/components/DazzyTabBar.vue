<template>
  <nav class="tabbar" aria-label="主导航">
    <view
      v-for="tab in tabs"
      :key="tab.key"
      class="tab"
      :class="{ active: tab.key === active }"
      hover-class="tab--pressed"
      role="button"
      :aria-label="tab.label"
      @tap="openTab(tab.key)"
    >
      <view class="tab-icon">{{ tab.icon }}</view>
      <text>{{ tab.label }}</text>
    </view>
  </nav>
</template>

<script setup lang="ts">
import { openTab, type TabKey } from '@/services/navigation'

withDefaults(defineProps<{ active?: string }>(), { active: 'home' })

const tabs: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: 'home', label: '首页', icon: '⌂' },
  { key: 'provider', label: '达人', icon: '♙' },
  { key: 'activity', label: '活动', icon: '◇' },
  { key: 'message', label: '消息', icon: '◌' },
  { key: 'profile', label: '我的', icon: '♙' },
]
</script>

<style lang="scss" scoped>
@use '../styles/tokens.scss' as *;
.tabbar { position: fixed; z-index: 10; right: 0; bottom: 0; left: 0; display: grid; grid-template-columns: repeat(5,1fr); height: calc(112rpx + env(safe-area-inset-bottom)); padding-bottom: env(safe-area-inset-bottom); border-top: 1rpx solid $dz-border-subtle; background: rgba(255,255,255,.97); box-sizing: border-box; }
.tab { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 88rpx; color: $dz-text-secondary; font-size: 19rpx; }
.tab-icon { display: flex; align-items: center; justify-content: center; width: 44rpx; height: 44rpx; margin-bottom: 4rpx; font-size: 34rpx; }
.tab.active { color: $dz-brand-primary; font-weight: 600; }
.tab--pressed { background: $dz-brand-soft; }
@media screen and (min-width: 480px) and (max-width: 767px) {
  .tabbar { max-width: 430px; margin-right: auto; margin-left: auto; border-right: 1rpx solid $dz-border-subtle; border-left: 1rpx solid $dz-border-subtle; }
}
@media screen and (min-width: 768px) {
  .tabbar { max-width: 720px; margin-right: auto; margin-left: auto; border-right: 1rpx solid $dz-border-subtle; border-left: 1rpx solid $dz-border-subtle; }
}
@media screen and (orientation: landscape) and (max-height: 600px) {
  .tabbar { height: calc(96rpx + env(safe-area-inset-bottom)); }
}
</style>
