<template>
  <view class="provider-card" hover-class="provider-card--pressed" @tap="$emit('select', item.public_id)">
    <view class="provider-photo">
      <image v-if="item.avatar_url" class="provider-image" :src="item.avatar_url" mode="aspectFill" />
      <view v-else class="provider-fallback">{{ item.nickname.slice(0, 1) }}</view>
      <view class="photo-gradient" />
      <view class="availability" :class="{ offline: !item.is_online }"><view class="availability-dot" /><text>{{ availabilityLabel }}</text></view>
    </view>

    <view class="provider-body">
      <view class="name-row">
        <text class="provider-name">{{ item.nickname }}</text>
        <text class="rating"><text class="star">★</text> {{ item.rating }}</text>
      </view>
      <view class="tag-row">
        <text class="tag primary">{{ serviceName }}</text>
        <text class="tag">{{ traitLabel }}</text>
      </view>
      <text class="provider-meta">{{ locationLabel }} · {{ ageLabel }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { HomeProviderListItem } from '@/types/api'

const props = defineProps<{ item: HomeProviderListItem }>()
defineEmits<{ select: [id: string] }>()

const availabilityLabel = computed(() => props.item.is_online ? '在线' : '离线')
const serviceName = computed(() => {
  const service = props.item.services[0]
  const labels: Record<string, string> = {
    travel: '旅游达人',
    billiards: '台球高手',
    'board-games': '桌游玩家',
    business: '商务陪同',
  }
  return labels[service?.category_slug || ''] || service?.category || '同城达人'
})
const traitLabel = computed(() => {
  const slug = props.item.services[0]?.category_slug
  const labels: Record<string, string> = { travel: '爱拍照', billiards: '健谈', 'board-games': '细心', business: '靠谱' }
  return labels[slug || ''] || '好相处'
})
const locationLabel = computed(() => props.item.service_city_name.replace(/市$/, '') || '同城')
const ageLabel = computed(() => {
  if (!props.item.birth_date) return '年龄保密'
  const birth = new Date(`${props.item.birth_date}T00:00:00`)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age -= 1
  return `${Math.max(18, age)}岁`
})
</script>

<style lang="scss" scoped>
@use '../styles/tokens.scss' as *;

.provider-card { overflow:hidden; min-width:0; height:334rpx; border:1rpx solid rgba(23,33,38,.055); border-radius:17rpx; background:#fff; box-shadow:0 8rpx 24rpx rgba(31,65,72,.075); transition:transform .18s ease,box-shadow .18s ease; box-sizing:border-box; }
.provider-card--pressed { transform:scale(.985); box-shadow:0 4rpx 14rpx rgba(31,65,72,.06); }
.provider-photo { position:relative; overflow:hidden; height:194rpx; color:#fff; background:linear-gradient(145deg,#badfe4,#6db8be); }
.provider-image,.provider-fallback,.photo-gradient { position:absolute; width:100%; height:100%; inset:0; }
.provider-fallback { display:flex; align-items:center; justify-content:center; font-size:64rpx; font-weight:800; }
.photo-gradient { background:linear-gradient(180deg,rgba(3,12,14,.18) 0%,transparent 34%,rgba(3,12,14,.03) 100%); }
.availability { position:absolute; z-index:1; top:10rpx; left:10rpx; display:flex; align-items:center; gap:5rpx; color:#fff; font-size:17rpx; line-height:1; text-shadow:0 1rpx 5rpx rgba(0,0,0,.7); white-space:nowrap; }
.availability-dot { width:11rpx; height:11rpx; border:2rpx solid rgba(255,255,255,.9); border-radius:50%; background:#21d488; box-shadow:0 0 7rpx rgba(33,212,136,.6); }
.availability.offline .availability-dot { background:#9aa4aa; box-shadow:none; }
.provider-body { padding:11rpx 10rpx 10rpx; }
.name-row { display:flex; align-items:center; justify-content:space-between; min-width:0; gap:5rpx; }
.provider-name { overflow:hidden; color:$dz-text-primary; font-size:24rpx; line-height:31rpx; font-weight:800; text-overflow:ellipsis; white-space:nowrap; }
.rating { flex:0 0 auto; color:#687279; font-size:18rpx; line-height:28rpx; white-space:nowrap; }
.rating .star { color:#ffad00; font-size:20rpx; }
.tag-row { display:flex; min-width:0; gap:5rpx; margin-top:8rpx; }
.tag { overflow:hidden; height:28rpx; padding:0 4rpx; border:1rpx solid #dfe4e6; border-radius:5rpx; color:#707980; background:#fafafa; font-size:15rpx; line-height:27rpx; text-overflow:ellipsis; white-space:nowrap; box-sizing:border-box; }
.tag.primary { border-color:#42d8d5; color:#08aeb4; background:#f7ffff; }
.provider-meta { display:block; overflow:hidden; margin-top:10rpx; color:#858e94; font-size:17rpx; line-height:26rpx; text-overflow:ellipsis; white-space:nowrap; }

@media (prefers-reduced-motion: reduce) {
  .provider-card { transition:none; }
}
</style>
