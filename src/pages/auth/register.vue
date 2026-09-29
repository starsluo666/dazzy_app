<template>
  <view class="auth-page">
    <DzNavBar title="注册账号" :back-action="back" />
    <main class="auth-shell">
      <AuthBrand />
      <view class="auth-heading"><h1>注册乐搭伴</h1><p>认识新朋友，发现新玩法</p></view>
      <view class="auth-form">
        <label class="auth-field"><input v-model="phone" type="number" maxlength="11" placeholder="请输入手机号" /></label>
        <label class="auth-field">
          <input v-model="code" type="number" maxlength="6" placeholder="请输入验证码" />
          <view class="auth-field-action" :class="{ disabled: sms.seconds.value > 0 }" @tap.stop="requestCode">{{ sms.seconds.value > 0 ? `${sms.seconds.value}s 后重试` : '获取验证码' }}</view>
        </label>
        <label class="auth-field"><input v-model="password" :password="!passwordVisible" maxlength="20" placeholder="设置密码（8–20位）" /><view class="auth-field-action password-eye" @tap.stop="passwordVisible = !passwordVisible">{{ passwordVisible ? '隐藏' : '显示' }}</view></label>
        <label class="auth-field"><input v-model="confirmation" :password="!confirmationVisible" maxlength="20" placeholder="再次输入密码" /><view class="auth-field-action password-eye" @tap.stop="confirmationVisible = !confirmationVisible">{{ confirmationVisible ? '隐藏' : '显示' }}</view></label>
        <button class="auth-primary" :disabled="submitting" @tap="submit">{{ submitting ? '注册中…' : '注册并登录' }}</button>
        <view class="auth-secondary-link">已有账号？<text class="brand-link" @tap="back">去登录</text></view>
      </view>
      <LegalConsent class="auth-agreement" v-model="agreed" :disabled="submitting" @read="openLegalDocument" />
    </main>
  </view>
</template>

<script setup lang="ts">
import { navigateBackOr } from '@/utils/navigation'
import DzNavBar from '@/components/DzNavBar.vue'
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'
import AuthBrand from '@/components/AuthBrand.vue'
import LegalConsent from '@/components/LegalConsent.vue'
import { openLegalDocument } from '@/content/legal'
import { useSmsCode } from '@/composables/useSmsCode'
import { register } from '@/services/auth'
import { clearPendingInviteCode, getPendingInviteCode, savePendingInviteCode } from '@/services/growth'
import { returnAfterAuthentication } from '@/services/session'

const phone = ref(''), code = ref(''), password = ref(''), confirmation = ref('')
const passwordVisible = ref(false), confirmationVisible = ref(false), agreed = ref(false), submitting = ref(false)
const redirect = ref('')
const sms = useSmsCode('register')
const warn = (title: string) => uni.showToast({ title, icon: 'none' })
const validPhone = () => /^1[3-9]\d{9}$/.test(phone.value)

onLoad((query) => {
  redirect.value = typeof query?.redirect === 'string' ? decodeURIComponent(query.redirect) : ''
  if (typeof query?.invite_code === 'string') savePendingInviteCode(query.invite_code)
})

async function requestCode() {
  if (!validPhone()) return warn('请输入正确的手机号')
  try { await sms.send(phone.value) } catch (error) { warn((error as Error).message) }
}
async function submit() {
  if (!validPhone()) return warn('请输入正确的手机号')
  if (code.value.length !== 6) return warn('请输入 6 位验证码')
  if (password.value.length < 8 || password.value.length > 20) return warn('密码长度须为 8–20 位')
  if (password.value !== confirmation.value) return warn('两次输入的密码不一致')
  if (!agreed.value) return warn('请先阅读并同意用户协议和隐私政策')
  submitting.value = true
  try {
    await register(phone.value, code.value, password.value, getPendingInviteCode())
    clearPendingInviteCode()
    uni.showToast({ title: '注册成功', icon: 'success' })
    setTimeout(() => returnAfterAuthentication(redirect.value), 350)
  } catch (error) { warn((error as Error).message) }
  finally { submitting.value = false }
}
function back() {
  navigateBackOr(() => uni.reLaunch({ url: `/pages/auth/login${redirect.value ? `?redirect=${encodeURIComponent(redirect.value)}` : ''}` }))
}
</script>

<style lang="scss" scoped>
@use '../../styles/auth.scss';
.auth-shell { padding-top: 8rpx; }
.auth-heading { margin-top: 28rpx; }
.auth-form { margin-top: 42rpx; }
.auth-agreement { margin-top: 34rpx; }
</style>
