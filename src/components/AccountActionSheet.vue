<template>
  <DzBottomSheet :visible="Boolean(panel)" :title="panelTitle" @close="closePanel()">
    <view class="account-action-sheet" role="dialog" aria-modal="true" :aria-label="panelTitle" @keydown.esc="closePanel()">
      <NetworkState v-if="loading" message="正在验证账号状态…" />
      <NetworkState v-else-if="error" :message="error" error @retry="loadSecurity" />
      <template v-else-if="security">
        <text class="sheet-description">{{ panelDescription }}</text>
        <view class="form">
          <label v-if="needsInitialPassword && panel === 'password'">
            <text>验证手机号 {{ security.phone_masked }}</text>
            <view class="password-field code-field">
              <input v-model="initialCode" type="number" maxlength="6" placeholder="输入 6 位验证码" />
              <button :disabled="sendingCode || codeSeconds > 0 || saving" role="button" :tabindex="sendingCode || codeSeconds > 0 || saving ? -1 : 0" @tap="sendInitialCode" @keydown.enter.prevent="sendInitialCode" @keydown.space.prevent="sendInitialCode">{{ codeSeconds > 0 ? `${codeSeconds}s` : sendingCode ? '发送中…' : '获取验证码' }}</button>
            </view>
          </label>
          <label v-else>
            <text>当前登录密码</text>
            <view class="password-field"><input v-model="currentPassword" password placeholder="请输入当前密码" maxlength="20" /></view>
          </label>
          <template v-if="panel === 'password'">
            <label><text>新密码</text><view class="password-field"><input v-model="newPassword" password placeholder="8–20 位，建议包含字母和数字" maxlength="20" /></view></label>
            <label><text>确认新密码</text><view class="password-field"><input v-model="confirmation" password placeholder="请再次输入新密码" maxlength="20" /></view></label>
          </template>
          <view v-else class="closure-note">
            <strong>5 个工作日后完成注销</strong>
            <text>提交后将退出所有设备。等待期内成功登录会撤销申请；注销完成后无法恢复。若有待核实的交易或投诉，将暂停处理。</text>
          </view>
          <LegalConsent v-if="panel === 'close'" v-model="closureAgreed" :documents="['closure']" :disabled="saving" @read="readClosureAgreement" />
          <button class="submit dz-tappable" :class="{ 'submit--danger': panel === 'close' }" :disabled="saving || sendingCode || (panel === 'close' && !closureAgreed)" role="button" :tabindex="saving || sendingCode || (panel === 'close' && !closureAgreed) ? -1 : 0" hover-class="dz-pressed" @tap="submit" @keydown.enter.prevent="submit" @keydown.space.prevent="submit">{{ submitLabel }}</button>
        </view>
      </template>
    </view>
  </DzBottomSheet>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import DzBottomSheet from '@/components/DzBottomSheet.vue'
import NetworkState from '@/components/NetworkState.vue'
import LegalConsent from '@/components/LegalConsent.vue'
import { legalDocumentUrl } from '@/content/legal'
import { changePassword, closeAccount, getAccountSecurity, sendInitialPasswordCode, setInitialPassword } from '@/services/auth'
import { clearSession } from '@/services/session'
import { formatBusinessDateTime } from '@/utils/formatters'
import type { AccountSecurity } from '@/types/api'

type Action = 'password' | 'close'
const panel = ref<Action | ''>('')
const security = ref<AccountSecurity | null>(null)
const loading = ref(false), error = ref(''), saving = ref(false), confirmingClose = ref(false)
const currentPassword = ref(''), newPassword = ref(''), confirmation = ref(''), initialCode = ref('')
const sendingCode = ref(false), codeSeconds = ref(0)
const closureAgreed = ref(false)
let resumeClosureAfterReading = false
let codeTimer: ReturnType<typeof setInterval> | undefined
let disposed = false, loadVersion = 0
const needsInitialPassword = computed(() => security.value?.password_set === false)
const panelTitle = computed(() => panel.value === 'close' ? '注销账号' : needsInitialPassword.value ? '设置登录密码' : '修改登录密码')
const panelDescription = computed(() => panel.value === 'close'
  ? '验证当前密码后提交注销申请，等待期为 5 个工作日（按国内节假日和调休计算）。'
  : needsInitialPassword.value
    ? '验证绑定手机号后设置密码，无需旧密码。设置后其他设备需重新登录。'
    : '修改后，其他设备上的旧登录状态将失效。')
const submitLabel = computed(() => saving.value ? '正在处理…' : panel.value === 'close' ? '提交注销申请' : needsInitialPassword.value ? '确认设置' : '确认修改')

function warn(title: string) { uni.showToast({ title, icon: 'none' }) }
function clearForm() { currentPassword.value = ''; newPassword.value = ''; confirmation.value = ''; initialCode.value = ''; closureAgreed.value = false }
function closePanel(force = false) {
  if ((saving.value || sendingCode.value) && !force) return
  if (!force) resumeClosureAfterReading = false
  loadVersion += 1
  panel.value = ''
  loading.value = false
  error.value = ''
  security.value = null
  clearForm()
}
function open(action: Action) {
  if (disposed || saving.value || sendingCode.value || loading.value || confirmingClose.value) return
  if (action === 'close') {
    confirmingClose.value = true
    uni.showModal({
      title: '注销账号',
      content: '申请后将进入 5 个工作日等待期并退出登录。期间成功登录可撤销申请，注销完成后无法恢复。确定继续吗？',
      confirmText: '继续注销',
      confirmColor: '#c9472a',
      success: ({ confirm }) => { if (confirm && !disposed) void openPanel('close') },
      complete: () => { confirmingClose.value = false },
    })
  } else void openPanel('password')
}
async function openPanel(action: Action) {
  clearForm()
  security.value = null
  panel.value = action
  await loadSecurity()
}
async function loadSecurity() {
  if (!panel.value || saving.value) return
  const version = ++loadVersion
  loading.value = true
  error.value = ''
  try {
    const response = await getAccountSecurity()
    if (disposed || version !== loadVersion) return
    security.value = response.data
    if (panel.value === 'close' && needsInitialPassword.value) {
      closePanel(true)
      uni.showModal({
        title: '请先设置登录密码',
        content: '你的账号尚未设置密码。请先验证绑定手机号并设置密码，再进行注销操作。',
        confirmText: '去设置',
        success: ({ confirm }) => { if (confirm && !disposed) open('password') },
      })
    }
  } catch (reason) {
    if (!disposed && version === loadVersion) error.value = reason instanceof Error ? reason.message : '账号状态加载失败'
  } finally { if (!disposed && version === loadVersion) loading.value = false }
}
async function submit() {
  if (!panel.value || !security.value || loading.value || error.value || saving.value || sendingCode.value) return
  const action = panel.value
  if (action === 'close' && !closureAgreed.value) return warn('请先阅读并同意账号注销协议')
  const settingInitial = needsInitialPassword.value && action === 'password'
  if (settingInitial) {
    if (!/^\d{6}$/.test(initialCode.value)) return warn('请输入 6 位短信验证码')
  } else if (currentPassword.value.length < 8) return warn('请输入正确的当前密码')
  if (action === 'password') {
    if (newPassword.value.length < 8 || newPassword.value.length > 20) return warn('新密码长度须为 8–20 位')
    if (newPassword.value === currentPassword.value) return warn('新密码不能与当前密码相同')
    if (newPassword.value !== confirmation.value) return warn('两次输入的新密码不一致')
  }
  saving.value = true
  try {
    if (action === 'close') {
      const { data } = await closeAccount(currentPassword.value)
      if (data?.status !== 'pending' || data.closed !== false || data.working_days !== 5 || !Number.isFinite(Date.parse(data.execute_after))) {
        throw new Error('注销申请状态异常，请重新登录或联系客服确认')
      }
      // The server has already revoked every session. Do not refresh or issue
      // a remote logout with invalid credentials (nor accidentally log in again).
      clearSession()
      closePanel(true)
      if (!disposed) uni.showModal({
        title: '注销申请已提交',
        content: `预计于 ${formatBusinessDateTime(data.execute_after)}（北京时间）完成注销。等待期内成功登录将撤销申请；如出现待核实业务，处理会暂停。`,
        showCancel: false,
        confirmText: '我知道了',
        success: () => uni.reLaunch({ url: '/pages/auth/login?closurePending=1' }),
      })
    } else {
      if (settingInitial) await setInitialPassword(initialCode.value, newPassword.value)
      else await changePassword(currentPassword.value, newPassword.value)
      closePanel(true)
      uni.showToast({ title: settingInitial ? '密码设置成功' : '密码修改成功', icon: 'success' })
    }
  } catch (reason) { warn(reason instanceof Error ? reason.message : '操作失败，请重试') }
  finally { saving.value = false }
}
async function sendInitialCode() {
  if (panel.value !== 'password' || !needsInitialPassword.value || loading.value || sendingCode.value || codeSeconds.value > 0 || saving.value) return
  sendingCode.value = true
  const version = loadVersion
  try {
    const { data } = await sendInitialPasswordCode()
    if (disposed || version !== loadVersion || panel.value !== 'password') return
    if (import.meta.env.DEV && data.debug_code) initialCode.value = data.debug_code
    codeSeconds.value = data.retry_after
    if (codeTimer) clearInterval(codeTimer)
    codeTimer = setInterval(() => {
      codeSeconds.value = Math.max(0, codeSeconds.value - 1)
      if (!codeSeconds.value && codeTimer) clearInterval(codeTimer)
    }, 1000)
    uni.showToast({ title: '验证码已发送至绑定手机号', icon: 'none' })
  } catch (reason) { warn(reason instanceof Error ? reason.message : '验证码发送失败') }
  finally { sendingCode.value = false }
}
function readClosureAgreement() {
  if (panel.value !== 'close' || saving.value || disposed) return
  resumeClosureAfterReading = true
  uni.navigateTo({
    url: legalDocumentUrl('closure'),
    fail: () => { resumeClosureAfterReading = false; warn('协议页面打开失败，请重试') },
  })
}
function resume() {
  if (!resumeClosureAfterReading || disposed || saving.value) return
  resumeClosureAfterReading = false
  void openPanel('close')
}
onBeforeUnmount(() => { disposed = true; loadVersion += 1; resumeClosureAfterReading = false; clearForm(); if (codeTimer) clearInterval(codeTimer) })
defineExpose({ open, close: closePanel, resume })
</script>

<style lang="scss" scoped>
@use '../styles/tokens.scss' as *;
.account-action-sheet { padding: $dz-space-2 0; }
.sheet-description { display: block; margin-bottom: $dz-space-4; color: $dz-text-secondary; font-size: max(12px, #{$dz-fs-caption}); line-height: 1.6; }
.form { display: flex; flex-direction: column; gap: $dz-space-3; }
.form label { display: flex; flex-direction: column; gap: $dz-space-2; color: $dz-text-primary; font-size: max(12px, #{$dz-fs-caption}); font-weight: $dz-fw-semibold; line-height: 1.5; }
.password-field { display: flex; align-items: center; min-height: max(44px, 92rpx); padding: 0 $dz-space-3; border: 1rpx solid $dz-border-subtle; border-radius: $dz-radius-md; background: $dz-surface-card; }
.password-field:focus-within { border-color: $dz-brand-primary; box-shadow: 0 0 0 4rpx $dz-brand-soft; }
.password-field input { width: 100%; min-width: 0; height: max(44px, 88rpx); color: $dz-text-primary; font-size: max(14px, #{$dz-fs-body}); font-weight: $dz-fw-regular; }
.code-field input { flex: 1; }
.code-field button { display: flex; flex: none; align-items: center; justify-content: center; min-height: 44px; margin: 0; padding: 0 $dz-space-2; border: 0; color: $dz-list-accent; background: transparent; font-size: max(12px, #{$dz-fs-caption}); line-height: 1.4; }
.code-field button[disabled] { color: $dz-text-secondary; }
.closure-note { display: flex; flex-direction: column; gap: $dz-space-1; padding: $dz-space-3; border-radius: $dz-radius-md; background: $dz-status-danger-soft; font-size: max(12px, #{$dz-fs-caption}); line-height: 1.6; }
.closure-note strong { color: $dz-status-danger-deep; }
.closure-note text { color: $dz-text-secondary; }
.submit { display: flex; align-items: center; justify-content: center; width: 100%; min-height: max(44px, 92rpx); margin: $dz-space-2 0 0; padding: $dz-space-2 $dz-space-4; border: 0; border-radius: $dz-radius-md; color: $dz-text-inverse; background: $dz-gradient-brand; font-size: max(14px, #{$dz-fs-body-strong}); font-weight: $dz-fw-bold; line-height: 1.4; box-sizing: border-box; }
.submit--danger { background: $dz-status-danger-deep; }
.submit[disabled] { opacity: .6; }
.submit::after, .code-field button::after { border: 0; }
.submit:focus-visible, .code-field button:focus-visible { outline: 2px solid $dz-text-primary; outline-offset: 2px; }
</style>
