<template>
  <view class="activity-carousel">
    <swiper
      class="activity-swiper"
      :current="activeIndex"
      :previous-margin="sideMargin"
      :next-margin="sideMargin"
      :circular="items.length > 1"
      :duration="280"
      @change="handleChange"
    >
      <swiper-item v-for="(item, index) in items" :key="item.id" class="activity-slide">
        <view
          class="activity-banner"
          :class="{ 'activity-banner--active': index === activeIndex }"
          hover-class="activity-banner--pressed"
          @tap="$emit('select', item.id)"
        >
          <image v-if="item.cover_url" class="activity-cover" :src="item.cover_url" mode="aspectFill" />
          <view class="activity-placeholder" v-else>{{ item.category }}</view>
          <view class="activity-shade" />
          <view class="activity-topline">
            <text class="recruiting">{{ statusLabel(item.status) }}</text>
            <text class="distance">{{ distanceLabel(item.distance_km) }}</text>
          </view>
          <view class="activity-info">
            <text class="activity-title">{{ item.title }}</text>
            <view class="activity-bottomline">
              <text class="activity-meta">{{ formatActivityTime(item.starts_at) }} · {{ item.min_participants }}/{{ item.capacity }}人</text>
              <text class="activity-price"><text class="activity-price-prefix">AA</text> ¥{{ formatAmount(item.aa_principal_amount) }}</text>
            </view>
          </view>
        </view>
      </swiper-item>
    </swiper>

    <view v-if="items.length > 1" class="activity-dots" aria-label="活动轮播位置">
      <view
        v-for="(_, index) in items"
        :key="index"
        class="activity-dot"
        :class="{ active: index === activeIndex }"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import type { ActivityListItem } from '@/types/api'
import { formatActivityTime, formatAmount } from '@/utils/formatters'

defineProps<{ items: ActivityListItem[] }>()
defineEmits<{ select: [id: number] }>()

const activeIndex = ref(0)
const sideMargin = '52rpx'

function handleChange(event: { detail: { current: number } }) {
  activeIndex.value = event.detail.current
}

function distanceLabel(distance: number | null) {
  return distance === null ? '同城' : `${distance.toFixed(1)}km`
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: '草稿',
    pending_review: '待审核',
    recruiting: '招募中',
    formed: '已成局',
    in_progress: '进行中',
    completed: '已结束',
    cancelled: '已取消',
    failed_to_form: '未成局',
  }
  return labels[status] || '活动中'
}
</script>

<style lang="scss" scoped>
@use '../styles/tokens.scss' as *;

.activity-carousel { margin:0 -24rpx; }
.activity-swiper { height:254rpx; overflow:visible; }
.activity-slide { display:flex; align-items:center; justify-content:center; box-sizing:border-box; }
.activity-banner {
  position:relative;
  overflow:hidden;
  width:100%;
  height:202rpx;
  border:1rpx solid rgba(19,37,42,.08);
  border-radius:22rpx;
  background:#17383b;
  box-shadow:0 7rpx 13rpx rgba(19,37,42,.16);
  opacity:.62;
  transform:scale(.9) perspective(900rpx) rotateY(2deg);
  transition:transform .28s ease,opacity .28s ease,box-shadow .28s ease;
  box-sizing:border-box;
}
.activity-banner--active {
  z-index:2;
  opacity:1;
  transform:scale(1) perspective(900rpx) rotateY(0);
  box-shadow:0 6rpx 10rpx rgba(16,48,51,.18),0 22rpx 38rpx rgba(16,48,51,.18),0 2rpx 0 rgba(24,199,198,.35);
}
.activity-banner--pressed { transform:scale(.98); }
.activity-cover,.activity-shade,.activity-placeholder { position:absolute; width:100%; height:100%; inset:0; }
.activity-placeholder { display:flex; align-items:center; justify-content:center; color:#fff; background:linear-gradient(135deg,#237c7e,#122f32); font-size:30rpx; font-weight:700; }
.activity-shade { background:linear-gradient(180deg,rgba(3,11,13,.08) 20%,rgba(3,11,13,.78) 100%); }
.activity-topline { position:absolute; z-index:1; top:14rpx; left:16rpx; right:16rpx; display:flex; align-items:center; justify-content:space-between; }
.recruiting { padding:5rpx 14rpx; border-radius:18rpx; color:#fff; background:rgba(22,182,109,.94); font-size:19rpx; font-weight:700; }
.distance { color:#fff; font-size:20rpx; text-shadow:0 1rpx 4rpx rgba(0,0,0,.5); }
.activity-info { position:absolute; z-index:1; right:18rpx; bottom:14rpx; left:18rpx; color:#fff; }
.activity-title { display:block; overflow:hidden; font-size:28rpx; font-weight:800; line-height:38rpx; text-overflow:ellipsis; white-space:nowrap; }
.activity-bottomline { display:flex; align-items:flex-end; justify-content:space-between; gap:12rpx; margin-top:4rpx; }
.activity-meta { overflow:hidden; min-width:0; color:rgba(255,255,255,.94); font-size:20rpx; text-overflow:ellipsis; white-space:nowrap; }
.activity-price { flex:0 0 auto; color:$dz-price-primary; font-size:30rpx; font-weight:800; white-space:nowrap; }
.activity-price-prefix { font-size:17rpx; font-weight:600; }
.activity-dots { display:flex; align-items:center; justify-content:center; gap:12rpx; height:22rpx; }
.activity-dot { width:12rpx; height:12rpx; border-radius:8rpx; background:#dce1e3; transition:width .2s ease,background .2s ease; }
.activity-dot.active { width:34rpx; background:$dz-brand-primary; }

@media (prefers-reduced-motion: reduce) {
  .activity-banner,.activity-dot { transition:none; }
}
</style>
