<template>
  <view class="dz-page booking-page">
    <header class="booking-head"><button aria-label="返回" @tap="goBack">‹</button><text>选择服务项目</text></header>
    <view v-if="draft" class="booking-content">
      <section class="provider-card booking-card">
        <view class="booking-avatar provider-avatar"><image v-if="draft.providerAvatarUrl" :src="draft.providerAvatarUrl" mode="aspectFill" /><view v-else>{{ draft.providerName.slice(0,1) }}</view></view>
        <view class="provider-copy"><strong>{{ draft.providerName }}</strong><text v-if="draft.providerVerified" class="verified">⬟ 实名认证</text><text class="rating">★ <b>{{ draft.providerRating }}分</b></text></view>
      </section>

      <text class="booking-section-title">选择服务</text>
      <view class="service-list">
        <button v-for="service in draft.services" :key="service.id" class="service-option booking-card" :class="{active:selectedServiceId===service.id}" @tap="selectedServiceId=service.id">
          <text class="choice">{{ selectedServiceId === service.id ? '✓' : '' }}</text>
          <view class="service-icon">{{ serviceIcon(service.category) }}</view>
          <view class="service-copy"><strong>{{ service.category }}</strong><text>{{ serviceDescription(service.category) }}</text></view>
          <view class="service-price"><strong>¥{{ money(service.price_amount) }}<small>{{ service.billing_type==='hourly' ? '/小时' : '/次' }}</small></strong><text>{{ service.billing_type==='hourly' ? '最低2小时' : `预计${durationHours(service)}小时` }}</text></view>
        </button>
      </view>

      <text class="booking-section-title">服务说明</text>
      <section class="notice booking-card"><view><i>◷</i><text>服务时间以实际开始到结束为准，超时需另行结算。</text></view><view><i>◇</i><text>费用不含交通、门票、餐饮等第三方费用。</text></view><view><i>◌</i><text>请提前沟通需求与行程，确保服务更顺利。</text></view></section>
    </view>
    <view v-else class="booking-empty">预约信息已失效，请返回达人详情重新选择。</view>
    <footer v-if="draft" class="booking-footer"><view class="booking-price">已选　<text>{{ selectedService?.category }}</text><strong>起步价　¥{{ startingAmount }}</strong></view><button @tap="next">下一步</button></footer>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { bookingServiceAmount, getBookingDraft, updateBookingDraft } from '@/services/bookingDraft'
import type { BookingDraft } from '@/services/bookingDraft'
import type { ProviderServiceSummary } from '@/types/api'
import { formatAmount } from '@/utils/formatters'

const draft = ref<BookingDraft|null>(null)
const selectedServiceId = ref(0)
const selectedService = computed(() => draft.value?.services.find(item => item.id === selectedServiceId.value) || null)
const startingAmount = computed(() => selectedService.value && draft.value ? formatAmount(bookingServiceAmount({ ...draft.value, serviceId:selectedService.value.id, serviceName:selectedService.value.category, billingType:selectedService.value.billing_type, unitPrice:Number(selectedService.value.price_amount), durationMinutes:minimumDuration(selectedService.value) })) : '0')
const money = formatAmount
function minimumDuration(service: ProviderServiceSummary){ return service.billing_type==='hourly' ? Math.max(120,service.estimated_duration_minutes||120) : (service.estimated_duration_minutes||180) }
function durationHours(service: ProviderServiceSummary){ return Math.max(1,Math.round((service.estimated_duration_minutes||180)/60)) }
function serviceIcon(name:string){ return name.includes('摄影') ? '▣' : '✈' }
function serviceDescription(name:string){ return name.includes('摄影') ? '拍照打卡，创意构图，记录你的高光时刻。' : '一起出行，陪伴游玩，行程规划，旅途中的贴心搭子。' }
function goBack(){ uni.navigateBack() }
function next(){
  const service=selectedService.value
  if(!draft.value||!service)return
  updateBookingDraft({serviceId:service.id,serviceName:service.category,billingType:service.billing_type,unitPrice:Number(service.price_amount),durationMinutes:minimumDuration(service)})
  uni.navigateTo({url:'/pages/booking/time'})
}
onLoad(()=>{ draft.value=getBookingDraft(); selectedServiceId.value=draft.value?.serviceId||0 })
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *; @use '../../styles/booking.scss';
.provider-card{display:flex;align-items:center;padding:20rpx}.provider-avatar{width:136rpx;height:136rpx}.provider-copy{display:flex;flex-direction:column;gap:12rpx;margin-left:24rpx}.provider-copy>strong{font-size:34rpx}.verified{width:max-content;padding:5rpx 12rpx;border:1rpx solid $dz-brand-primary;border-radius:9rpx;color:$dz-brand-deep;font-size:19rpx}.rating{color:$dz-brand-primary;font-size:26rpx}.rating b{color:$dz-text-primary;font-weight:500}.service-list{display:flex;flex-direction:column;gap:18rpx}.service-option{position:relative;display:flex;align-items:center;width:100%;min-height:190rpx;margin:0;padding:24rpx 20rpx;border:2rpx solid transparent;text-align:left;line-height:1.45}.service-option::after{display:none}.service-option.active{border-color:$dz-brand-primary;background:linear-gradient(135deg,#fff 35%,#e7fbfa)}.choice{position:absolute;left:9rpx;top:9rpx;display:flex;align-items:center;justify-content:center;width:28rpx;height:28rpx;border:2rpx solid #cbd3d6;border-radius:50%;color:#fff;font-size:20rpx}.active .choice{border-color:$dz-brand-primary;background:$dz-brand-primary}.service-icon{display:flex;align-items:center;justify-content:center;width:96rpx;height:96rpx;border-radius:50%;color:$dz-brand-deep;background:$dz-brand-soft;font-size:43rpx}.service-copy{display:flex;flex:1;flex-direction:column;gap:13rpx;margin-left:20rpx}.service-copy strong{font-size:28rpx}.service-copy text{max-width:285rpx;color:$dz-text-secondary;font-size:20rpx;line-height:33rpx}.service-price{display:flex;flex-direction:column;align-items:flex-end;gap:14rpx}.service-price strong{color:$dz-price-primary;font-size:31rpx}.service-price small{font-size:19rpx}.service-price text{padding:5rpx 9rpx;border:1rpx solid $dz-brand-primary;border-radius:8rpx;color:$dz-brand-deep;font-size:17rpx}.notice{padding:10rpx 22rpx}.notice view{display:flex;align-items:center;gap:18rpx;padding:19rpx 0;border-bottom:1rpx solid $dz-border-subtle}.notice view:last-child{border:0}.notice i{display:flex;align-items:center;justify-content:center;width:50rpx;height:50rpx;border-radius:50%;color:$dz-brand-deep;background:$dz-brand-soft;font-size:26rpx;font-style:normal}.notice text{font-size:21rpx}.booking-price>text{padding:4rpx 10rpx;border:1rpx solid $dz-brand-primary;border-radius:8rpx;color:$dz-brand-deep}.booking-price strong{font-size:29rpx}
</style>
