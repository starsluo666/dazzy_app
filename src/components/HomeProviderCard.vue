<template>
  <view class="provider-card" hover-class="provider-card--pressed" @tap="$emit('select', item.public_id)">
    <view class="provider-photo">
      <image v-if="item.avatar_url" class="provider-image" :src="item.avatar_url" mode="aspectFill" />
      <view v-else class="provider-fallback">{{ item.nickname.slice(0, 1) }}</view>
      <view class="photo-gradient" />
      <view class="availability"><view class="availability-dot" /><text>{{ availabilityLabel }}</text></view>
      <button
        class="favorite"
        :aria-label="favorite ? '取消收藏达人' : '收藏达人'"
        :aria-pressed="favorite"
        @tap.stop="toggleFavorite"
      >
        <text :class="{ active: favorite }">{{ favorite ? '♥' : '♡' }}</text>
      </button>
    </view>

    <view class="provider-body">
      <view class="name-row">
        <view class="name-wrap"><text class="provider-name">{{ item.nickname }}</text><text v-if="item.verified" class="verified">✓</text></view>
        <text class="distance">{{ distanceLabel }}</text>
      </view>
      <view class="proof-row"><text class="rating">★ {{ item.rating }}</text><text class="proof-divider">·</text><text>服务{{ item.service_count }}次</text></view>
      <view class="service-row"><text class="service-icon">◉</text><text>{{ serviceName }}</text></view>
      <view class="action-row">
        <text class="price">¥<text class="price-value">{{ price }}</text><text class="price-unit">/{{ billingUnit }}</text></text>
        <button class="book-button" @tap.stop="$emit('select', item.public_id)">预约</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

import type { HomeProviderListItem } from '@/types/api'
import { formatAmount } from '@/utils/formatters'

const props = defineProps<{ item: HomeProviderListItem }>()
defineEmits<{ select: [id: string] }>()

const favorite = ref(props.item.is_favorited)
const availabilityLabel = computed(() => formatAvailability(props.item))
const serviceName = computed(() => props.item.services[0]?.category || '达人服务')
const price = computed(() => formatAmount(props.item.services[0]?.price_amount || 0))
const billingUnit = computed(() => props.item.services[0]?.billing_type === 'per_session' ? '次' : '小时')
const distanceLabel = computed(() => props.item.distance_km === null ? props.item.service_city_name : `${props.item.distance_km.toFixed(1)}km`)

function toggleFavorite() {
  favorite.value = !favorite.value
}

function formatAvailability(item: HomeProviderListItem) {
  if (item.availability_status !== 'available' || !item.earliest_available_at) return '暂不可约'
  const earliest = new Date(item.earliest_available_at)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const time = `${String(earliest.getHours()).padStart(2, '0')}:${String(earliest.getMinutes()).padStart(2, '0')}`
  if (earliest.toDateString() === today.toDateString()) return `最快${time}可约`
  if (earliest.toDateString() === tomorrow.toDateString()) return `明天${time}可约`
  return `${earliest.getMonth() + 1}月${earliest.getDate()}日可约`
}
</script>

<style lang="scss" scoped>
@use '../styles/tokens.scss' as *;

button { margin:0; padding:0; border:0; line-height:1; background:transparent; }
button::after { display:none; }
.provider-card { overflow:hidden; min-width:0; border:1rpx solid rgba(23,33,38,.06); border-radius:22rpx; background:#fff; box-shadow:0 9rpx 26rpx rgba(31,65,72,.075); transition:transform .18s ease,box-shadow .18s ease; }
.provider-card--pressed { transform:scale(.985); box-shadow:0 4rpx 14rpx rgba(31,65,72,.06); }
.provider-photo { position:relative; overflow:hidden; height:300rpx; color:#fff; background:linear-gradient(145deg,#badfe4,#6db8be); }
.provider-image,.provider-fallback,.photo-gradient { position:absolute; width:100%; height:100%; inset:0; }
.provider-fallback { display:flex; align-items:center; justify-content:center; font-size:64rpx; font-weight:800; }
.photo-gradient { background:linear-gradient(180deg,rgba(3,12,14,.08) 0%,transparent 58%,rgba(3,12,14,.22) 100%); }
.availability { position:absolute; z-index:1; top:14rpx; left:14rpx; display:flex; align-items:center; gap:7rpx; max-width:230rpx; padding:7rpx 12rpx; border-radius:18rpx; color:#fff; background:rgba(14,23,25,.7); backdrop-filter:blur(8rpx); font-size:18rpx; line-height:1; white-space:nowrap; }
.availability-dot { width:12rpx; height:12rpx; border-radius:50%; background:#48e444; box-shadow:0 0 8rpx rgba(72,228,68,.62); }
.favorite { position:absolute; z-index:1; top:4rpx; right:4rpx; display:flex; align-items:center; justify-content:center; width:72rpx; height:72rpx; color:#fff; text-shadow:0 2rpx 5rpx rgba(0,0,0,.35); }
.favorite text { font-size:47rpx; }
.favorite text.active { color:#ff6f66; }
.provider-body { padding:14rpx 16rpx 15rpx; }
.name-row,.action-row { display:flex; align-items:center; justify-content:space-between; gap:10rpx; }
.name-wrap { display:flex; align-items:center; min-width:0; gap:7rpx; }
.provider-name { overflow:hidden; color:$dz-text-primary; font-size:27rpx; font-weight:800; text-overflow:ellipsis; white-space:nowrap; }
.verified { display:flex; align-items:center; justify-content:center; width:23rpx; height:23rpx; border-radius:50%; color:#fff; background:$dz-brand-primary; font-size:15rpx; font-weight:800; }
.distance { flex:0 0 auto; color:#7c8890; font-size:18rpx; }
.proof-row { display:flex; align-items:center; gap:7rpx; margin-top:7rpx; color:#748087; font-size:18rpx; white-space:nowrap; }
.rating { color:#6f7880; }
.rating::first-letter { color:#ffbd20; }
.proof-divider { color:#b6bec2; }
.service-row { display:flex; align-items:center; gap:7rpx; margin-top:8rpx; color:$dz-brand-deep; font-size:19rpx; }
.service-icon { font-size:18rpx; }
.action-row { margin-top:10rpx; }
.price { color:$dz-price-primary; font-size:22rpx; white-space:nowrap; }
.price-value { font-size:34rpx; font-weight:800; }
.price-unit { font-size:17rpx; }
.book-button { display:flex; align-items:center; justify-content:center; width:94rpx; height:64rpx; border-radius:17rpx; color:#fff; background:$dz-gradient-brand; box-shadow:0 6rpx 13rpx rgba(8,174,180,.2); font-size:23rpx; font-weight:700; }

@media (prefers-reduced-motion: reduce) {
  .provider-card { transition:none; }
}
</style>
