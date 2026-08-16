<template>
  <view class="dz-page detail-page">
    <NetworkState v-if="loading" class="dz-container detail-state" message="正在加载达人资料…" />
    <NetworkState v-else-if="error" class="dz-container detail-state" :message="error" error @retry="loadDetail" />
    <template v-else-if="provider">
      <view class="hero dz-container">
        <image v-if="provider.avatar_url && !heroImageFailed" :src="provider.avatar_url" mode="aspectFill" @error="heroImageFailed = true" />
        <view v-else class="hero-fallback">{{ provider.nickname.slice(0, 1) }}</view>
        <view class="hero-shade" />
        <button class="round back" aria-label="返回" hover-class="round--pressed" @tap="goBack"><text>‹</text></button>
        <view class="hero-actions">
          <button class="round share" aria-label="分享" hover-class="round--pressed" @tap="showPending('分享')"><text>↥</text></button>
          <button class="round" aria-label="更多操作" hover-class="round--pressed" @tap="showPending('更多')"><text class="dots">•••</text></button>
        </view>
        <text class="photo-count">1/1</text>
      </view>

      <main class="profile-sheet dz-container">
        <view class="portrait-ring">
          <image v-if="provider.avatar_url && !heroImageFailed" :src="provider.avatar_url" mode="aspectFill" @error="heroImageFailed = true" />
          <view v-else>{{ provider.nickname.slice(0, 1) }}</view>
        </view>

        <view class="identity">
          <view class="name-row">
            <text class="name">{{ provider.nickname }}</text>
            <text v-if="age" class="gender">♀</text><text v-if="age" class="age">{{ age }}岁</text>
          </view>
          <view class="certifications"><text v-if="provider.verified">♙ 实名认证</text></view>
          <view class="rating-row"><text class="stars">★★★★★</text><strong>{{ provider.rating }}分</strong><i /><text>服务{{ provider.service_count }}次</text></view>
          <view class="tags"><text v-for="tag in profileTags" :key="tag">{{ tag }}</text></view>
        </view>

        <section class="service-card" v-if="primaryService">
          <view class="service-icon">▣</view>
          <view class="service-copy"><strong>{{ primaryService.category }}</strong><text>{{ billingLabel(primaryService.billing_type) }}</text></view>
          <view class="service-cost"><strong>¥{{ money(primaryService.price_amount) }}<small>/小时</small></strong><text>最低预约2小时</text></view>
        </section>

        <section class="schedule">
          <text class="section-title">可预约时间</text>
          <scroll-view scroll-x class="date-rail" :show-scrollbar="false">
            <view class="date-list">
              <button v-for="(item,index) in dateOptions" :key="item.date" class="date-option" :class="{active:selectedDate===index}" @tap="selectedDate=index"><strong>{{ item.label }}</strong><text>{{ item.date }}</text></button>
              <button class="date-option more-date" @tap="showPending('更多日期')"><strong>更多</strong><text>⌄</text></button>
            </view>
          </scroll-view>
          <view class="time-list">
            <button v-for="time in timeOptions" :key="time" class="time-option" :class="{active:selectedTime===time}" @tap="selectedTime=time">{{ time }}</button>
          </view>
        </section>

        <section class="introduction">
          <text class="section-title">达人介绍</text>
          <text>{{ provider.bio }}</text>
          <text>服务范围覆盖{{ provider.service_city_name }}，支持{{ provider.max_service_radius_km }}公里内预约。认真倾听你的需求，陪你轻松体验城市里的好时光。</text>
        </section>
      </main>

      <view class="action-bar dz-container">
        <button class="secondary" hover-class="button--pressed" @tap="showPending('收藏')"><text class="action-icon">☆</text><text>收藏</text></button>
        <button class="secondary" hover-class="button--pressed" @tap="showPending('私信')"><text class="action-icon">◌</text><text>私信</text></button>
        <button class="primary" hover-class="button--pressed" @tap="startBooking">立即预约</button>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import NetworkState from '@/components/NetworkState.vue'
import { createBookingDraft } from '@/services/bookingDraft'
import { getProviderDetail } from '@/services/discovery'
import type { ProviderDetail } from '@/types/api'
import { formatAmount, formatMonthDay, getErrorMessage } from '@/utils/formatters'

const provider = ref<ProviderDetail | null>(null)
const publicId = ref('')
const loading = ref(true)
const error = ref('')
const heroImageFailed = ref(false)
const selectedDate = ref(0)
const selectedTime = ref('14:00')
const timeOptions = ['09:00', '10:00', '14:00', '15:00', '16:00']

const primaryService = computed(() => provider.value?.services[0] || null)
const age = computed(() => {
  if (!provider.value?.birth_date) return null
  const birth = new Date(provider.value.birth_date)
  const today = new Date()
  let value = today.getFullYear() - birth.getFullYear()
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) value--
  return value
})
const profileTags = computed(() => {
  const category = primaryService.value?.category || '达人服务'
  const interest = category.replace('陪玩', '').replace('陪伴', '')
  return [category, '健谈开朗', `${interest}爱好者`, `${provider.value?.service_city_name || ''}达人`]
})
const dateOptions = computed(() => {
  const labels = ['今天', '明天', '后天', '周末']
  return labels.map((label, index) => {
    const date = new Date(); date.setDate(date.getDate() + index)
    return { label, date: formatMonthDay(date) }
  })
})

const money = formatAmount
function billingLabel(value: string) { return value === 'hourly' ? '按小时计费' : '按次计费' }
function goBack() { uni.navigateBack() }
function showPending(feature: string) { uni.showToast({ title: `${feature}功能即将接入`, icon: 'none' }) }
function startBooking() {
  if (!provider.value || !primaryService.value) return
  createBookingDraft(provider.value, primaryService.value, selectedDate.value, selectedTime.value)
  uni.navigateTo({ url: '/pages/booking/service' })
}
async function loadDetail() {
  if (!publicId.value) return
  loading.value = true; error.value = ''
  heroImageFailed.value = false
  try { provider.value = (await getProviderDetail(publicId.value)).data }
  catch (reason) { error.value = getErrorMessage(reason) }
  finally { loading.value = false }
}
onLoad((query) => {
  publicId.value = typeof query?.id === 'string' ? query.id : ''
  if (!publicId.value) {
    error.value = '缺少达人编号'
    loading.value = false
  } else {
    loadDetail()
  }
})
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;
.detail-page{min-height:100vh;padding-bottom:calc(138rpx + env(safe-area-inset-bottom));background:#fff}
.hero{position:relative;overflow:hidden;height:610rpx;padding:0;background:linear-gradient(145deg,#b7e3e4,#63b8bd)}
.hero>image,.hero-fallback,.hero-shade{position:absolute;width:100%;height:100%;inset:0}
.hero-fallback{display:flex;align-items:center;justify-content:center;color:#fff;font-size:120rpx}
.hero-shade{background:linear-gradient(180deg,rgba(0,0,0,.13),transparent 25%,transparent 75%,rgba(0,0,0,.1));pointer-events:none}
.round{display:flex;align-items:center;justify-content:center;width:72rpx;height:72rpx;margin:0;padding:0;border:0;border-radius:50%;color:#fff;background:rgba(23,33,38,.56);line-height:1}
.round::after,.date-option::after,.time-option::after,.action-bar button::after{display:none}
.round text{font-size:48rpx;line-height:1}
.round .dots{font-size:22rpx;letter-spacing:2rpx}
.round--pressed,.button--pressed{opacity:.7}
.back{position:absolute;left:24rpx;top:calc(24rpx + env(safe-area-inset-top))}
.hero-actions{position:absolute;right:24rpx;top:calc(24rpx + env(safe-area-inset-top));display:flex;gap:18rpx}
.share text{transform:translateY(-2rpx);font-size:36rpx}
.photo-count{position:absolute;right:26rpx;bottom:28rpx;padding:7rpx 15rpx;border-radius:20rpx;color:#fff;background:rgba(23,33,38,.62);font-size:20rpx}
.profile-sheet{position:relative;margin-top:-4rpx;padding:0 24rpx 30rpx;border-radius:34rpx 34rpx 0 0;background:#fff}
.portrait-ring{position:absolute;z-index:2;left:38rpx;top:-58rpx;overflow:hidden;width:116rpx;height:116rpx;border:7rpx solid #fff;border-radius:50%;background:$dz-brand-soft;box-shadow:0 8rpx 20rpx rgba(23,33,38,.1)}
.portrait-ring image,.portrait-ring view{width:100%;height:100%}
.portrait-ring view{display:flex;align-items:center;justify-content:center;color:$dz-brand-deep;font-size:44rpx}
.identity{padding:30rpx 0 26rpx 180rpx;min-height:184rpx;box-sizing:border-box}
.name-row{display:flex;align-items:center;gap:9rpx}
.name{font-size:38rpx;font-weight:700}
.gender{color:#ff4c88;font-size:31rpx}
.age{color:$dz-text-secondary;font-size:24rpx}
.certifications{display:flex;gap:12rpx;margin-top:12rpx}
.certifications text{padding:5rpx 11rpx;border:1rpx solid $dz-brand-primary;border-radius:8rpx;color:$dz-brand-deep;background:$dz-brand-soft;font-size:18rpx}
.rating-row{display:flex;align-items:center;gap:13rpx;margin-top:20rpx;margin-left:-180rpx;color:$dz-text-primary;font-size:23rpx}
.stars{overflow:hidden;width:148rpx;color:#ffb623;font-size:25rpx;letter-spacing:3rpx;white-space:nowrap}
.rating-row strong{font-size:24rpx}
.rating-row i{width:1rpx;height:24rpx;background:$dz-border-subtle}
.tags{display:flex;flex-wrap:wrap;gap:10rpx;margin-left:-180rpx;margin-top:20rpx}
.tags text{padding:8rpx 14rpx;border-radius:13rpx;color:$dz-brand-deep;background:$dz-brand-soft;font-size:20rpx}
.service-card{display:flex;align-items:center;min-height:132rpx;padding:18rpx 20rpx;border:1rpx solid $dz-border-subtle;border-radius:22rpx;background:#fff;box-shadow:0 8rpx 24rpx rgba(23,33,38,.08);box-sizing:border-box}
.service-icon{display:flex;align-items:center;justify-content:center;width:62rpx;height:62rpx;border-radius:50%;color:#fff;background:$dz-gradient-brand;font-size:29rpx}
.service-copy{display:flex;flex-direction:column;gap:7rpx;margin-left:17rpx}
.service-copy strong{font-size:29rpx}
.service-copy text{color:$dz-text-tertiary;font-size:18rpx}
.service-cost{display:flex;flex:1;flex-direction:column;align-items:flex-end;gap:3rpx}
.service-cost strong{color:$dz-price-primary;font-size:39rpx}
.service-cost small{font-size:20rpx;font-weight:500}
.service-cost text{color:$dz-text-secondary;font-size:19rpx}
.schedule{margin-top:42rpx}
.section-title{display:block;font-size:30rpx;font-weight:700}
.date-rail{width:100%;margin-top:24rpx;white-space:nowrap}
.date-list{display:flex;gap:14rpx}
.date-option{display:flex;flex:0 0 120rpx;flex-direction:column;align-items:center;justify-content:center;height:94rpx;margin:0;padding:0;border:1rpx solid $dz-border-subtle;border-radius:16rpx;color:$dz-text-primary;background:#fff;font-size:22rpx;line-height:30rpx}
.date-option text{color:$dz-text-tertiary;font-size:18rpx}
.date-option.active{border-color:$dz-brand-primary;color:$dz-brand-deep;background:$dz-brand-soft}
.date-option.active text{color:$dz-text-secondary}
.more-date{flex-basis:106rpx}
.time-list{display:grid;grid-template-columns:repeat(5,1fr);gap:13rpx;margin-top:18rpx}
.time-option{height:62rpx;margin:0;padding:0;border:1rpx solid $dz-border-subtle;border-radius:14rpx;color:$dz-text-primary;background:#fff;font-size:23rpx;line-height:62rpx}
.time-option.active{border-color:$dz-brand-primary;color:#fff;background:$dz-gradient-brand}
.introduction{margin-top:40rpx}
.introduction>text:not(.section-title){display:block;margin-top:14rpx;color:$dz-text-secondary;font-size:22rpx;line-height:36rpx}
.action-bar{position:fixed;z-index:20;right:0;bottom:0;left:0;display:flex;align-items:center;gap:12rpx;height:calc(118rpx + env(safe-area-inset-bottom));padding:10rpx 24rpx env(safe-area-inset-bottom);border-radius:28rpx 28rpx 0 0;background:rgba(255,255,255,.98);box-shadow:0 -6rpx 24rpx rgba(23,33,38,.08);box-sizing:border-box}
.action-bar button{margin:0;border:0}
.secondary{display:flex;flex-direction:column;align-items:center;justify-content:center;width:104rpx;height:86rpx;padding:0;border:1rpx solid $dz-border-subtle!important;border-radius:18rpx;color:$dz-text-primary;background:#fff;font-size:18rpx;line-height:25rpx}
.action-icon{font-size:32rpx}
.primary{flex:1;height:86rpx;border-radius:43rpx;color:#fff;background:$dz-gradient-brand;font-size:29rpx;font-weight:700}
.detail-state{min-height:500rpx}
@media screen and (orientation:landscape) and (max-height:600px){.detail-page{padding-bottom:84px}
.hero{height:220px}
.action-bar{height:68px;padding-top:8px}
.action-bar .secondary,.action-bar .primary{height:48px}
.action-bar .primary{border-radius:24px}
}

</style>
