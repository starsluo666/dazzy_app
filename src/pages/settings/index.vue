<template>
  <view class="dz-page settings-page">
    <DzNavBar title="设置" :back-action="goBack" />

    <main class="settings-content dz-container">
      <section class="account-card dz-tappable" role="button" aria-label="编辑个人资料" tabindex="0" hover-class="dz-pressed" @tap="openProfileEditor" @keydown.enter.prevent="openProfileEditor" @keydown.space.prevent="openProfileEditor">
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
        <button v-for="item in group" :key="item.label" class="setting-row dz-tappable" :class="{ 'setting-row--danger': item.action === 'close' }" role="button" tabindex="0" hover-class="dz-pressed" @tap="openSetting(item)" @keydown.enter.prevent="openSetting(item)" @keydown.space.prevent="openSetting(item)">
          <view class="row-copy"><view class="row-icon" :class="item.tone"><image v-if="item.image" :src="item.image" mode="aspectFit" aria-hidden="true" /><text v-else>{{ item.icon }}</text></view><text>{{ item.label }}</text></view>
          <view class="row-tail"><text v-if="item.value">{{ item.value }}</text><text class="chevron">›</text></view>
        </button>
      </section>

      <button class="logout-button dz-tappable" :disabled="loggingOut" role="button" :tabindex="loggingOut ? -1 : 0" hover-class="dz-pressed" @tap="confirmLogout" @keydown.enter.prevent="confirmLogout" @keydown.space.prevent="confirmLogout">
        {{ loggingOut ? '正在退出…' : '退出登录' }}
      </button>
      <text class="version">乐搭伴 v1.0.0</text>
    </main>
    <AccountActionSheet ref="accountActions" />
  </view>
</template>

<script setup lang="ts">
import { navigateBackOr } from '@/utils/navigation'
import DzNavBar from '@/components/DzNavBar.vue'
import { onHide, onLoad, onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import AccountActionSheet from '@/components/AccountActionSheet.vue'
import { openLegalDocument, type LegalDocumentKind } from '@/content/legal'

import { getCurrentUser, logout } from '@/services/auth'
import { guardCurrentPage, isAuthenticated } from '@/services/session'
import type { CurrentUser } from '@/types/api'

type SettingItem = { label: string; icon?: string; image?: string; tone?: string; value?: string; action?: 'password' | 'close'; document?: LegalDocumentKind }

const user = ref<CurrentUser | null>(null)
const avatarFailed = ref(false)
const loggingOut = ref(false)
const accountActions = ref<{ open: (action: 'password' | 'close') => void; close: (force?: boolean) => void; resume: () => void } | null>(null)
const maskedPhone = computed(() => user.value?.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') || '')
const settingGroups: SettingItem[][] = [
  [
    { label: '修改密码', image: '/static/security/password.svg', tone: 'password-tone', action: 'password' },
  ],
  [
    { label: '注销账号', image: '/static/security/shield-danger.svg', tone: 'danger-tone', action: 'close' },
  ],
  [
    { label: '用户协议', icon: '约', document: 'service' },
    { label: '隐私政策', icon: '隐', document: 'privacy' },
    { label: '关于乐搭伴', icon: 'i' },
  ],
]

function goBack() { navigateBackOr(() => uni.reLaunch({ url: '/pages/profile/index' })) }
function openProfileEditor() { uni.navigateTo({ url: '/pages/profile/edit' }) }
function openSetting(item: SettingItem) {
  if (item.action) return accountActions.value?.open(item.action)
  if (item.document) return openLegalDocument(item.document)
  uni.showToast({ title: `${item.label}功能即将接入`, icon: 'none' })
}
function confirmLogout() {
  if (loggingOut.value) return
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
onShow(() => { void loadUser(); accountActions.value?.resume() })
onHide(() => accountActions.value?.close(true))
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
.setting-row { display: flex; align-items: center; justify-content: space-between; width: 100%; min-height: max(44px, 94rpx); margin: 0; padding: $dz-space-2 0; border: 0; border-bottom: 1rpx solid $dz-border-subtle; border-radius: 0; color: $dz-text-primary; background: transparent; font-size: max(14px, #{$dz-fs-body}); line-height: 1.5; text-align: left; }
.setting-row:last-child { border-bottom: 0; }
.setting-row::after { border: 0; }
.setting-row--danger .row-copy > text { color: $dz-status-danger-deep; }
.row-copy, .row-tail { display: flex; align-items: center; }
.row-icon { display: flex; width: 48rpx; height: 48rpx; align-items: center; justify-content: center; margin-right: 20rpx; border-radius:$dz-radius-sm; color: $dz-brand-deep; background: $dz-brand-soft; font-size:$dz-fs-caption; font-weight:$dz-fw-bold; }
.row-icon { flex: none; }
.row-icon image { width: 30rpx; height: 30rpx; }
.row-icon.password-tone { background: $dz-price-soft; }
.row-icon.danger-tone { background: $dz-status-danger-soft; }
.row-tail { gap: 12rpx; color: $dz-text-tertiary; font-size:$dz-fs-caption; }
.logout-button { display: flex; align-items: center; justify-content: center; width: 100%; min-height: max(44px, 88rpx); margin-top: 34rpx; padding: $dz-space-2 $dz-space-4; border: 0; border-radius:$dz-radius-md; color:$dz-status-danger-deep; background: $dz-surface-card; font-size: max(14px, #{$dz-fs-body-strong}); font-weight:$dz-fw-bold; line-height: 1.4; box-sizing: border-box; box-shadow: $dz-shadow-card; }
.logout-button::after { border: 0; }
.account-card:focus-visible, .setting-row:focus-visible, .logout-button:focus-visible { outline: 2px solid $dz-list-accent; outline-offset: -2px; }
.logout-button[disabled] { opacity: .55; }
.version { display: block; margin-top: 24rpx; color: #b0b9bd; font-size:$dz-fs-caption; text-align: center; }
</style>
