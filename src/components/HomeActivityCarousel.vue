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
        <view class="activity-tags"><text v-for="tag in item.tags.slice(0, 2)" :key="tag.slug" class="category-tag">{{ tag.name }}</text></view>
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

.activity-card { display:grid; grid-template-columns:232rpx minmax(0,1fr); overflow:hidden; height:220rpx; border:1rpx solid $dz-border-material; border-radius:$dz-radius-lg; background:$dz-surface-card; box-shadow:$dz-shadow-card,inset 0 1rpx 0 $dz-surface-highlight; transform-origin:center; transition:transform $dz-duration-fast $dz-ease-out, opacity $dz-duration-fast $dz-ease-standard; will-change:transform; }
.activity-card--pressed { transform:scale(0.985); opacity:0.94; }
.activity-media { position:relative; overflow:hidden; min-width:0; margin:10rpx; border-radius:30rpx; background:linear-gradient(145deg,$dz-brand-soft,$dz-brand-deep); }
.activity-cover,.activity-placeholder { position:absolute; width:100%; height:100%; top:0; right:0; bottom:0; left:0; }
.activity-placeholder { display:flex; align-items:center; justify-content:center; color:$dz-text-inverse; font-size:$dz-fs-body; font-weight:$dz-fw-semibold; }
.activity-info { position:relative; min-width:0; padding:18rpx 18rpx 15rpx 8rpx; box-sizing:border-box; }
.activity-title { display:block; overflow:hidden; color:$dz-text-primary; font-size:$dz-fs-body; line-height:35rpx; font-weight:$dz-fw-semibold; text-overflow:ellipsis; white-space:nowrap; }
.meta-row { display:flex; align-items:center; min-width:0; gap:10rpx; margin-top:8rpx; color:$dz-text-secondary; font-size:$dz-fs-micro; line-height:24rpx; }
.meta-row text { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.meta-icon { position:relative; display:block; flex:0 0 19rpx; width:19rpx; height:19rpx; color:$dz-text-tertiary; box-sizing:border-box; font-style:normal; }
.meta-icon.pin { width:16rpx; height:16rpx; margin:0 1rpx 4rpx 2rpx; border:3rpx solid currentColor; border-radius:50% 50% 50% 0; transform:rotate(-45deg); }
.meta-icon.pin::after { position:absolute; width:4rpx; height:4rpx; top:3rpx; left:3rpx; border-radius:50%; background:currentColor; content:''; }
.meta-icon.clock { border:3rpx solid currentColor; border-radius:50%; }
.meta-icon.clock::before { position:absolute; width:2rpx; height:5rpx; top:3rpx; left:6rpx; background:currentColor; content:''; }
.meta-icon.clock::after { position:absolute; width:5rpx; height:2rpx; top:8rpx; left:7rpx; background:currentColor; transform:rotate(26deg); transform-origin:left center; content:''; }
.meta-icon.people::before,.meta-icon.people::after { position:absolute; border:2rpx solid currentColor; content:''; box-sizing:border-box; }
.meta-icon.people::before { width:8rpx; height:8rpx; top:0; left:5rpx; border-radius:50%; }
.meta-icon.people::after { width:18rpx; height:10rpx; bottom:0; left:0; border-bottom:0; border-radius:$dz-radius-sm 12rpx 0 0; }
.activity-footer { position:absolute; right:17rpx; bottom:13rpx; left:17rpx; display:flex; align-items:flex-end; justify-content:space-between; gap:8rpx; }
.activity-tags { display:flex; min-width:0; gap:7rpx; }
.category-tag,.friendly-tag,.aa-tag { height:27rpx; padding:0 8rpx; border:1rpx solid $dz-brand-primary; border-radius:$dz-radius-full; color:$dz-brand-deep; background:$dz-brand-soft; font-size:$dz-fs-micro; line-height:26rpx; box-sizing:border-box; white-space:nowrap; }
.friendly-tag { border-color:$dz-border-subtle; color:$dz-text-secondary; background:$dz-surface-page; }
.activity-price { display:flex; flex:0 0 auto; align-items:flex-end; gap:4rpx; color:$dz-price-primary; font-size:$dz-fs-price-md; line-height:38rpx; font-weight:$dz-fw-bold; white-space:nowrap; }
.activity-price .aa-tag { margin-right:3rpx; border-color:#ffccb9; color:$dz-price-primary; background:$dz-surface-card; font-size:$dz-fs-micro; line-height:25rpx; font-weight:$dz-fw-medium; }
.price-symbol { font-size:$dz-fs-caption; line-height:32rpx; }

@media (prefers-reduced-motion: reduce) {
  .activity-card { transition:none; }
}
</style>
