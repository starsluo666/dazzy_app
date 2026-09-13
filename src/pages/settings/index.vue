<template>
  <view class="dz-page settings-page">
    <view class="settings-hero">
      <view class="dz-safe-top" />
      <header class="settings-nav dz-container">
        <view class="back" role="button" aria-label="返回" @tap="goBack">‹</view>
        <text>设置</text>
        <view class="nav-spacer" />
      </header>
    </view>

    <main class="settings-content dz-container">
      <section class="account-card" role="button" @tap="openProfileEditor">
        <view class="avatar">
          <image v-if="user?.avatar_url && !avatarFailed" :src="user.avatar_url" mode="aspectFill" @error="avatarFailed = true" />
          <text v-else>{{ (user?.nickname || '乐').slice(0, 1) }}</text>
        </view>
        <view class="account-copy">
          <strong>{{ user?.nickname || '乐搭伴用户' }}</strong>
          <text>{{ maskedPhone }}</text>
        </view>
        <text class="chevron">›</text>
      </section>

      <section v-for="group in settingGroups" :key="group[0].label" class="setting-group">
        <view v-for="item in group" :key="item.label" class="setting-row" role="button" @tap="openSetting(item)">
          <view class="row-copy"><text class="row-icon">{{ item.icon }}</text><text>{{ item.label }}</text></view>
          <view class="row-tail"><text v-if="item.value">{{ item.value }}</text><text class="chevron">›</text></view>
        </view>
      </section>

      <button class="logout-button" :disabled="loggingOut" @tap="confirmLogout">
        {{ loggingOut ? '正在退出…' : '退出登录' }}
      </button>
      <text class="version">乐搭伴 v1.0.0</text>
    </main>
  </view>
</template>

<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import { getCurrentUser, logout } from '@/services/auth'
import { guardCurrentPage, isAuthenticated } from '@/services/session'
import type { CurrentUser } from '@/types/api'

type SettingItem = { label: string; icon: string; value?: string; action?: 'cache' | 'profile' | 'security' }

const user = ref<CurrentUser | null>(null)
const avatarFailed = ref(false)
const loggingOut = ref(false)
const maskedPhone = computed(() => user.value?.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') || '')
const settingGroups: SettingItem[][] = [
  [
    { label: '编辑个人资料', icon: '人', action: 'profile' },
    { label: '账号与安全', icon: '盾', action: 'security' },
    { label: '隐私设置', icon: '锁' },
  ],
  [
    { label: '消息通知', icon: '铃', value: '已开启' },
    { label: '清除缓存', icon: '扫', action: 'cache' },
  ],
  [
    { label: '用户协议', icon: '约' },
    { label: '隐私政策', icon: '隐' },
    { label: '关于乐搭伴', icon: 'i' },
  ],
]

function goBack() { uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/profile/index' }) }) }
function openProfileEditor() { uni.navigateTo({ url: '/pages/profile/edit' }) }
function openSetting(item: SettingItem) {
  if (item.action === 'profile') return openProfileEditor()
  if (item.action === 'security') return uni.navigateTo({ url: '/pages/security/index' })
  if (item.action === 'cache') {
    uni.showToast({ title: '缓存已清理', icon: 'success' })
    return
  }
  uni.showToast({ title: `${item.label}功能即将接入`, icon: 'none' })
}
function confirmLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确定要退出当前账号吗？',
    cancelText: '取消',
    confirmText: '退出',
    confirmColor: '#08aeb4',
    success: async ({ confirm }) => {
      if (!confirm || loggingOut.value) return
      loggingOut.value = true
      try {
        await logout()
        uni.showToast({ title: '已退出登录', icon: 'success' })
        setTimeout(() => uni.reLaunch({ url: '/pages/profile/index' }), 300)
      } finally { loggingOut.value = false }
    },
  })
}

async function loadUser() {
  if (!isAuthenticated()) return
  try { user.value = (await getCurrentUser()).data }
  catch { uni.showToast({ title: '账号信息加载失败', icon: 'none' }) }
}

onLoad(() => { guardCurrentPage() })
onShow(loadUser)
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;

.settings-page { background:$dz-surface-page; }
.settings-hero { background: linear-gradient(150deg,$dz-brand-soft, #fff); }
.settings-nav { display: flex; align-items: center; justify-content: space-between; height: 94rpx; font-size:$dz-fs-heading; font-weight:$dz-fw-bold; }
.back, .nav-spacer { width: 64rpx; }
.back { color: #26343a; font-size: 58rpx; font-weight: 300; line-height: 1; }
.settings-content { padding-top: 24rpx; padding-bottom: calc(40rpx + env(safe-area-inset-bottom)); }
.account-card, .setting-group { border: 1rpx solid rgba(24, 55, 61, .04); border-radius:$dz-radius-md; background: #fff; box-shadow: 0 10rpx 32rpx rgba(31, 65, 72, .055); }
.account-card { display: flex; align-items: center; min-height: 142rpx; padding: 20rpx 28rpx; box-sizing: border-box; }
.avatar { display: flex; width: 92rpx; height: 92rpx; align-items: center; justify-content: center; overflow: hidden; border-radius: 50%; color: $dz-brand-deep; background: $dz-brand-soft; font-size:$dz-fs-heading; font-weight:$dz-fw-bold; }
.avatar image { width: 100%; height: 100%; }
.account-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; margin-left: 22rpx; }
.account-copy strong { font-size:$dz-fs-body-strong; }
.account-copy text { margin-top: 8rpx; color: $dz-text-tertiary; font-size:$dz-fs-caption; }
.chevron { color:$dz-text-tertiary; font-size:$dz-fs-title; font-weight: 300; }
.setting-group { overflow: hidden; margin-top: 22rpx; padding: 0 26rpx; }
.setting-row { display: flex; align-items: center; justify-content: space-between; min-height: 94rpx; border-bottom: 1rpx solid $dz-border-subtle; font-size:$dz-fs-body; }
.setting-row:last-child { border-bottom: 0; }
.row-copy, .row-tail { display: flex; align-items: center; }
.row-icon { display: flex; width: 48rpx; height: 48rpx; align-items: center; justify-content: center; margin-right: 20rpx; border-radius:$dz-radius-sm; color: $dz-brand-deep; background: $dz-brand-soft; font-size:$dz-fs-caption; font-weight:$dz-fw-bold; }
.row-tail { gap: 12rpx; color: $dz-text-tertiary; font-size:$dz-fs-caption; }
.logout-button { height: 88rpx; margin-top: 34rpx; border-radius:$dz-radius-md; color:$dz-status-danger; background: #fff; font-size:$dz-fs-body-strong; font-weight:$dz-fw-bold; box-shadow: 0 8rpx 26rpx rgba(31, 65, 72, .045); }
.logout-button[disabled] { opacity: .55; }
.version { display: block; margin-top: 24rpx; color: #b0b9bd; font-size:$dz-fs-caption; text-align: center; }
</style>
