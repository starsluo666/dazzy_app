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

withDefaults(defineProps<{ activity: ActivityListItem; showStatus?: boolean }>(), { showStatus: false })
defineEmits<{ open: [id: number] }>()

function statusLabel(status: string) {
  return ({ recruiting: '报名中', formed: '已成局', in_progress: '进行中' } as Record<string, string>)[status] || '已结束'
}

function formatListTime(value: string) {
  const date = new Date(value)
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const sameDay = (left: Date, right: Date) => left.toDateString() === right.toDateString()
  const prefix = sameDay(date, today) ? '今天' : sameDay(date, tomorrow) ? '明天' : ''
  return prefix ? `${prefix}${formatActivityTime(value).split(' ')[1]}` : formatActivityTime(value)
}
</script>

<style lang="scss" scoped>
@use '../styles/tokens.scss' as *;

.activity-row { display:flex; overflow:hidden; min-height:204rpx; padding:10rpx; border:1rpx solid $dz-border-subtle; border-radius:22rpx; background:#fff; box-shadow:0 8rpx 25rpx rgba(31,65,72,.07); box-sizing:border-box; }
.activity-row--pressed { opacity:.74; }
.cover { overflow:hidden; display:flex; align-items:center; justify-content:center; flex:0 0 252rpx; height:184rpx; border-radius:13rpx; color:#fff; background:#12402e; }
.cover image { width:100%; height:100%; }
.body { position:relative; min-width:0; flex:1; padding:6rpx 12rpx 3rpx 20rpx; box-sizing:border-box; }
.name,.meta { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.name { padding-right:92rpx; color:$dz-text-primary; font-size:27rpx; font-weight:800; }
.status { position:absolute; right:4rpx; top:4rpx; padding:7rpx 12rpx; border-radius:10rpx; color:$dz-brand-deep; background:$dz-brand-soft; font-size:19rpx; }
.meta { margin-top:17rpx; color:#68747a; font-size:20rpx; }
.bottom-row { position:absolute; right:4rpx; bottom:2rpx; left:20rpx; display:flex; align-items:center; gap:16rpx; color:#68747a; font-size:20rpx; }
.distance { white-space:nowrap; }
.price { margin-left:auto; color:#ff501e; font-size:33rpx; font-weight:600; white-space:nowrap; }
.price small { color:#59656b; font-size:19rpx; font-weight:400; }

@media screen and (max-width:360px) {
  .cover { flex-basis:224rpx; }
  .distance { display:none; }
}
</style>
