<template>
  <view class="dz-page apply-page">
    <view class="hero">
      <view class="dz-safe-top" />
      <header class="nav dz-container">
        <button aria-label="返回" @tap="goBack">‹</button>
        <strong>成为达人</strong>
        <view />
      </header>
      <section class="hero-poster dz-container">
        <view class="poster-frame">
          <image
            src="/static/providers/provider-application-hero-v1.webp"
            mode="aspectFill"
            aria-label="城市摄影兴趣服务插画"
          />
          <view class="hero-copy">
            <strong>{{ heroTitle }}</strong>
            <text>{{ heroText }}</text>
          </view>
        </view>
      </section>
    </view>

    <main class="dz-container content">
      <NetworkState v-if="loading" message="正在加载申请资料…" />
      <NetworkState v-else-if="error" :message="error" action-text="重新加载" @action="load" />

      <template v-else-if="locked">
        <section class="status-card">
          <view class="status-icon">
            {{ application?.status === 'approved' ? '✓' : '…' }}
          </view>
          <strong>{{ statusTitle }}</strong>
          <text>{{ statusText }}</text>
        </section>
      </template>

      <template v-else>
        <section v-if="application?.status === 'rejected'" class="reject" role="alert">
          <strong>申请未通过</strong>
          <text>{{ application.rejection_reason || '请完善资料后重新提交。' }}</text>
        </section>

        <view class="section-heading">
          <strong>入驻意向</strong>
          <text>提交基础信息，正式资料在达人端完善</text>
        </view>

        <section class="form-card">
          <view class="row">
            <view class="row-label">
              <text>性别</text>
              <small>同步个人资料</small>
            </view>
            <picker :range="genderOptions" range-key="label" :value="genderIndex" @change="chooseGender">
              <view>{{ genderLabel }} <b>›</b></view>
            </picker>
          </view>

          <label>
            <text>达人简介</text>
            <textarea
              v-model="form.bio"
              maxlength="500"
              placeholder="介绍你的特长、性格和可提供的陪伴体验（至少10字）"
            />
            <small>{{ form.bio.length }}/500</small>
          </label>

          <view class="row">
            <text>服务城市</text>
            <picker :range="cities" range-key="name" @change="chooseCity">
              <view>{{ form.service_city_name || '请选择' }} <b>›</b></view>
            </picker>
          </view>

          <view class="radius">
            <view><text>服务范围</text><strong>{{ form.max_service_radius_km }}km</strong></view>
            <slider
              :value="form.max_service_radius_km"
              min="10"
              max="70"
              :activeColor="BRAND_PRIMARY"
              backgroundColor="#dfe9ea"
              block-size="20"
              @change="changeRadius"
            />
          </view>

          <label class="input-row">
            <text>邀请码</text>
            <input v-model="form.invitation_code" maxlength="32" placeholder="选填" />
          </label>
        </section>

        <section class="tips">
          <strong>申请流程</strong>
          <text>• 客服先审核本次达人入驻意向</text>
          <text>• 初审通过后，在达人端完成实名认证和资料上传</text>
          <text>• 实名及资料完成后，再配置服务并开启接单</text>
        </section>

        <view class="agreement" role="checkbox" :aria-checked="agreed" @tap="agreed = !agreed">
          <i :class="{ active: agreed }">{{ agreed ? '✓' : '' }}</i>
          <text>我已阅读并同意《达人服务声明》和《平台服务协议》</text>
        </view>
        <button class="submit" :disabled="!canSubmit || saving" @tap="submit">
          {{ saving ? '提交中…' : '提交审核' }}
        </button>
      </template>
    </main>
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { computed, reactive, ref } from 'vue'

import NetworkState from '@/components/NetworkState.vue'
import { BRAND_PRIMARY } from '@/utils/brand'
import { getCurrentUser, updateCurrentUser } from '@/services/auth'
import {
  getProviderApplication,
  saveProviderApplication,
  submitProviderApplication,
} from '@/services/providers'
import { guardCurrentPage } from '@/services/session'
import type { CurrentUser, ProviderApplication } from '@/types/api'
import { getErrorMessage } from '@/utils/formatters'

type Gender = CurrentUser['gender']

const cities = [
  { code: '130400', name: '邯郸市' },
  { code: '110100', name: '北京市' },
  { code: '310100', name: '上海市' },
]
const genderOptions: Array<{ label: string; value: Gender }> = [
  { label: '保密', value: 'unspecified' },
  { label: '男', value: 'male' },
  { label: '女', value: 'female' },
]

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const agreed = ref(false)
const application = ref<ProviderApplication | null>(null)
const gender = ref<Gender>('unspecified')
const originalGender = ref<Gender>('unspecified')
const form = reactive({
  bio: '',
  service_city_code: '130400',
  service_city_name: '邯郸市',
  max_service_radius_km: 10,
  invitation_code: '',
})

const locked = computed(() =>
  application.value?.status === 'pending'
  || application.value?.status === 'approved'
  || application.value?.status === 'suspended',
)
const canSubmit = computed(() =>
  form.bio.trim().length >= 10
  && Boolean(form.service_city_code)
  && agreed.value,
)
const genderLabel = computed(() =>
  genderOptions.find(item => item.value === gender.value)?.label || '保密',
)
const genderIndex = computed(() =>
  Math.max(0, genderOptions.findIndex(item => item.value === gender.value)),
)
const heroTitle = computed(() =>
  application.value?.status === 'approved' ? '欢迎加入\n乐搭伴' : '把兴趣变成\n一份温暖的服务',
)
const heroText = computed(() =>
  application.value?.status === 'approved'
    ? '请前往达人端完成实名认证与资料'
    : '提交入驻意向，审核通过后进入达人端认证',
)
const statusTitle = computed(() =>
  application.value?.status === 'approved'
    ? '入驻申请已通过'
    : application.value?.status === 'suspended' ? '达人资格已暂停' : '资料审核中',
)
const statusText = computed(() =>
  application.value?.status === 'approved'
    ? '请使用同一手机号登录达人端，完成实名认证、生活照和服务资料。'
    : application.value?.status === 'suspended'
      ? '请联系客服了解详情。'
      : '我们会尽快完成审核，结果将通过消息通知你。',
)

function warn(title: string) { uni.showToast({ title, icon: 'none' }) }
function goBack() { uni.navigateBack({ fail: () => uni.switchTab({ url: '/pages/profile/index' }) }) }
function chooseCity(event: { detail: { value: string } }) {
  const city = cities[Number(event.detail.value)]
  if (city) {
    form.service_city_code = city.code
    form.service_city_name = city.name
  }
}
function chooseGender(event: { detail: { value: string } }) {
  const option = genderOptions[Number(event.detail.value)]
  if (option) gender.value = option.value
}
function changeRadius(event: { detail: { value: number } }) {
  form.max_service_radius_km = Number(event.detail.value)
}
async function load() {
  loading.value = true
  error.value = ''
  try {
    const [applicationResponse, userResponse] = await Promise.all([
      getProviderApplication(),
      getCurrentUser(),
    ])
    application.value = applicationResponse.data
    gender.value = userResponse.data.gender
    originalGender.value = userResponse.data.gender
    if (application.value) {
      Object.assign(form, {
        bio: application.value.bio,
        service_city_code: application.value.service_city_code || '130400',
        service_city_name: application.value.service_city_name || '邯郸市',
        max_service_radius_km: application.value.max_service_radius_km,
        invitation_code: application.value.invitation_code,
      })
    }
  } catch (loadError) {
    error.value = getErrorMessage(loadError)
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!canSubmit.value || saving.value) return
  saving.value = true
  try {
    if (gender.value !== originalGender.value) {
      await updateCurrentUser({ gender: gender.value })
      originalGender.value = gender.value
    }
    await saveProviderApplication({
      ...form,
      bio: form.bio.trim(),
      invitation_code: form.invitation_code.trim(),
    })
    application.value = (await submitProviderApplication()).data
    uni.showToast({ title: '提交成功', icon: 'success' })
  } catch (submitError) {
    warn(getErrorMessage(submitError, '提交失败'))
  } finally {
    saving.value = false
  }
}

onLoad(() => { if (guardCurrentPage()) load() })
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;

.apply-page { min-height: 100vh; background: $dz-surface-page; }
.hero { padding-bottom: 22rpx; background: #fff; }
.nav { display: flex; align-items: center; justify-content: space-between; height: 92rpx; }
.nav button, .nav > view { width: 64rpx; }
.nav button { height: 64rpx; margin: 0; padding: 0; border: 0; background: transparent; font-size: 55rpx; line-height: 64rpx; }
.nav button::after, .photo-upload::after { display: none; }
.nav strong { font-size:$dz-fs-body-strong; }
.poster-frame { position: relative; overflow: hidden; width: 100%; aspect-ratio: 2 / 1; border-radius:$dz-radius-lg; background: #dffafa; box-shadow: 0 16rpx 42rpx rgba(18, 125, 132, .14); }
.poster-frame > image { position: absolute; width: 100%; height: 100%; inset: 0; }
.hero-copy { position: absolute; z-index: 1; top: 50%; left: 28rpx; display: flex; width: 46%; flex-direction: column; gap: 14rpx; transform: translateY(-50%); }
.hero-copy strong { color: #124950; font-size: 37rpx; font-weight:$dz-fw-bold; line-height: 1.28; letter-spacing: -.8rpx; white-space: pre-line; }
.hero-copy text { color: #3e686e; font-size:$dz-fs-caption; line-height: 1.5; }
.content { padding-top: 22rpx; padding-bottom: calc(50rpx + env(safe-area-inset-bottom)); }
.section-heading { display: flex; align-items: flex-end; justify-content: space-between; margin: 4rpx 4rpx 18rpx; }
.section-heading strong { font-size:$dz-fs-body-strong; }
.section-heading text { color: $dz-text-tertiary; font-size:$dz-fs-micro; }
.form-card, .tips, .status-card, .reject { border-radius:$dz-radius-md; background: #fff; box-shadow: $dz-shadow-card; }
.form-card { padding: 0 25rpx; }
.form-card label, .row, .radius, .photo-field { display: block; padding: 24rpx 0; border-bottom: 1rpx solid $dz-border-subtle; }
.form-card > :last-child { border-bottom: 0; }
.form-card label > text, .row > text, .row-label > text, .radius > view > text, .field-head > text { font-size:$dz-fs-caption; font-weight:$dz-fw-bold; }
.field-head { display: flex; align-items: center; justify-content: space-between; }
.field-head small { color: $dz-price-primary; font-size:$dz-fs-micro; }
.photo-upload { display: flex; width: 100%; height: 152rpx; align-items: center; margin: 18rpx 0 0; padding: 14rpx; border: 1rpx dashed #9bdedc; border-radius:$dz-radius-md; background: #effcfc; line-height: normal; touch-action: manipulation; }
.photo-thumbnail, .photo-empty { overflow: hidden; width: 116rpx; height: 116rpx; flex: none; border-radius:$dz-radius-sm; background: #d8f7f5; }
.photo-thumbnail { display: block; }
.photo-empty { display: flex; align-items: center; justify-content: center; }
.photo-empty i { position: relative; width: 54rpx; height: 54rpx; border-radius: 50%; background: rgba(255, 255, 255, .7); }
.photo-empty i::before, .photo-empty i::after { position: absolute; top: 50%; left: 50%; width: 24rpx; height: 4rpx; border-radius: 2rpx; background: $dz-brand-deep; content: ''; transform: translate(-50%, -50%); }
.photo-empty i::after { transform: translate(-50%, -50%) rotate(90deg); }
.photo-copy { display: flex; min-width: 0; flex: 1; align-items: flex-start; margin-left: 18rpx; text-align: left; flex-direction: column; }
.photo-copy strong { color: $dz-brand-deep; font-size:$dz-fs-caption; line-height: 1.4; }
.photo-copy text { margin-top: 7rpx; overflow: hidden; color: $dz-text-secondary; font-size:$dz-fs-micro; line-height: 1.4; text-overflow: ellipsis; white-space: nowrap; }
.photo-action { flex: none; margin-left: 12rpx; color: $dz-brand-deep; font-size:$dz-fs-caption; font-weight:$dz-fw-bold; }
.photo-help { display: block; margin-top: 12rpx; color: $dz-text-tertiary; font-size:$dz-fs-micro; line-height: 1.5; }
.form-card textarea { width: 100%; height: 150rpx; margin-top: 17rpx; font-size:$dz-fs-caption; line-height: 1.55; }
.form-card label > small { display: block; color: $dz-text-tertiary; text-align: right; font-size:$dz-fs-micro; }
.row { display: flex; min-height: 54rpx; align-items: center; justify-content: space-between; }
.row-label { display: flex; flex-direction: column; gap: 7rpx; }
.row-label small { color: $dz-text-tertiary; font-size:$dz-fs-micro; font-weight:$dz-fw-regular; }
.row picker view { color: $dz-text-secondary; font-size:$dz-fs-caption; }
.row b { margin-left: 12rpx; font-size:$dz-fs-heading; font-weight: 300; }
.radius > view { display: flex; justify-content: space-between; }
.radius strong { color: $dz-brand-deep; font-size:$dz-fs-caption; }
.radius slider { margin: 20rpx 0 0; }
.input-row { display: flex !important; align-items: center; }
.input-row input { min-height: 54rpx; flex: 1; text-align: right; font-size:$dz-fs-caption; }
.tips { display: flex; flex-direction: column; gap: 10rpx; margin-top: 20rpx; padding: 23rpx 25rpx; }
.tips strong { font-size:$dz-fs-caption; }
.tips text { color: $dz-text-secondary; font-size:$dz-fs-caption; }
.agreement { display: flex; min-height: 72rpx; align-items: center; margin: 12rpx 8rpx; color: $dz-text-secondary; font-size:$dz-fs-caption; line-height: 1.5; }
.agreement i { display: flex; width: 32rpx; height: 32rpx; flex: none; align-items: center; justify-content: center; margin-right: 10rpx; border: 2rpx solid #c8d2d4; border-radius: 50%; font-style: normal; }
.agreement i.active { border-color: $dz-brand-primary; color: #fff; background: $dz-brand-primary; }
.submit, .status-card button { height: 84rpx; border: 0; border-radius:$dz-radius-full; color: #fff; background: $dz-gradient-brand; font-size:$dz-fs-body; font-weight:$dz-fw-bold; line-height: 84rpx; }
.submit[disabled] { opacity: .45; }
.reject { display: flex; flex-direction: column; gap: 8rpx; margin-bottom: 18rpx; padding: 20rpx 24rpx; border-left: 6rpx solid $dz-price-primary; }
.reject strong { color: $dz-status-danger-deep; font-size:$dz-fs-caption; }
.reject text { color: $dz-text-secondary; font-size:$dz-fs-caption; }
.status-card { display: flex; flex-direction: column; align-items: center; padding: 62rpx 28rpx; text-align: center; }
.status-icon { display: flex; width: 110rpx; height: 110rpx; align-items: center; justify-content: center; border-radius: 50%; color: #fff; background: $dz-gradient-brand; font-size:$dz-fs-price-lg; }
.status-card > strong { margin-top: 25rpx; font-size:$dz-fs-body-strong; }
.status-card > text { margin-top: 12rpx; color: $dz-text-secondary; font-size:$dz-fs-caption; line-height: 1.6; }
.status-card button { width: 100%; margin-top: 38rpx; }

@media screen and (max-width: 360px) {
  .hero-copy strong { font-size:$dz-fs-heading; }
  .hero-copy text { font-size:$dz-fs-micro; }
  .section-heading text { max-width: 52%; text-align: right; }
}

@media (prefers-reduced-motion: reduce) {
  .submit, .photo-upload { transition: none; }
}
</style>
