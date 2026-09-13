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
import { businessDateKeyParts, businessTimeParts } from '@/utils/businessTime'

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
  const birth = businessDateKeyParts(props.item.birth_date)
  const today = businessTimeParts(Date.now())
  let age = today.year - birth.year
  if (today.month < birth.month || (today.month === birth.month && today.day < birth.day)) age -= 1
  return `${Math.max(18, age)}岁`
})
</script>

<style lang="scss" scoped>
@use '../styles/tokens.scss' as *;

.provider-card { overflow:hidden; min-width:0; height:354rpx; border:1rpx solid $dz-border-material; border-radius:$dz-radius-lg; background:$dz-surface-card; box-shadow:$dz-shadow-card,inset 0 1rpx 0 $dz-surface-highlight; transform-origin:center; transition:transform $dz-duration-fast $dz-ease-out, opacity $dz-duration-fast $dz-ease-standard; will-change:transform; box-sizing:border-box; }
.provider-card--pressed { transform:scale(0.98); opacity:0.94; }
.provider-photo { position:relative; overflow:hidden; height:208rpx; color:$dz-text-inverse; background:linear-gradient(145deg,$dz-brand-soft,$dz-brand-deep); }
.provider-image,.provider-fallback,.photo-gradient { position:absolute; width:100%; height:100%; top:0; right:0; bottom:0; left:0; }
.provider-fallback { display:flex; align-items:center; justify-content:center; font-size:64rpx; font-weight:$dz-fw-bold; }
.photo-gradient { background:linear-gradient(180deg,rgba(3,12,14,.16) 0%,transparent 42%,rgba(3,12,14,.16) 100%); }
.availability { position:absolute; z-index:1; top:12rpx; left:12rpx; display:flex; align-items:center; gap:6rpx; height:30rpx; padding:0 10rpx; border:1rpx solid rgba(255,255,255,.28); border-radius:$dz-radius-full; color:$dz-text-inverse; background:rgba(14,28,31,.34); font-size:$dz-fs-micro; line-height:1; text-shadow:0 1rpx 5rpx rgba(0,0,0,.45); white-space:nowrap; box-sizing:border-box; }
/* #ifdef H5 */
.availability { -webkit-backdrop-filter:saturate(145%) blur(10px); backdrop-filter:saturate(145%) blur(10px); }
/* #endif */
.availability-dot { width:11rpx; height:11rpx; border:2rpx solid rgba(255,255,255,.9); border-radius:50%; background:$dz-status-success; box-shadow:0 0 7rpx rgba(33,212,136,.6); }
.availability.offline .availability-dot { background:$dz-text-tertiary; box-shadow:none; }
.provider-body { padding:14rpx 14rpx 12rpx; }
.name-row { display:flex; align-items:center; justify-content:space-between; min-width:0; gap:5rpx; }
.provider-name { overflow:hidden; color:$dz-text-primary; font-size:$dz-fs-caption; line-height:31rpx; font-weight:$dz-fw-semibold; text-overflow:ellipsis; white-space:nowrap; }
.rating { flex:0 0 auto; color:$dz-text-secondary; font-size:$dz-fs-micro; line-height:28rpx; white-space:nowrap; }
.rating .star { color:$dz-status-warning; font-size:$dz-fs-caption; }
.tag-row { display:flex; min-width:0; gap:5rpx; margin-top:8rpx; }
.tag { overflow:hidden; height:28rpx; padding:0 8rpx; border:1rpx solid $dz-border-subtle; border-radius:$dz-radius-full; color:$dz-text-secondary; background:$dz-surface-page; font-size:$dz-fs-micro; line-height:27rpx; text-overflow:ellipsis; white-space:nowrap; box-sizing:border-box; }
.tag.primary { border-color:$dz-brand-primary; color:$dz-brand-deep; background:$dz-brand-soft; }
.provider-meta { display:block; overflow:hidden; margin-top:10rpx; color:$dz-text-tertiary; font-size:$dz-fs-micro; line-height:26rpx; text-overflow:ellipsis; white-space:nowrap; }

@media (prefers-reduced-motion: reduce) {
  .provider-card { transition:none; }
  .provider-card--pressed { transform:none; opacity:0.85; }
}
</style>
