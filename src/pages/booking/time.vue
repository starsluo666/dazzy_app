<template>
  <view class="dz-page booking-page">
    <header class="booking-head"><button aria-label="返回" @tap="goBack">‹</button><text>选择服务时间</text></header>
    <view v-if="draft" class="booking-content">
      <section class="summary booking-card"><view class="booking-avatar"><image v-if="draft.providerAvatarUrl" :src="draft.providerAvatarUrl" mode="aspectFill" /><view v-else>{{ draft.providerName.slice(0,1) }}</view></view><view><strong>{{ draft.providerName }}</strong><text>{{ draft.serviceName }}</text></view><strong class="unit-price">¥{{ money(draft.unitPrice) }} <small>{{ draft.billingType==='hourly'?'每小时':'每次' }}</small></strong></section>
      <section class="calendar booking-card"><view class="month-title"><text>‹</text><strong>{{ monthTitle }}</strong><text>›</text></view><view class="week"><text v-for="item in week" :key="item">{{ item }}</text></view><view class="days"><text v-for="(item,index) in calendarDays" :key="index" :class="{muted:!item.current,available:item.available,active:item.date===selectedDate}" @tap="selectDate(item)">{{ item.day }}</text></view></section>
      <text class="field-title">选择开始时间</text><view class="times"><button v-for="time in timeOptions" :key="time" :class="{active:selectedTime===time}" @tap="selectedTime=time">{{ time }}</button></view>
      <text class="field-title">服务时长</text><view class="duration"><button :disabled="durationMinutes<=minimumMinutes" @tap="changeDuration(-30)">−</button><strong>{{ durationLabel }}</strong><button @tap="changeDuration(30)">＋</button></view><text class="duration-tip">最低{{ minimumMinutes/60 }}小时 · 30分钟粒度</text>
      <section class="cost booking-card"><view><text>服务时间</text><strong>{{ dateTimeLabel }}</strong></view><view><text>服务费</text><strong>¥{{ serviceAmount }}</strong></view></section>
    </view>
    <view v-else class="booking-empty">预约信息已失效，请返回达人详情重新选择。</view>
    <footer v-if="draft" class="booking-footer"><button @tap="next">下一步</button></footer>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'; import { onLoad } from '@dcloudio/uni-app'
import { bookingEndTime, bookingServiceAmount, getBookingDraft, updateBookingDraft } from '@/services/bookingDraft'; import type { BookingDraft } from '@/services/bookingDraft'; import { formatAmount } from '@/utils/formatters'
interface CalendarDay{day:number;date:string;current:boolean;available:boolean}
const draft=ref<BookingDraft|null>(null), selectedDate=ref(''), selectedTime=ref('13:00'), durationMinutes=ref(120)
const week=['日','一','二','三','四','五','六'], timeOptions=['09:00','10:00','13:00','14:00','15:00','16:00']
const minimumMinutes=computed(()=>draft.value?.billingType==='hourly'?120:(draft.value?.durationMinutes||180))
const monthTitle=computed(()=>{const d=new Date(`${selectedDate.value}T00:00:00`);return `${d.getFullYear()}年${d.getMonth()+1}月`})
const calendarDays=computed<CalendarDay[]>(()=>{const base=new Date(`${selectedDate.value}T00:00:00`),year=base.getFullYear(),month=base.getMonth(),first=new Date(year,month,1),start=new Date(year,month,1-first.getDay());return Array.from({length:42},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);const offset=Math.floor((d.getTime()-new Date().setHours(0,0,0,0))/86400000);return{day:d.getDate(),date:key(d),current:d.getMonth()===month,available:offset>=0&&offset<=20&&[1,3,5,6].includes(d.getDay())}})})
const durationLabel=computed(()=>durationMinutes.value%60?`${Math.floor(durationMinutes.value/60)}.5小时`:`${durationMinutes.value/60}小时`)
const dateTimeLabel=computed(()=>{const d=new Date(`${selectedDate.value}T00:00:00`);return `${String(d.getMonth()+1).padStart(2,'0')}月${String(d.getDate()).padStart(2,'0')}日 ${selectedTime.value}—${bookingEndTime(selectedTime.value,durationMinutes.value)}`})
const serviceAmount=computed(()=>draft.value?formatAmount(bookingServiceAmount({...draft.value,durationMinutes:durationMinutes.value})):'0')
const money=formatAmount
function key(d:Date){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function selectDate(item:CalendarDay){if(item.current&&item.available)selectedDate.value=item.date}
function changeDuration(delta:number){durationMinutes.value=Math.max(minimumMinutes.value,Math.min(480,durationMinutes.value+delta))}
function goBack(){uni.navigateBack()}
function next(){updateBookingDraft({date:selectedDate.value,startTime:selectedTime.value,durationMinutes:durationMinutes.value});uni.navigateTo({url:'/pages/booking/location'})}
onLoad(()=>{draft.value=getBookingDraft();if(draft.value){selectedDate.value=draft.value.date;selectedTime.value=draft.value.startTime;durationMinutes.value=draft.value.durationMinutes}})
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *; @use '../../styles/booking.scss';
.summary{display:flex;align-items:center;padding:18rpx 20rpx}.summary .booking-avatar{width:84rpx;height:84rpx}.summary>view:nth-child(2){display:flex;flex-direction:column;gap:7rpx;margin-left:18rpx}.summary strong{font-size:27rpx}.summary text{color:$dz-text-secondary;font-size:20rpx}.unit-price{flex:1;color:$dz-price-primary;text-align:right;font-size:34rpx!important}.unit-price small{color:$dz-text-secondary;font-size:19rpx;font-weight:500}.calendar{margin-top:22rpx;padding:22rpx 18rpx}.month-title,.week,.days{display:grid;grid-template-columns:repeat(7,1fr);align-items:center;text-align:center}.month-title{grid-template-columns:1fr 5fr 1fr}.month-title strong{font-size:28rpx}.month-title text{font-size:40rpx}.week{margin-top:19rpx;color:$dz-text-secondary;font-size:19rpx}.days{row-gap:8rpx;margin-top:10rpx}.days text{display:flex;align-items:center;justify-content:center;width:58rpx;height:58rpx;margin:auto;border-radius:50%;font-size:22rpx}.days .muted{color:#ccd1d3}.days .available{color:$dz-brand-deep;background:$dz-brand-soft}.days .active{color:#fff;background:$dz-gradient-brand}.field-title{display:block;margin-top:30rpx;font-size:27rpx;font-weight:700}.times{display:grid;grid-template-columns:repeat(6,1fr);gap:10rpx;margin-top:18rpx}.times button{height:62rpx;margin:0;padding:0;border:1rpx solid #d8dfe2;border-radius:13rpx;background:#fff;font-size:20rpx;line-height:62rpx}.times button::after,.duration button::after{display:none}.times .active{border-color:$dz-brand-primary;color:#fff;background:$dz-gradient-brand}.duration{display:grid;grid-template-columns:100rpx 1fr 100rpx;align-items:center;width:420rpx;height:78rpx;margin:18rpx auto 0;border:1rpx solid #d8dfe2;border-radius:16rpx;background:#fff}.duration button{height:60rpx;margin:0 12rpx;padding:0;border:0;border-radius:15rpx;background:$dz-brand-soft;color:$dz-brand-deep;font-size:35rpx;line-height:60rpx}.duration strong{text-align:center;font-size:27rpx}.duration-tip{display:block;margin-top:10rpx;color:$dz-text-secondary;text-align:center;font-size:18rpx}.cost{margin-top:24rpx;padding:17rpx 20rpx}.cost view{display:flex;justify-content:space-between;padding:11rpx 0;font-size:22rpx}.cost view+view{border-top:1rpx dashed $dz-border-subtle}.cost strong{font-size:24rpx}.cost view:last-child strong{color:$dz-price-primary;font-size:32rpx}
</style>
