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

        <section v-if="selectedService" class="current-service">
          <text class="section-heading">当前服务</text>
          <button class="service-summary" @tap="openServiceSheet">
            <view class="service-icon">✈</view>
            <view class="service-copy"><strong>{{ selectedService.category }}</strong><text>{{ serviceDescription(selectedService.category) }}</text></view>
            <view class="service-cost"><strong>¥{{ money(selectedService.price_amount) }}<small>{{ selectedService.billing_type==='hourly'?'/小时':'/次' }}</small></strong><text>{{ durationHint(selectedService) }}</text></view>
            <view class="availability" @tap.stop="openServiceSheet"><text>◷　最早可约：<strong>{{ availabilityLoading?'查询中…':earliestSlot?`${earliestSlot.label} ${earliestSlot.time}`:'暂无档期' }}</strong></text><text>选择服务　›</text></view>
          </button>
        </section>

        <section class="introduction">
          <text class="section-title">达人介绍</text>
          <text>{{ provider.bio }}</text>
          <text>服务范围覆盖{{ provider.service_city_name }}，支持{{ provider.max_service_radius_km }}公里内预约。认真倾听你的需求，陪你轻松体验城市里的好时光。</text>
        </section>
        <section class="reviews"><text class="section-title">用户评价</text><view class="review-preview"><view class="review-score"><strong>{{ provider.rating }}</strong><text>★★★★★</text><small>（128条评价）</small></view><view class="review-copy"><strong>小宇同学　<text>★★★★★</text></strong><text>晓晓非常热情，行程安排得很棒，拍照技术也超赞！</text><small>2周前</small></view></view></section>
      </main>

      <view class="action-bar dz-container">
        <button class="secondary" :disabled="favoriteSubmitting" hover-class="button--pressed" @tap="toggleFavorite"><text class="action-icon">{{ provider.is_favorited?'★':'☆' }}</text><text>{{ provider.is_favorited?'已收藏':'收藏' }}</text></button>
        <button class="secondary" hover-class="button--pressed" @tap="showPending('私信')"><text class="action-icon">◌</text><text>私信</text></button>
        <button class="primary" hover-class="button--pressed" @tap="startBooking">立即预约</button>
      </view>
      <view v-if="serviceSheetOpen" class="sheet-layer" @tap="serviceSheetOpen=false">
        <section class="service-sheet" @tap.stop>
          <view class="sheet-handle"/><view class="sheet-title"><strong>选择服务</strong><button aria-label="关闭" @tap="serviceSheetOpen=false">×</button></view>
          <scroll-view scroll-y class="sheet-services">
            <button v-for="service in provider.services" :key="service.id" class="sheet-service" :class="{active:pendingServiceId===service.id}" @tap="pendingServiceId=service.id"><text class="radio">{{ pendingServiceId===service.id?'✓':'' }}</text><view class="sheet-icon">{{ service.category.includes('摄影')?'▣':'✈' }}</view><view class="sheet-copy"><strong>{{ service.category }}</strong><text>{{ serviceDescription(service.category) }}</text></view><view class="sheet-price"><strong>¥{{ money(service.price_amount) }}<small>{{ service.billing_type==='hourly'?'/小时':'/次' }}</small></strong><text>{{ durationHint(service) }}</text></view></button>
          </scroll-view>
          <button class="confirm-service" @tap="confirmService">确认服务</button>
        </section>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { computed, ref, watch } from 'vue'

import NetworkState from '@/components/NetworkState.vue'
import { createBookingDraft } from '@/services/bookingDraft'
import { getProviderAvailability, getProviderDetail } from '@/services/discovery'
import { favoriteProvider, recordProviderView, unfavoriteProvider } from '@/services/engagements'
import { isAuthenticated, requireAuthentication } from '@/services/session'
import type { ProviderAvailabilitySlot, ProviderDetail, ProviderServiceSummary } from '@/types/api'
import { formatAmount, getErrorMessage } from '@/utils/formatters'

const provider = ref<ProviderDetail | null>(null)
const publicId = ref('')
const loading = ref(true)
const error = ref('')
const heroImageFailed = ref(false)
const selectedServiceId = ref(0)
const pendingServiceId = ref(0)
const serviceSheetOpen = ref(false)
const earliest = ref<ProviderAvailabilitySlot | null>(null)
const availabilityLoading = ref(false)
const favoriteSubmitting = ref(false)

const selectedService = computed(() => provider.value?.services.find(item=>item.id===selectedServiceId.value) || provider.value?.services[0] || null)
const age = computed(() => {
  if (!provider.value?.birth_date) return null
  const birth = new Date(provider.value.birth_date)
  const today = new Date()
  let value = today.getFullYear() - birth.getFullYear()
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) value--
  return value
})
const profileTags = computed(() => {
  const category = selectedService.value?.category || '达人服务'
  const interest = category.replace('陪玩', '').replace('陪伴', '')
  return [category, '健谈开朗', `${interest}爱好者`, `${provider.value?.service_city_name || ''}达人`]
})
const earliestSlot = computed(()=>{if(!earliest.value)return null;const slot=new Date(earliest.value.starts_at);const today=new Date();const tomorrow=new Date();tomorrow.setDate(today.getDate()+1);const date=localDateKey(slot);const label=date===localDateKey(today)?'今天':date===localDateKey(tomorrow)?'明天':`${slot.getMonth()+1}月${slot.getDate()}日`;return{label,time:`${String(slot.getHours()).padStart(2,'0')}:${String(slot.getMinutes()).padStart(2,'0')}`,date}})

const money = formatAmount
function serviceDescription(name:string){return name.includes('摄影')?'拍照打卡，创意构图，记录美好时刻':'一起出行，陪伴游玩，景点打卡'}
function durationHint(service:ProviderServiceSummary){return service.billing_type==='hourly'?'最低2小时':`预计${Math.max(1,Math.round((service.estimated_duration_minutes||180)/60))}小时`}
function goBack() { uni.navigateBack() }
function showPending(feature: string) { uni.showToast({ title: `${feature}功能即将接入`, icon: 'none' }) }
async function toggleFavorite(){if(!provider.value||favoriteSubmitting.value)return;if(!requireAuthentication(`/pages/providers/detail?id=${publicId.value}`))return;favoriteSubmitting.value=true;try{if(provider.value.is_favorited)await unfavoriteProvider(publicId.value);else await favoriteProvider(publicId.value);provider.value.is_favorited=!provider.value.is_favorited;uni.showToast({title:provider.value.is_favorited?'收藏成功':'已取消收藏',icon:'success'})}catch(reason){uni.showToast({title:getErrorMessage(reason,'操作失败'),icon:'none'})}finally{favoriteSubmitting.value=false}}
function openServiceSheet(){pendingServiceId.value=selectedService.value?.id||0;serviceSheetOpen.value=true}
function confirmService(){selectedServiceId.value=pendingServiceId.value;serviceSheetOpen.value=false}
function startBooking() {
  if (!provider.value || !selectedService.value || !earliestSlot.value) { uni.showToast({title:'当前暂无可预约时间',icon:'none'});return }
  const today=new Date();const target=new Date(`${earliestSlot.value.date}T00:00:00`);const offset=Math.round((target.getTime()-new Date(today.getFullYear(),today.getMonth(),today.getDate()).getTime())/86400000)
  createBookingDraft(provider.value, selectedService.value, offset, earliestSlot.value.time)
  uni.navigateTo({ url: '/pages/booking/confirm' })
}
function localDateKey(value:Date){return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`}
async function loadAvailability(){if(!provider.value||!selectedService.value)return;availabilityLoading.value=true;earliest.value=null;try{earliest.value=(await getProviderAvailability(provider.value.public_id,selectedService.value.id,selectedService.value.billing_type==='hourly'?120:undefined)).data.earliest}catch{}finally{availabilityLoading.value=false}}
async function loadDetail() {
  if (!publicId.value) return
  loading.value = true; error.value = ''
  heroImageFailed.value = false
  try { provider.value = (await getProviderDetail(publicId.value)).data;selectedServiceId.value=provider.value.services[0]?.id||0;if(isAuthenticated())recordProviderView(publicId.value).catch(()=>{}) }
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
watch(selectedServiceId,()=>loadAvailability())
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
.service-icon{display:flex;align-items:center;justify-content:center;width:62rpx;height:62rpx;border-radius:50%;color:#fff;background:$dz-gradient-brand;font-size:29rpx}
.service-copy{display:flex;flex-direction:column;gap:7rpx;margin-left:17rpx}
.service-copy strong{font-size:29rpx}
.service-copy text{color:$dz-text-tertiary;font-size:18rpx}
.service-cost{display:flex;flex:1;flex-direction:column;align-items:flex-end;gap:3rpx}
.service-cost strong{color:$dz-price-primary;font-size:39rpx}
.service-cost small{font-size:20rpx;font-weight:500}
.service-cost text{color:$dz-text-secondary;font-size:19rpx}
.section-title{display:block;font-size:30rpx;font-weight:700}
.introduction{margin-top:40rpx}
.introduction>text:not(.section-title){display:block;margin-top:14rpx;color:$dz-text-secondary;font-size:22rpx;line-height:36rpx}
.current-service{margin-top:8rpx}.section-heading{display:block;margin-bottom:18rpx;padding-left:14rpx;border-left:7rpx solid $dz-brand-primary;font-size:29rpx;font-weight:700}.service-summary{position:relative;display:grid;grid-template-columns:76rpx 1fr auto;grid-template-rows:96rpx 58rpx;align-items:center;width:100%;margin:0;padding:14rpx 18rpx 0;border:2rpx solid $dz-brand-primary;border-radius:20rpx;background:linear-gradient(135deg,#fff 35%,#e9fbfa);text-align:left;line-height:1.35;box-sizing:border-box}.service-summary::after,.sheet-title button::after,.sheet-service::after,.confirm-service::after{display:none}.service-summary .service-icon{width:64rpx;height:64rpx}.service-summary .service-copy{gap:6rpx;margin-left:10rpx}.service-summary .service-copy strong{font-size:27rpx}.service-summary .service-copy text{color:$dz-text-secondary;font-size:18rpx}.service-summary .service-cost strong{font-size:31rpx}.service-summary .service-cost text{padding:4rpx 8rpx;border:1rpx solid $dz-brand-primary;border-radius:8rpx;color:$dz-brand-deep;font-size:16rpx}.availability{grid-column:1/4;display:flex;align-items:center;justify-content:space-between;height:58rpx;border-top:1rpx solid rgba(24,199,198,.35);color:$dz-brand-deep;font-size:20rpx}.availability strong{font-size:21rpx}.reviews{margin-top:34rpx}.review-preview{display:grid;grid-template-columns:140rpx 1fr;gap:18rpx;margin-top:18rpx}.review-score{display:flex;flex-direction:column;align-items:center}.review-score strong{color:$dz-brand-deep;font-size:46rpx}.review-score text{color:#ffb623;font-size:19rpx;letter-spacing:1rpx}.review-score small{margin-top:5rpx;color:$dz-text-secondary;font-size:16rpx}.review-copy{position:relative;display:flex;flex-direction:column;gap:8rpx;padding:16rpx 18rpx;border-radius:16rpx;background:$dz-surface-page}.review-copy strong{font-size:19rpx}.review-copy strong text{color:$dz-brand-deep}.review-copy>text{font-size:18rpx;line-height:28rpx}.review-copy small{position:absolute;right:14rpx;top:14rpx;color:$dz-text-tertiary;font-size:15rpx}.sheet-layer{position:fixed;z-index:60;inset:0;background:rgba(15,28,32,.55)}.service-sheet{position:absolute;right:0;bottom:0;left:0;max-width:750px;margin:auto;padding:18rpx 24rpx calc(24rpx + env(safe-area-inset-bottom));border-radius:32rpx 32rpx 0 0;background:#fff;box-sizing:border-box}.sheet-handle{width:72rpx;height:7rpx;margin:0 auto 18rpx;border-radius:4rpx;background:#cbd1d3}.sheet-title{display:flex;align-items:center;justify-content:space-between}.sheet-title strong{font-size:30rpx}.sheet-title button{width:58rpx;height:58rpx;margin:0;padding:0;border:0;background:transparent;color:$dz-text-secondary;font-size:38rpx;line-height:58rpx}.sheet-services{max-height:660rpx;margin-top:15rpx}.sheet-service{display:grid;grid-template-columns:34rpx 76rpx 1fr auto;align-items:center;width:100%;min-height:126rpx;margin:0 0 14rpx;padding:14rpx;border:2rpx solid $dz-border-subtle;border-radius:18rpx;background:#fff;text-align:left;line-height:1.35;box-sizing:border-box}.sheet-service.active{border-color:$dz-brand-primary;background:linear-gradient(135deg,#fff,#e9fbfa)}.radio{display:flex;align-items:center;justify-content:center;width:28rpx;height:28rpx;border:2rpx solid #ccd4d7;border-radius:50%;color:#fff;font-size:17rpx}.active .radio{border-color:$dz-brand-primary;background:$dz-brand-primary}.sheet-icon{display:flex;align-items:center;justify-content:center;width:64rpx;height:64rpx;border-radius:50%;color:$dz-brand-deep;background:$dz-brand-soft;font-size:29rpx}.sheet-copy{display:flex;flex-direction:column;gap:8rpx;margin-left:12rpx}.sheet-copy strong{font-size:24rpx}.sheet-copy text{color:$dz-text-secondary;font-size:17rpx}.sheet-price{display:flex;flex-direction:column;align-items:flex-end;gap:10rpx}.sheet-price strong{color:$dz-price-primary;font-size:28rpx}.sheet-price small{font-size:17rpx}.sheet-price text{padding:4rpx 7rpx;border:1rpx solid $dz-brand-primary;border-radius:7rpx;color:$dz-brand-deep;font-size:15rpx}.confirm-service{height:78rpx;margin:4rpx 0 0;border:0;border-radius:39rpx;color:#fff;background:$dz-gradient-brand;font-size:28rpx;font-weight:700;line-height:78rpx}
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
