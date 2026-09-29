<template>
  <view class="auth-page">
    <DzNavBar title="重置密码" :back-action="back" />
    <main class="auth-shell">
      <AuthBrand />
      <view class="auth-heading"><h1>重置密码</h1><p>验证手机号后设置新密码</p></view>
      <view class="auth-form">
        <label class="auth-field"><input v-model="phone" type="number" maxlength="11" placeholder="请输入注册手机号" /></label>
        <label class="auth-field"><input v-model="code" type="number" maxlength="6" placeholder="请输入验证码" /><view class="auth-field-action" :class="{ disabled: sms.seconds.value > 0 }" @tap.stop="requestCode">{{ sms.seconds.value > 0 ? `${sms.seconds.value}s 后重试` : '获取验证码' }}</view></label>
        <label class="auth-field"><input v-model="password" :password="!passwordVisible" maxlength="20" placeholder="设置新密码（8–20位）" /><view class="auth-field-action password-eye" @tap.stop="passwordVisible = !passwordVisible">{{ passwordVisible ? '隐藏' : '显示' }}</view></label>
        <label class="auth-field"><input v-model="confirmation" :password="!confirmationVisible" maxlength="20" placeholder="再次输入新密码" /><view class="auth-field-action password-eye" @tap.stop="confirmationVisible = !confirmationVisible">{{ confirmationVisible ? '隐藏' : '显示' }}</view></label>
        <button class="auth-primary" :disabled="submitting" @tap="submit">{{ submitting ? '重置中…' : '确认重置' }}</button>
        <view class="auth-secondary-link">想起密码了？<text class="brand-link" @tap="back">返回登录</text></view>
      </view>
      <view class="auth-security-note"><i>♢</i>重置成功后，其他设备将重新登录</view>
    </main>
  </view>
</template>

<script setup lang="ts">
import { navigateBackOr } from '@/utils/navigation'
import DzNavBar from '@/components/DzNavBar.vue'
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'
import AuthBrand from '@/components/AuthBrand.vue'
import { useSmsCode } from '@/composables/useSmsCode'
import { resetPassword } from '@/services/auth'

const phone = ref(''), code = ref(''), password = ref(''), confirmation = ref('')
const passwordVisible = ref(false), confirmationVisible = ref(false), submitting = ref(false)
const redirect = ref('')
const sms = useSmsCode('reset_password')
const warn = (title: string) => uni.showToast({ title, icon: 'none' })
const validPhone = () => /^1[3-9]\d{9}$/.test(phone.value)

onLoad((query) => {
  if (typeof query?.phone === 'string') phone.value = query.phone
  if (typeof query?.redirect === 'string') redirect.value = decodeURIComponent(query.redirect)
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
  submitting.value = true
  try {
    await resetPassword(phone.value, code.value, password.value)
    uni.showToast({ title: '密码重置成功', icon: 'success' })
    setTimeout(() => uni.reLaunch({ url: loginUrl() }), 500)
  } catch (error) { warn((error as Error).message) }
  finally { submitting.value = false }
}
function loginUrl() { return `/pages/auth/login${redirect.value ? `?redirect=${encodeURIComponent(redirect.value)}` : ''}` }
function back() { navigateBackOr(() => uni.reLaunch({ url: loginUrl() })) }
</script>

<style lang="scss" scoped>
@use '../../styles/auth.scss';
.auth-shell { padding-top: 8rpx; }
.auth-heading { margin-top: 28rpx; }
.auth-form { margin-top: 42rpx; }
</style>
