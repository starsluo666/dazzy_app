<template>
  <view class="dz-page location-page">
    <header class="booking-head location-head"><button aria-label="返回" @tap="goBack">‹</button><text>选择集合地点</text></header>
    <view v-if="draft">
      <view class="search"><text>⌕</text><input v-model="searchText" placeholder="搜索地点" confirm-type="search" @confirm="useSearch" /></view>
      <section class="map-view">
        <view class="roads" /><text class="map-label label-a">城市公园</text><text class="map-label label-b">商业广场</text><text class="map-label label-c">火车站</text><view class="service-radius" /><view class="map-pin">●</view><button class="locate" aria-label="定位">⌾</button>
      </section>
      <section class="location-sheet">
        <i /><text class="sheet-title">集合地点</text>
        <label class="address-row"><text class="pin">●</text><input v-model="address" placeholder="请输入详细集合地点" /><text class="checked">✓</text></label>
        <view class="distance"><text>⌘ 距达人 <b>6.8km</b></text><i/><text>驾车约<b>18分钟</b></text></view>
        <text class="in-range">◆ 在达人服务范围内</text>
        <text class="common-title">常用地址</text><view class="common"><button v-for="item in commonPlaces" :key="item" @tap="address=item">{{ item }}</button></view>
        <view class="contact-fields"><label><text>联系人</text><input v-model="contactName" placeholder="请输入姓名" /></label><label><text>手机号</text><input v-model="contactPhone" type="number" maxlength="11" placeholder="用于服务联系" /></label></view>
        <button class="confirm-location" :disabled="!valid" @tap="next">确认地点</button>
      </section>
    </view>
    <view v-else class="booking-empty">预约信息已失效，请返回达人详情重新选择。</view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'; import { onLoad } from '@dcloudio/uni-app'; import { getBookingDraft, updateBookingDraft } from '@/services/bookingDraft'; import type { BookingDraft } from '@/services/bookingDraft'
const draft=ref<BookingDraft|null>(null),searchText=ref(''),address=ref(''),contactName=ref(''),contactPhone=ref('')
const commonPlaces=['美乐城南门','龙湖公园东门','邯郸东站']
const valid=computed(()=>address.value.trim().length>=4&&contactName.value.trim().length>=1&&/^1\d{10}$/.test(contactPhone.value))
function goBack(){uni.navigateBack()}
function useSearch(){if(searchText.value.trim())address.value=searchText.value.trim()}
function next(){if(!valid.value)return;updateBookingDraft({address:address.value.trim(),contactName:contactName.value.trim(),contactPhone:contactPhone.value});uni.navigateTo({url:'/pages/booking/confirm'})}
onLoad(()=>{draft.value=getBookingDraft();if(draft.value){address.value=draft.value.address;contactName.value=draft.value.contactName;contactPhone.value=draft.value.contactPhone}})
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *; @use '../../styles/booking.scss';
.location-page{min-height:100vh;background:#eefbfc}.location-head{background:linear-gradient(110deg,#eaffff,#cffafa)}.search{position:absolute;z-index:5;top:calc(110rpx + env(safe-area-inset-top));right:28rpx;left:28rpx;display:flex;align-items:center;height:76rpx;padding:0 22rpx;border-radius:38rpx;background:#fff;box-shadow:0 10rpx 28rpx rgba(31,65,72,.12)}.search text{color:$dz-text-secondary;font-size:38rpx}.search input{flex:1;height:76rpx;margin-left:14rpx;font-size:23rpx}.map-view{position:relative;overflow:hidden;height:720rpx;background-color:#eef4f1;background-image:linear-gradient(28deg,transparent 44%,rgba(255,199,70,.55) 45%,rgba(255,199,70,.55) 47%,transparent 48%),linear-gradient(92deg,transparent 43%,rgba(139,205,248,.45) 44%,rgba(139,205,248,.45) 46%,transparent 47%),repeating-linear-gradient(0deg,transparent 0 54rpx,rgba(255,255,255,.92) 55rpx 62rpx),repeating-linear-gradient(90deg,transparent 0 62rpx,rgba(255,255,255,.9) 63rpx 70rpx)}.roads{position:absolute;inset:0;background:radial-gradient(circle at 62% 36%,rgba(91,218,139,.22) 0 70rpx,transparent 72rpx),radial-gradient(circle at 17% 80%,rgba(91,218,139,.25) 0 100rpx,transparent 102rpx)}.service-radius{position:absolute;left:50%;top:51%;width:410rpx;height:410rpx;border:2rpx dashed $dz-brand-primary;border-radius:50%;background:rgba(24,199,198,.08);transform:translate(-50%,-50%)}.map-pin{position:absolute;left:50%;top:50%;display:flex;align-items:center;justify-content:center;width:70rpx;height:84rpx;border-radius:50% 50% 50% 6rpx;color:#fff;background:$dz-gradient-brand;box-shadow:0 8rpx 20rpx rgba(8,174,180,.25);font-size:24rpx;transform:translate(-50%,-50%) rotate(-45deg)}.map-pin::first-letter{transform:rotate(45deg)}.map-label{position:absolute;padding:5rpx 9rpx;border-radius:8rpx;color:#32815b;background:rgba(255,255,255,.76);font-size:18rpx}.label-a{left:13%;top:30%}.label-b{right:15%;top:48%;color:#f18024}.label-c{right:14%;bottom:15%;color:#247bb8}.locate{position:absolute;right:30rpx;bottom:38rpx;width:74rpx;height:74rpx;margin:0;padding:0;border:0;border-radius:50%;color:$dz-brand-deep;background:#fff;box-shadow:0 8rpx 25rpx rgba(31,65,72,.16);font-size:38rpx;line-height:74rpx}.locate::after,.common button::after,.confirm-location::after{display:none}.location-sheet{position:relative;margin-top:-25rpx;padding:36rpx 32rpx calc(30rpx + env(safe-area-inset-bottom));border-radius:34rpx 34rpx 0 0;background:#fff}.location-sheet>i{position:absolute;top:13rpx;left:50%;width:70rpx;height:7rpx;border-radius:4rpx;background:#d6dadd;transform:translateX(-50%)}.sheet-title{font-size:31rpx;font-weight:700}.address-row{display:flex;align-items:center;gap:16rpx;margin-top:22rpx;padding:18rpx 0;border-bottom:1rpx solid $dz-border-subtle}.address-row input{flex:1;font-size:25rpx;font-weight:600}.pin,.checked{color:$dz-brand-primary;font-size:28rpx}.distance{display:flex;align-items:center;justify-content:space-around;padding:21rpx 0;border-bottom:1rpx solid $dz-border-subtle;font-size:21rpx}.distance i{width:1rpx;height:30rpx;background:$dz-border-subtle}.distance b{color:$dz-brand-deep;font-weight:500}.in-range{display:block;margin-top:18rpx;color:$dz-status-success;font-size:21rpx}.common-title{display:block;margin-top:24rpx;font-size:22rpx;font-weight:700}.common{display:flex;gap:10rpx;margin-top:14rpx}.common button{flex:1;height:58rpx;margin:0;padding:0 8rpx;border:1rpx solid $dz-border-subtle;border-radius:30rpx;background:#fff;font-size:18rpx;line-height:58rpx}.contact-fields{display:grid;grid-template-columns:1fr 1.3fr;gap:12rpx;margin-top:20rpx}.contact-fields label{padding:13rpx 16rpx;border:1rpx solid $dz-border-subtle;border-radius:15rpx}.contact-fields label text{display:block;color:$dz-text-secondary;font-size:17rpx}.contact-fields input{height:44rpx;font-size:21rpx}.confirm-location{height:80rpx;margin:24rpx 0 0;border:0;border-radius:40rpx;color:#fff;background:$dz-gradient-brand;font-size:29rpx;font-weight:700;line-height:80rpx}.confirm-location[disabled]{opacity:.45}
</style>
