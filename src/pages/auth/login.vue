<template>
  <view class="auth-page">
    <DzNavBar title="登录" :back-action="bindingWechat ? cancelWechatBind : undefined" />
    <main class="auth-shell">
      <AuthBrand />
      <view class="auth-heading"><h1>欢迎回来</h1><p>发现同城好搭子</p></view>
      <view v-if="closurePending" class="closure-pending-notice">注销申请已提交。等待期内成功登录会撤销注销申请；如需继续注销，请勿重新登录。</view>

      <view v-if="bindingWechat" class="auth-form wechat-bind-form">
        <view class="wechat-bind-heading"><strong>绑定登录手机号</strong><text>首次使用微信登录，请验证手机号。已注册会绑定原账号，未注册会创建新账号。</text></view>
        <label class="auth-field"><input v-model="wechatPhone" type="number" maxlength="11" placeholder="请输入登录手机号" /></label>
        <label class="auth-field">
          <input v-model="wechatCode" type="number" maxlength="6" placeholder="请输入短信验证码" />
          <view class="auth-field-action" :class="{ disabled: wechatCodeSeconds > 0 }" @tap.stop="requestWechatCode">
            {{ wechatCodeSeconds > 0 ? `${wechatCodeSeconds}s 后重试` : '获取验证码' }}
          </view>
        </label>
        <button class="auth-primary" :disabled="wechatSubmitting" @tap="submitWechatBind">{{ wechatSubmitting ? '绑定中…' : '验证并登录' }}</button>
        <view class="auth-secondary-link"><text @tap="cancelWechatBind">返回其他登录方式</text></view>
      </view>
      <view v-else class="auth-form">
        <view class="auth-tabs" role="tablist">
          <view class="auth-tab" :class="{ active: mode === 'password' }" role="tab" @tap="mode = 'password'">密码登录</view>
          <view class="auth-tab" :class="{ active: mode === 'sms' }" role="tab" @tap="mode = 'sms'">验证码登录</view>
        </view>

        <label class="auth-field">
          <input v-model="phone" type="number" maxlength="11" placeholder="请输入手机号" />
        </label>

        <label v-if="mode === 'password'" class="auth-field">
          <input v-model="password" :password="!passwordVisible" maxlength="20" placeholder="请输入密码" />
          <view class="auth-field-action password-eye" @tap.stop="passwordVisible = !passwordVisible">{{ passwordVisible ? '隐藏' : '显示' }}</view>
        </label>
        <label v-else class="auth-field">
          <input v-model="code" type="number" maxlength="6" placeholder="请输入验证码" />
          <view class="auth-field-action" :class="{ disabled: sms.seconds.value > 0 }" @tap.stop="requestCode">
            {{ sms.seconds.value > 0 ? `${sms.seconds.value}s 后重试` : '获取验证码' }}
          </view>
        </label>

        <view v-if="mode === 'password'" class="auth-inline-link" @tap="openReset">忘记密码</view>
        <button class="auth-primary" :disabled="submitting" @tap="submit">{{ submitting ? '登录中…' : '登录' }}</button>
        <!-- #ifdef MP-WEIXIN -->
        <view class="wechat-divider"><text>或</text></view>
        <button class="wechat-login" open-type="getPhoneNumber" :disabled="wechatSubmitting" @getphonenumber="wechatLogin">
          {{ wechatSubmitting ? '微信登录中…' : '微信一键登录' }}
        </button>
        <!-- #endif -->
        <!-- #ifdef H5 || APP-PLUS -->
        <template v-if="wechatAvailable">
          <view class="wechat-divider"><text>或</text></view>
          <button class="wechat-login" :disabled="wechatSubmitting" @tap="startWechatLogin">
            {{ wechatSubmitting ? '微信登录中…' : '微信登录' }}
          </button>
        </template>
        <!-- #endif -->
        <view class="auth-secondary-link">还没有账号？<text @tap="openRegister">立即注册</text></view>
      </view>

      <LegalConsent class="auth-agreement" v-model="agreed" :disabled="submitting || wechatSubmitting" @read="openLegalDocument" />
    </main>
  </view>
</template>

<script setup lang="ts">
import DzNavBar from '@/components/DzNavBar.vue'
import { onLoad } from '@dcloudio/uni-app'
import { onUnmounted, ref } from 'vue'

import AuthBrand from '@/components/AuthBrand.vue'
import LegalConsent from '@/components/LegalConsent.vue'
import { openLegalDocument } from '@/content/legal'
import { useSmsCode } from '@/composables/useSmsCode'
import { bindWechatPhone, getWechatH5AuthorizeUrl, getWechatMobileLoginTicket, loginWithPassword, loginWithSms, loginWithWechatMiniProgram, resolveWechatLogin, sendWechatBindCode } from '@/services/auth'
import { returnAfterAuthentication } from '@/services/session'
import { clearPendingInviteCode, getPendingInviteCode, savePendingInviteCode } from '@/services/growth'
import { isWechatBrowser } from '@/services/wechatPay'
import type { AuthSession } from '@/types/api'

const mode = ref<'password' | 'sms'>('password')
const phone = ref('')
const password = ref('')
const code = ref('')
const passwordVisible = ref(false)
const agreed = ref(false)
const closurePending = ref(false)
const submitting = ref(false)
const wechatSubmitting = ref(false)
const wechatAvailable = ref(false)
const bindingWechat = ref(false)
const wechatTicket = ref('')
const wechatPhone = ref('')
const wechatCode = ref('')
const wechatCodeSeconds = ref(0)
let wechatCodeTimer: ReturnType<typeof setInterval> | undefined
const redirect = ref('')
const sms = useSmsCode('login')

onLoad((query) => {
  closurePending.value = query?.closurePending === '1'
  redirect.value = typeof query?.redirect === 'string'
    ? decodeURIComponent(query.redirect)
    : String(uni.getStorageSync('wechatLoginRedirect') || '')
  if (typeof query?.invite_code === 'string') savePendingInviteCode(query.invite_code)
  // #ifdef H5
  wechatAvailable.value = isWechatBrowser()
  if (query?.wechatError === 'cancelled') {
    uni.removeStorageSync('wechatLoginState')
    warn('已取消微信授权')
  }
  if (typeof query?.wechatTicket === 'string') {
    removeWechatTicketFromUrl()
    const expectedState = String(uni.getStorageSync('wechatLoginState') || '')
    uni.removeStorageSync('wechatLoginState')
    if (!expectedState || query.wechatState !== expectedState) warn('微信授权状态不匹配，请重新登录')
    else void completeWechatLogin(query.wechatTicket)
  }
  // #endif
  // #ifdef APP-PLUS
  uni.getProvider({
    service: 'oauth',
    success: result => {
      const providers = result.provider as string[] | undefined
      wechatAvailable.value = Boolean(providers?.includes('weixin'))
    },
  })
  // #endif
})

onUnmounted(() => { if (wechatCodeTimer) clearInterval(wechatCodeTimer) })

function removeWechatTicketFromUrl() {
  // #ifdef H5
  const current = new URL(window.location.href)
  const [route, query = ''] = current.hash.replace(/^#/, '').split('?')
  const params = new URLSearchParams(query)
  params.delete('wechatTicket')
  params.delete('wechatState')
  const cleanQuery = params.toString()
  current.hash = `#${route}${cleanQuery ? `?${cleanQuery}` : ''}`
  current.searchParams.delete('wechatTicket')
  current.searchParams.delete('wechatState')
  window.history.replaceState(window.history.state, '', current.toString())
  // #endif
}

function finishWechatLogin(session?: AuthSession) {
  uni.removeStorageSync('wechatLoginRedirect')
  clearPendingInviteCode()
  uni.showToast({ title: session?.closure_cancelled ? '登录成功，注销申请已撤销' : '登录成功', icon: 'success' })
  setTimeout(() => returnAfterAuthentication(redirect.value), 350)
}

async function completeWechatLogin(ticket: string) {
  wechatSubmitting.value = true
  try {
    const result = await resolveWechatLogin(ticket)
    if (result.status === 'authenticated') { finishWechatLogin(result.session); return }
    wechatTicket.value = ticket
    bindingWechat.value = true
  } catch (error) { warn(error instanceof Error ? error.message : '微信登录失败') }
  finally { wechatSubmitting.value = false }
}

async function startWechatLogin() {
  if (!agreed.value) return warn('请先阅读并同意用户协议和隐私政策')
  if (wechatSubmitting.value) return
  wechatSubmitting.value = true
  try {
    // #ifdef H5
    uni.setStorageSync('wechatLoginRedirect', redirect.value)
    const authorization = (await getWechatH5AuthorizeUrl()).data
    uni.setStorageSync('wechatLoginState', authorization.state)
    window.location.assign(authorization.authorize_url)
    return
    // #endif
    // #ifdef APP-PLUS
    const code = await new Promise<string>((resolve, reject) => {
      uni.login({
        provider: 'weixin',
        onlyAuthorize: true,
        success: result => result.code ? resolve(result.code) : reject(new Error('微信授权未返回凭证')),
        fail: () => reject(new Error('微信授权失败，请确认已安装微信')),
      } as UniApp.LoginOptions & { onlyAuthorize: boolean })
    })
    const ticket = (await getWechatMobileLoginTicket(code)).data.ticket
    await completeWechatLogin(ticket)
    // #endif
  } catch (error) { warn(error instanceof Error ? error.message : '微信登录失败') }
  finally { wechatSubmitting.value = false }
}

async function requestWechatCode() {
  if (!/^1[3-9]\d{9}$/.test(wechatPhone.value)) return warn('请输入正确的手机号')
  if (wechatCodeSeconds.value || !wechatTicket.value) return
  try {
    const result = (await sendWechatBindCode(wechatTicket.value, wechatPhone.value)).data
    wechatCodeSeconds.value = result.retry_after
    wechatCodeTimer = setInterval(() => {
      wechatCodeSeconds.value -= 1
      if (wechatCodeSeconds.value <= 0 && wechatCodeTimer) clearInterval(wechatCodeTimer)
    }, 1000)
  } catch (error) { warn(error instanceof Error ? error.message : '验证码发送失败') }
}

async function submitWechatBind() {
  if (!/^1[3-9]\d{9}$/.test(wechatPhone.value)) return warn('请输入正确的手机号')
  if (!/^\d{6}$/.test(wechatCode.value)) return warn('请输入 6 位验证码')
  if (!agreed.value) return warn('请先阅读并同意用户协议和隐私政策')
  wechatSubmitting.value = true
  try {
    const result = await bindWechatPhone(wechatTicket.value, wechatPhone.value, wechatCode.value, getPendingInviteCode())
    finishWechatLogin(result.session)
  } catch (error) { warn(error instanceof Error ? error.message : '绑定失败，请重试') }
  finally { wechatSubmitting.value = false }
}

function cancelWechatBind() {
  bindingWechat.value = false
  wechatTicket.value = ''
  wechatPhone.value = ''
  wechatCode.value = ''
}

function validPhone() { return /^1[3-9]\d{9}$/.test(phone.value) }
function warn(title: string) { uni.showToast({ title, icon: 'none' }) }

function getWechatLoginCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: (result) => result.code ? resolve(result.code) : reject(new Error('微信登录凭证获取失败')),
      fail: () => reject(new Error('微信登录凭证获取失败')),
    })
  })
}

async function wechatLogin(event: { detail?: { code?: string; errMsg?: string } }) {
  if (!agreed.value) return warn('请先阅读并同意用户协议和隐私政策')
  const phoneCode = event.detail?.code
  if (!phoneCode) return warn(event.detail?.errMsg?.includes('deny') ? '需要授权手机号才能首次登录' : '微信手机号授权失败')
  wechatSubmitting.value = true
  try {
    const session = await loginWithWechatMiniProgram(await getWechatLoginCode(), phoneCode, getPendingInviteCode())
    clearPendingInviteCode()
    uni.showToast({ title: session.closure_cancelled ? '登录成功，注销申请已撤销' : '登录成功', icon: 'success' })
    setTimeout(() => returnAfterAuthentication(redirect.value), 350)
  } catch (error) { warn(error instanceof Error ? error.message : '微信登录失败') }
  finally { wechatSubmitting.value = false }
}

async function requestCode() {
  if (!validPhone()) return warn('请输入正确的手机号')
  try { await sms.send(phone.value) } catch (error) { warn((error as Error).message) }
}

async function submit() {
  if (!validPhone()) return warn('请输入正确的手机号')
  if (!agreed.value) return warn('请先阅读并同意用户协议和隐私政策')
  if (mode.value === 'password' && password.value.length < 8) return warn('请输入 8–20 位密码')
  if (mode.value === 'sms' && code.value.length !== 6) return warn('请输入 6 位验证码')
  submitting.value = true
  try {
    const session = mode.value === 'password'
      ? await loginWithPassword(phone.value, password.value)
      : await loginWithSms(phone.value, code.value)
    clearPendingInviteCode()
    uni.showToast({ title: session.closure_cancelled ? '登录成功，注销申请已撤销' : '登录成功', icon: 'success' })
    setTimeout(() => returnAfterAuthentication(redirect.value), 350)
  } catch (error) { warn((error as Error).message) }
  finally { submitting.value = false }
}

function redirectQuery() { return redirect.value ? `&redirect=${encodeURIComponent(redirect.value)}` : '' }
function openRegister() {
  const inviteCode = getPendingInviteCode()
  uni.navigateTo({ url: `/pages/auth/register?from=login${redirectQuery()}${inviteCode ? `&invite_code=${encodeURIComponent(inviteCode)}` : ''}` })
}
function openReset() { uni.navigateTo({ url: `/pages/auth/reset-password?phone=${phone.value}${redirectQuery()}` }) }
</script>

<style lang="scss" scoped>
@use '../../styles/auth.scss';
.closure-pending-notice { margin-bottom: 24rpx; padding: 24rpx; border-radius: 18rpx; color: #784d2b; background: #fff3e7; font-size: max(12px, 24rpx); line-height: 1.6; }
.wechat-divider{display:flex;align-items:center;gap:18rpx;margin:28rpx 0 20rpx;color:#98a2b3;font-size:21rpx}.wechat-divider::before,.wechat-divider::after{height:1rpx;flex:1;background:#e1e9ea;content:''}.wechat-login{display:flex;width:100%;height:96rpx;align-items:center;justify-content:center;margin:0;border:1rpx solid #d8e7e7;border-radius:18rpx;color:#15875b;background:#f5fffa;font-size:28rpx;font-weight:650}.wechat-login[disabled]{opacity:.58}
.wechat-bind-heading{display:flex;flex-direction:column;gap:10rpx;margin-bottom:24rpx}.wechat-bind-heading strong{font-size:32rpx;color:#172b35}.wechat-bind-heading text{font-size:24rpx;line-height:1.55;color:#667580}
</style>
