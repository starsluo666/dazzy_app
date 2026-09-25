<template>
  <view class="dz-page security-page">
    <view class="security-hero">
      <view class="dz-safe-top" />
      <header class="dz-page-head dz-container">
        <button class="dz-tappable" aria-label="返回" hover-class="dz-pressed" @tap="goBack">‹</button>
        <strong>账号与安全</strong>
        <view class="head-space" />
      </header>
    </view>

    <main class="dz-container security-content">
      <NetworkState v-if="loading" message="正在检查账号安全状态…" />
      <NetworkState v-else-if="error" :message="error" error @retry="load" />
      <template v-else>
        <section class="summary panel">
          <view class="summary-icon">
            <image src="/static/security/shield.svg" mode="aspectFit" />
          </view>
          <view class="summary-copy">
            <view class="summary-title">
              <strong class="summary-heading">账号保护正常</strong>
              <text>安全</text>
            </view>
            <text class="summary-description">敏感操作需要再次验证身份。</text>
          </view>
          <view class="summary-status">
            <view class="status-item">
              <text>账号状态</text>
              <view class="status-value">
                <i class="status-dot" />
                <strong class="status-label">{{ security?.account_status_label || '正常' }}</strong>
              </view>
            </view>
            <view class="status-item">
              <text>登录密码</text>
              <strong class="status-label">{{ security?.password_set ? '已设置' : '未设置' }}</strong>
            </view>
          </view>
        </section>

        <text class="section-title">账号信息</text>
        <section class="card panel">
          <button class="row dz-tappable" aria-label="修改登录手机号" hover-class="dz-pressed" @tap="openPhoneChange">
            <view class="row-icon phone-tone"><image src="/static/security/phone.svg" mode="aspectFit" /></view>
            <view class="copy"><strong class="row-title">登录手机号</strong><text>用于登录和身份核验</text></view>
            <view class="value"><strong class="value-label">{{ security?.phone_masked || '—' }}</strong><b class="row-chevron">›</b></view>
          </button>
        </section>

        <text class="section-title">安全设置</text>
        <section class="card panel">
          <button class="row dz-tappable" aria-label="修改登录密码" hover-class="dz-pressed" @tap="openPanel('password')">
            <view class="row-icon password-tone"><image src="/static/security/password.svg" mode="aspectFit" /></view>
            <view class="copy"><strong class="row-title">登录密码</strong><text>定期更换密码可降低账号风险</text></view>
            <view class="value action-value"><strong class="value-label">修改</strong><b class="row-chevron">›</b></view>
          </button>
          <button class="row dz-tappable" aria-label="退出其他设备" hover-class="dz-pressed" @tap="openPanel('sessions')">
            <view class="row-icon device-tone"><image src="/static/security/devices.svg" mode="aspectFit" /></view>
            <view class="copy"><strong class="row-title">其他设备登录</strong><text>发现异常时让其他设备立即退出</text></view>
            <view class="value"><strong class="value-label danger">退出</strong><b class="row-chevron">›</b></view>
          </button>
        </section>

        <text class="section-title">账号操作</text>
        <section class="card panel">
          <button class="row dz-tappable" aria-label="注销账号" hover-class="dz-pressed" @tap="confirmClose">
            <view class="row-icon danger-tone"><image src="/static/security/shield-danger.svg" mode="aspectFit" /></view>
            <view class="copy"><strong class="row-title">注销账号</strong><text>注销后账号资料和登录状态将被停用</text></view>
            <view class="value"><strong class="value-label danger">注销</strong><b class="row-chevron">›</b></view>
          </button>
        </section>

        <section class="tip">
          <view class="tip-icon" aria-hidden="true"><text>!</text></view>
          <view class="tip-copy"><strong class="tip-title">安全提醒</strong><text>平台不会通过电话或聊天索要密码、短信验证码。</text></view>
        </section>
      </template>
    </main>

    <DzBottomSheet :visible="Boolean(panel)" :title="panelTitle" @close="closePanel()">
      <view class="sheet-content" role="dialog" :aria-label="panelTitle">
        <text class="sheet-description">{{ panelDescription }}</text>
        <view class="form">
          <label>
            当前登录密码
            <view class="password-field"><input v-model="currentPassword" password placeholder="请输入当前密码" maxlength="20" /></view>
          </label>
          <template v-if="panel === 'password'">
            <label>
              新密码
              <view class="password-field"><input v-model="newPassword" password placeholder="8–20 位，建议包含字母和数字" maxlength="20" /></view>
            </label>
            <label>
              确认新密码
              <view class="password-field"><input v-model="confirmation" password placeholder="请再次输入新密码" maxlength="20" /></view>
            </label>
          </template>
          <view v-else class="session-note">
            <strong class="session-title">{{ panel === 'close' ? '注销后无法恢复' : '当前设备会保持登录' }}</strong>
            <text>{{ panel === 'close' ? '账号资料和登录状态将被停用，请确认仍要继续。' : '其他手机、浏览器和小程序登录状态都会失效。' }}</text>
          </view>
          <button
            class="submit dz-tappable"
            :class="{ dangerButton: panel === 'sessions' || panel === 'close' }"
            hover-class="dz-pressed"
            :disabled="saving"
            @tap="submit"
          >
            {{ submitLabel }}
          </button>
        </view>
      </view>
    </DzBottomSheet>
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import DzBottomSheet from '@/components/DzBottomSheet.vue'
import NetworkState from '@/components/NetworkState.vue'
import { changePassword, closeAccount, getAccountSecurity, logout, logoutOtherSessions } from '@/services/auth'
import { guardCurrentPage } from '@/services/session'
import type { AccountSecurity } from '@/types/api'

type Panel = 'password' | 'sessions' | 'close' | ''

const security = ref<AccountSecurity | null>(null)
const loading = ref(true)
const error = ref('')
const panel = ref<Panel>('')
const currentPassword = ref('')
const newPassword = ref('')
const confirmation = ref('')
const saving = ref(false)

const panelTitle = computed(() => panel.value === 'password' ? '修改登录密码' : panel.value === 'close' ? '注销账号' : '退出其他设备')
const panelDescription = computed(() => panel.value === 'password'
  ? '修改后，其他设备上的旧登录状态将失效。'
  : panel.value === 'close'
    ? '验证当前密码后注销账号，此操作无法撤销。'
    : '验证当前密码，保护账号不被继续使用。')
const submitLabel = computed(() => saving.value
  ? '正在处理…'
  : panel.value === 'password'
    ? '确认修改'
    : panel.value === 'close'
      ? '确认注销'
      : '退出其他设备')

function goBack() {
  uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/settings/index' }) })
}

function openPhoneChange() {
  uni.navigateTo({ url: '/pages/security/phone' })
}

function warn(title: string) {
  uni.showToast({ title, icon: 'none' })
}

function clearForm() {
  currentPassword.value = ''
  newPassword.value = ''
  confirmation.value = ''
}

function openPanel(value: Exclude<Panel, ''>) {
  clearForm()
  panel.value = value
}

function closePanel(force = false) {
  if (!saving.value || force) {
    panel.value = ''
    clearForm()
  }
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    security.value = (await getAccountSecurity()).data
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '账号安全状态加载失败'
  } finally {
    loading.value = false
  }
}

function confirmClose() {
  uni.showModal({
    title: '注销账号',
    content: '注销后将无法登录当前账号，资料也会被停用。确定继续吗？',
    confirmText: '继续注销',
    confirmColor: '#ef5a4f',
    success: ({ confirm }) => {
      if (confirm) openPanel('close')
    },
  })
}

async function submit() {
  if (currentPassword.value.length < 8) return warn('请输入正确的当前密码')
  if (panel.value === 'password') {
    if (newPassword.value.length < 8 || newPassword.value.length > 20) return warn('新密码长度须为 8–20 位')
    if (newPassword.value === currentPassword.value) return warn('新密码不能与当前密码相同')
    if (newPassword.value !== confirmation.value) return warn('两次输入的新密码不一致')
  }

  saving.value = true
  try {
    if (panel.value === 'close') {
      await closeAccount(currentPassword.value)
      await logout()
      uni.showToast({ title: '账号已注销', icon: 'success' })
      setTimeout(() => uni.reLaunch({ url: '/pages/auth/login' }), 350)
      return
    }
    if (panel.value === 'password') {
      await changePassword(currentPassword.value, newPassword.value)
      uni.showToast({ title: '密码修改成功', icon: 'success' })
    } else {
      await logoutOtherSessions(currentPassword.value)
      uni.showToast({ title: '其他设备已退出', icon: 'success' })
    }
    closePanel(true)
    await load()
  } catch (reason) {
    warn(reason instanceof Error ? reason.message : '操作失败，请重试')
  } finally {
    saving.value = false
  }
}

onShow(() => {
  if (guardCurrentPage()) load()
})
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;

.security-page { background: $dz-surface-page; }
.security-hero {
  position: sticky;
  z-index: 20;
  top: 0;
  border-bottom: 1rpx solid transparent;
  background: $dz-surface-glass-strong;
}
.security-hero::after {
  position: absolute;
  right: 0;
  bottom: -16rpx;
  left: 0;
  height: 16rpx;
  background: linear-gradient(180deg, rgba(31, 65, 72, .045), transparent);
  content: '';
  pointer-events: none;
}
.head-space { width: 72rpx; }
.security-content {
  padding-top: $dz-space-3;
  padding-right: 40rpx;
  padding-bottom: calc($dz-space-5 + env(safe-area-inset-bottom));
  padding-left: 40rpx;
}
.panel { border: 1rpx solid $dz-border-material; background: $dz-surface-card; box-shadow: $dz-shadow-card; }

.summary {
  display: grid;
  grid-template-columns: 96rpx minmax(0, 1fr);
  gap: 0 $dz-space-3;
  padding: $dz-space-4;
  border-radius: $dz-radius-lg;
}
.summary-icon, .row-icon { display: flex; flex: none; align-items: center; justify-content: center; }
.summary-icon { width: 96rpx; height: 96rpx; border-radius: $dz-radius-md; background: $dz-brand-soft; }
.summary-icon image { width: 56rpx; height: 56rpx; }
.summary-copy { display: flex; min-width: 0; justify-content: center; flex-direction: column; }
.summary-title { display: flex; gap: 12rpx; align-items: center; }
.summary-heading { color: $dz-text-primary; font-size: $dz-fs-body-strong; line-height: $dz-lh-body-strong; }
.summary-title text {
  padding: 5rpx 12rpx;
  border-radius: $dz-radius-full;
  color: $dz-status-success-deep;
  background: $dz-status-success-soft;
  font-size: $dz-fs-micro;
  font-weight: $dz-fw-bold;
  line-height: $dz-lh-micro;
}
.summary-description { margin-top: 4rpx; color: $dz-text-secondary; font-size: $dz-fs-caption; line-height: $dz-lh-caption; }
.summary-status {
  display: grid;
  grid-column: 1 / -1;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12rpx;
  margin-top: $dz-space-3;
}
.status-item {
  display: flex;
  min-width: 0;
  min-height: 72rpx;
  align-items: center;
  justify-content: space-between;
  padding: 0 18rpx;
  border-radius: $dz-radius-sm;
  background: $dz-surface-page;
}
.status-item > text { color: $dz-text-secondary; font-size: $dz-fs-caption; }
.status-label {
  overflow: hidden;
  color: $dz-text-primary;
  font-size: $dz-fs-caption;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.status-value { display: flex; min-width: 0; gap: 8rpx; align-items: center; }
.status-dot {
  display: block;
  width: 12rpx;
  height: 12rpx;
  border: 4rpx solid $dz-status-success-soft;
  border-radius: $dz-radius-full;
  background: $dz-status-success;
  box-sizing: content-box;
}
.section-title {
  display: block;
  margin: $dz-space-4 8rpx 14rpx;
  color: $dz-text-primary;
  font-size: $dz-fs-heading;
  font-weight: $dz-fw-bold;
  line-height: $dz-lh-heading;
}
.card { overflow: hidden; border-radius: $dz-radius-lg; }
.row {
  display: flex;
  width: 100%;
  min-height: 132rpx;
  align-items: center;
  justify-content: flex-start;
  margin: 0;
  padding: 20rpx $dz-space-3;
  border: 0;
  border-bottom: 1rpx solid $dz-border-subtle;
  border-radius: 0;
  background: $dz-surface-card;
  line-height: normal;
  text-align: left;
}
.row::after { display: none; }
.row:last-child { border-bottom: 0; }
.row-icon { width: 76rpx; height: 76rpx; border-radius: $dz-radius-sm; }
.row-icon image { width: 44rpx; height: 44rpx; }
.phone-tone { background: $dz-brand-soft; }
.password-tone { background: $dz-price-soft; }
.device-tone { background: #eceafd; }
.danger-tone { background: $dz-status-danger-soft; }
.copy { display: flex; min-width: 0; gap: 4rpx; margin-left: 20rpx; flex: 1; flex-direction: column; }
.row-title { color: $dz-text-primary; font-size: $dz-fs-body-strong; line-height: $dz-lh-body-strong; }
.copy text {
  overflow: hidden;
  color: $dz-text-secondary;
  font-size: $dz-fs-caption;
  line-height: $dz-lh-caption;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.value { display: flex; flex: none; gap: 8rpx; align-items: center; margin-left: 12rpx; color: $dz-text-secondary; }
.value-label { color: $dz-text-primary; font-size: $dz-fs-body; font-variant-numeric: tabular-nums; white-space: nowrap; }
.row-chevron { color: $dz-text-tertiary; font-size: $dz-fs-heading; font-weight: $dz-fw-regular; }
.value.action-value .value-label { color: $dz-brand-deep; }
.value .danger { color: $dz-status-danger; }

.tip {
  display: flex;
  gap: $dz-space-3;
  align-items: center;
  margin-top: $dz-space-4;
  padding: $dz-space-4;
  border-radius: $dz-radius-md;
  color: $dz-status-warning-deep;
  background: $dz-status-warning-soft;
}
.tip-icon {
  display: flex;
  width: 64rpx;
  height: 64rpx;
  flex: none;
  align-items: center;
  justify-content: center;
  border-radius: $dz-radius-full;
  background: rgba(245, 166, 35, .14);
}
.tip-icon text {
  display: flex;
  width: 30rpx;
  height: 30rpx;
  align-items: center;
  justify-content: center;
  border: 2rpx solid $dz-status-warning;
  border-radius: $dz-radius-full;
  color: $dz-status-warning-deep;
  font-size: $dz-fs-micro;
  font-weight: $dz-fw-bold;
  line-height: 1;
}
.tip-copy { display: flex; min-width: 0; gap: 4rpx; flex-direction: column; }
.tip-title, .tip-copy text { font-size: $dz-fs-caption; line-height: $dz-lh-caption; }

:deep(.dz-sheet__panel) {
  right: 20rpx;
  bottom: calc(16rpx + env(safe-area-inset-bottom));
  left: 20rpx;
  overflow: hidden;
  width: auto;
  max-width: 710px;
  margin: 0 auto;
  padding-bottom: 0;
  border-bottom: 1rpx solid $dz-border-material;
  border-radius: 48rpx;
}
:deep(.dz-sheet__grabber) { width: 80rpx; height: 8rpx; margin-top: 18rpx; }
:deep(.dz-sheet__header) { padding: 20rpx 40rpx $dz-space-2; }
.sheet-content { padding: 0 40rpx 40rpx; }
.sheet-description {
  display: block;
  margin-bottom: $dz-space-3;
  color: $dz-text-secondary;
  font-size: $dz-fs-caption;
  line-height: $dz-lh-caption;
}
.form { display: flex; gap: 22rpx; flex-direction: column; }
.form label {
  display: flex;
  gap: 10rpx;
  color: $dz-text-primary;
  flex-direction: column;
  font-size: $dz-fs-caption;
  font-weight: $dz-fw-bold;
  line-height: $dz-lh-caption;
}
.password-field {
  height: 92rpx;
  padding: 0 $dz-space-3;
  border: 2rpx solid $dz-border-subtle;
  border-radius: $dz-radius-md;
  background: $dz-surface-card;
}
.password-field:focus-within { border-color: $dz-brand-primary; box-shadow: 0 0 0 8rpx $dz-brand-soft; }
.password-field input { width: 100%; height: 100%; color: $dz-text-primary; font-size: $dz-fs-body; }
.session-note {
  display: flex;
  gap: 6rpx;
  padding: $dz-space-3;
  border-radius: $dz-radius-md;
  background: $dz-price-soft;
  flex-direction: column;
}
.session-title { color: $dz-price-deep; font-size: $dz-fs-caption; line-height: $dz-lh-caption; }
.session-note text { color: $dz-text-secondary; font-size: $dz-fs-caption; line-height: $dz-lh-caption; }
.submit {
  display: flex;
  width: 100%;
  height: 92rpx;
  align-items: center;
  justify-content: center;
  margin: 0;
  border: 0;
  border-radius: $dz-radius-md;
  color: $dz-text-inverse;
  background: $dz-gradient-brand;
  box-shadow: $dz-shadow-brand;
  font-size: $dz-fs-body-strong;
  font-weight: $dz-fw-bold;
  line-height: normal;
}
.submit::after { display: none; }
.submit.dangerButton { background: $dz-status-danger; box-shadow: 0 10rpx 26rpx rgba(255, 65, 65, 0.2); }
.submit[disabled] { opacity: 0.58; }

/* #ifdef H5 */
.security-hero {
  -webkit-backdrop-filter: saturate(180%) blur(20px);
  backdrop-filter: saturate(180%) blur(20px);
}
/* #endif */

@media screen and (min-width: 480px) {
  .security-content { padding: 16px 20px 32px; }
  .summary { grid-template-columns: 56px minmax(0, 1fr); gap: 0 14px; padding: 20px; border-radius: 20px; }
  .summary-icon { width: 56px; height: 56px; border-radius: 14px; }
  .summary-icon image { width: 32px; height: 32px; }
  .summary-status { gap: 8px; margin-top: 14px; }
  .status-item { min-height: 42px; padding: 0 12px; border-radius: 10px; }
  .section-title { margin: 20px 4px 10px; }
  .card { border-radius: 18px; }
  .row { min-height: 78px; padding: 12px 16px; }
  .row-icon { width: 44px; height: 44px; border-radius: 12px; }
  .row-icon image { width: 26px; height: 26px; }
  .copy { gap: 2px; margin-left: 12px; }
  .tip { gap: 12px; margin-top: 20px; padding: 16px; border-radius: 16px; }
  .tip-icon { width: 36px; height: 36px; }
  .sheet-content { padding: 0 24px 24px; }
  .form { gap: 15px; }
  .password-field { height: 58px; padding: 0 16px; border-radius: 14px; }
  .session-note { padding: 15px; border-radius: 14px; }
  .submit { height: 58px; border-radius: 15px; }
}
</style>
