<template>
  <view class="auth-page">
    <view class="dz-safe-top" />
    <main class="auth-shell">
      <AuthBrand />
      <view class="auth-heading"><h1>欢迎回来</h1><p>发现同城好搭子</p></view>

      <view class="auth-form">
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
        <view class="auth-secondary-link">还没有账号？<text @tap="openRegister">立即注册</text></view>
      </view>

      <view class="auth-agreement" @tap="agreed = !agreed">
        <view class="agreement-check" :class="{ checked: agreed }">{{ agreed ? '✓' : '' }}</view>
        <view class="agreement-copy">我已阅读并同意 <text>《用户协议》</text> 和 <text>《隐私政策》</text></view>
      </view>
    </main>
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'

import AuthBrand from '@/components/AuthBrand.vue'
import { useSmsCode } from '@/composables/useSmsCode'
import { loginWithPassword, loginWithSms, loginWithWechatMiniProgram } from '@/services/auth'
import { returnAfterAuthentication } from '@/services/session'

const mode = ref<'password' | 'sms'>('password')
const phone = ref('')
const password = ref('')
const code = ref('')
const passwordVisible = ref(false)
const agreed = ref(false)
const submitting = ref(false)
const wechatSubmitting = ref(false)
const redirect = ref('')
const sms = useSmsCode('login')

onLoad((query) => {
  redirect.value = typeof query?.redirect === 'string' ? decodeURIComponent(query.redirect) : ''
})

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
    await loginWithWechatMiniProgram(await getWechatLoginCode(), phoneCode)
    uni.showToast({ title: '登录成功', icon: 'success' })
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
    if (mode.value === 'password') await loginWithPassword(phone.value, password.value)
    else await loginWithSms(phone.value, code.value)
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => returnAfterAuthentication(redirect.value), 350)
  } catch (error) { warn((error as Error).message) }
  finally { submitting.value = false }
}

function redirectQuery() { return redirect.value ? `&redirect=${encodeURIComponent(redirect.value)}` : '' }
function openRegister() { uni.navigateTo({ url: `/pages/auth/register?from=login${redirectQuery()}` }) }
function openReset() { uni.navigateTo({ url: `/pages/auth/reset-password?phone=${phone.value}${redirectQuery()}` }) }
</script>

<style lang="scss" scoped>
@use '../../styles/auth.scss';
.wechat-divider{display:flex;align-items:center;gap:18rpx;margin:28rpx 0 20rpx;color:#98a2b3;font-size:21rpx}.wechat-divider::before,.wechat-divider::after{height:1rpx;flex:1;background:#e1e9ea;content:''}.wechat-login{display:flex;width:100%;height:96rpx;align-items:center;justify-content:center;margin:0;border:1rpx solid #d8e7e7;border-radius:18rpx;color:#15875b;background:#f5fffa;font-size:28rpx;font-weight:650}.wechat-login[disabled]{opacity:.58}
</style>
