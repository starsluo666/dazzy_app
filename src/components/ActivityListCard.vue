<template>
  <view class="activity-row" hover-class="activity-row--pressed" @tap="$emit('open', activity.id)">
    <view class="cover">
      <image v-if="activity.cover_url" :src="activity.cover_url" mode="aspectFill" />
      <text v-else>{{ activity.category }}</text>
    </view>
    <view class="body">
      <text class="name">{{ activity.title }}</text>
      <text v-if="showStatus" class="status">{{ statusLabel(activity.status) }}</text>
      <text class="meta">⌖　{{ activity.meeting_place_name }}</text>
      <text class="meta">◷　{{ formatListTime(activity.starts_at) }}</text>
      <view class="bottom-row">
        <text>♧　{{ activity.min_participants }}/{{ activity.capacity }}人</text>
        <text class="distance">⌖ {{ formatDistance(activity.distance_km) }}</text>
        <text class="price"><small>AA</small> ¥{{ formatAmount(activity.aa_principal_amount) }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { ActivityListItem } from '@/types/api'
import { formatActivityTime, formatAmount, formatDistance } from '@/utils/formatters'
import { businessDateKey, businessDateKeyAfter } from '@/utils/businessTime'

withDefaults(defineProps<{ activity: ActivityListItem; showStatus?: boolean }>(), { showStatus: false })
defineEmits<{ open: [id: number] }>()

function statusLabel(status: string) {
  return ({ recruiting: '报名中', formed: '已成局', in_progress: '进行中' } as Record<string, string>)[status] || '已结束'
}

function formatListTime(value: string) {
  const key = businessDateKey(value)
  const prefix = key === businessDateKey() ? '今天' : key === businessDateKeyAfter(1) ? '明天' : ''
  return prefix ? `${prefix}${formatActivityTime(value).split(' ')[1]}` : formatActivityTime(value)
}
</script>

<style lang="scss" scoped>
@use '../styles/tokens.scss' as *;

.activity-row { display:flex; overflow:hidden; min-height:212rpx; padding:10rpx; border:1rpx solid $dz-border-material; border-radius:$dz-radius-lg; background:$dz-surface-card; box-shadow:$dz-shadow-card,inset 0 1rpx 0 $dz-surface-highlight; box-sizing:border-box; transform-origin:center; transition:transform $dz-duration-fast $dz-ease-out, opacity $dz-duration-fast $dz-ease-standard; will-change:transform; }
.activity-row--pressed { transform:scale(.985); opacity:.94; }
.cover { overflow:hidden; display:flex; align-items:center; justify-content:center; flex:0 0 252rpx; height:192rpx; border-radius:32rpx; color:$dz-text-inverse; background:$dz-status-success-deep; }
.cover image { width:100%; height:100%; }
.body { position:relative; min-width:0; flex:1; padding:6rpx 12rpx 3rpx 20rpx; box-sizing:border-box; }
.name,.meta { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.name { padding-right:92rpx; color:$dz-text-primary; font-size:$dz-fs-body; font-weight:$dz-fw-bold; }
.status { position:absolute; right:4rpx; top:4rpx; padding:7rpx 12rpx; border-radius:$dz-radius-sm; color:$dz-brand-deep; background:$dz-brand-soft; font-size:$dz-fs-caption; }
.meta { margin-top:17rpx; color:$dz-text-secondary; font-size:$dz-fs-caption; }
.bottom-row { position:absolute; right:4rpx; bottom:2rpx; left:20rpx; display:flex; align-items:center; gap:16rpx; color:$dz-text-secondary; font-size:$dz-fs-caption; }
.distance { white-space:nowrap; }
.price { margin-left:auto; color:$dz-price-primary; font-size:$dz-fs-heading; font-weight:$dz-fw-semibold; white-space:nowrap; }
.price small { color:#59656b; font-size:$dz-fs-caption; font-weight:$dz-fw-regular; }

@media (prefers-reduced-motion: reduce) {
  .activity-row { transition:none; }
  .activity-row--pressed { transform:none; }
}

@media screen and (max-width:360px) {
  .cover { flex-basis:224rpx; }
  .distance { display:none; }
}
</style>
