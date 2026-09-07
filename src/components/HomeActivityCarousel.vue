<template>
  <view v-if="item" class="activity-card" hover-class="activity-card--pressed" @tap="$emit('select', item.id)">
    <view class="activity-media">
      <image v-if="item.cover_url" class="activity-cover" :src="item.cover_url" mode="aspectFill" />
      <view class="activity-placeholder" v-else>{{ item.category }}</view>
    </view>
    <view class="activity-info">
      <text class="activity-title">{{ item.title }}</text>
      <view class="meta-row"><i class="meta-icon pin" /><text>{{ item.meeting_place_name || '邯郸市' }}</text></view>
      <view class="meta-row"><i class="meta-icon clock" /><text>{{ homeActivityTime(item.starts_at) }}</text></view>
      <view class="meta-row"><i class="meta-icon people" /><text>{{ item.participant_count }}/{{ item.capacity }}人</text></view>
      <view class="activity-footer">
        <view class="activity-tags"><text class="category-tag">{{ item.category }}</text><text class="friendly-tag">新手友好</text></view>
        <view class="activity-price"><text class="aa-tag">AA</text><text class="price-symbol">¥</text><text>{{ formatAmount(item.aa_principal_amount) }}</text></view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { HomeActivityListItem } from '@/types/api'
import { formatAmount } from '@/utils/formatters'
import { businessClock, businessDateKey, businessDateKeyAfter, businessTimeParts } from '@/utils/businessTime'

const props = defineProps<{ items: HomeActivityListItem[] }>()
defineEmits<{ select: [id: number] }>()

const item = computed(() => props.items[0])

function homeActivityTime(value: string) {
  const key = businessDateKey(value)
  const parts = businessTimeParts(value)
  const time = businessClock(value)
  if (key === businessDateKey()) return `今天 ${time}`
  if (key === businessDateKeyAfter(1)) return `明天 ${time}`
  return `${parts.month}月${parts.day}日 ${time}`
}
</script>

<style lang="scss" scoped>
@use '../styles/tokens.scss' as *;

.activity-card { display:grid; grid-template-columns:238rpx minmax(0,1fr); overflow:hidden; height:210rpx; border:1rpx solid rgba(23,33,38,.055); border-radius:23rpx; background:#fff; box-shadow:0 8rpx 26rpx rgba(31,65,72,.075); transition:transform .18s ease,box-shadow .18s ease; }
.activity-card--pressed { transform:scale(.99); box-shadow:0 4rpx 14rpx rgba(31,65,72,.06); }
.activity-media { position:relative; overflow:hidden; min-width:0; background:linear-gradient(145deg,#badfe4,#397f83); }
.activity-cover,.activity-placeholder { position:absolute; width:100%; height:100%; inset:0; }
.activity-placeholder { display:flex; align-items:center; justify-content:center; color:#fff; font-size:27rpx; font-weight:700; }
.activity-info { position:relative; min-width:0; padding:16rpx 18rpx 13rpx; box-sizing:border-box; }
.activity-title { display:block; overflow:hidden; color:$dz-text-primary; font-size:27rpx; line-height:35rpx; font-weight:800; text-overflow:ellipsis; white-space:nowrap; }
.meta-row { display:flex; align-items:center; min-width:0; gap:10rpx; margin-top:8rpx; color:#6d767c; font-size:20rpx; line-height:24rpx; }
.meta-row text { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.meta-icon { position:relative; display:block; flex:0 0 19rpx; width:19rpx; height:19rpx; color:#7b848a; box-sizing:border-box; font-style:normal; }
.meta-icon.pin { width:16rpx; height:16rpx; margin:0 1rpx 4rpx 2rpx; border:3rpx solid currentColor; border-radius:50% 50% 50% 0; transform:rotate(-45deg); }
.meta-icon.pin::after { position:absolute; width:4rpx; height:4rpx; top:3rpx; left:3rpx; border-radius:50%; background:currentColor; content:''; }
.meta-icon.clock { border:3rpx solid currentColor; border-radius:50%; }
.meta-icon.clock::before { position:absolute; width:2rpx; height:5rpx; top:3rpx; left:6rpx; background:currentColor; content:''; }
.meta-icon.clock::after { position:absolute; width:5rpx; height:2rpx; top:8rpx; left:7rpx; background:currentColor; transform:rotate(26deg); transform-origin:left center; content:''; }
.meta-icon.people::before,.meta-icon.people::after { position:absolute; border:2rpx solid currentColor; content:''; box-sizing:border-box; }
.meta-icon.people::before { width:8rpx; height:8rpx; top:0; left:5rpx; border-radius:50%; }
.meta-icon.people::after { width:18rpx; height:10rpx; bottom:0; left:0; border-bottom:0; border-radius:12rpx 12rpx 0 0; }
.activity-footer { position:absolute; right:17rpx; bottom:13rpx; left:17rpx; display:flex; align-items:flex-end; justify-content:space-between; gap:8rpx; }
.activity-tags { display:flex; min-width:0; gap:7rpx; }
.category-tag,.friendly-tag,.aa-tag { height:27rpx; padding:0 8rpx; border:1rpx solid #42d8d5; border-radius:5rpx; color:#08aeb4; background:#f8ffff; font-size:17rpx; line-height:26rpx; box-sizing:border-box; white-space:nowrap; }
.friendly-tag { border-color:#dfe4e6; color:#707980; background:#fafafa; }
.activity-price { display:flex; flex:0 0 auto; align-items:flex-end; gap:4rpx; color:$dz-price-primary; font-size:38rpx; line-height:38rpx; font-weight:800; white-space:nowrap; }
.activity-price .aa-tag { margin-right:3rpx; border-color:#ffccb9; color:$dz-price-primary; background:#fff; font-size:16rpx; line-height:25rpx; font-weight:500; }
.price-symbol { font-size:23rpx; line-height:32rpx; }

@media (prefers-reduced-motion: reduce) {
  .activity-card { transition:none; }
}
</style>
