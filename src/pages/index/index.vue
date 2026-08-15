<template>
  <view class="dz-page dz-page--with-tabbar">
    <view class="dz-safe-top" />
    <view class="topbar dz-container">
      <button class="city">北京市 ▾</button>
      <view class="search">⌕　搜索达人、活动、场馆</view>
      <button class="message">•••</button>
    </view>

    <main class="content dz-container">
      <view class="hero">
        <text class="hero-title">发现同城好搭子</text>
        <text class="hero-subtitle">一起玩 · 一起聊 · 一起出发</text>
        <text class="hero-plane">➤</text>
      </view>

      <view class="scene-grid">
        <view class="scene provider"><text class="scene-title">达人陪伴</text><text>1对1陪伴·更贴心</text><text class="scene-action">找搭子</text><b>搭</b></view>
        <view class="scene activity"><text class="scene-title">同城组局</text><text>多人组局·更热闹</text><text class="scene-action">去组局</text><b>局</b></view>
      </view>

      <view class="categories">
        <view v-for="item in categories" :key="item.label" class="category">
          <view class="category-icon" :style="{ background: item.color }">{{ item.icon }}</view><text>{{ item.label }}</text>
        </view>
      </view>

      <view class="section-head"><text>推荐达人</text><text class="more">更多 ›</text></view>
      <view v-if="loading" class="loading-block">正在发现附近的搭子…</view>
      <scroll-view v-else-if="providers.length" scroll-x class="rail" :show-scrollbar="false">
        <view class="provider-row">
          <view v-for="item in providers" :key="item.public_id" class="provider-card">
            <view class="photo">
              <image v-if="item.avatar_url" class="photo-image" :src="item.avatar_url" mode="aspectFill" />
              <text v-else>{{ item.nickname.slice(0, 1) }}</text>
              <text class="online">已认证</text>
            </view>
            <text class="provider-name">{{ item.nickname }}</text>
            <text class="rating">★ {{ item.rating }}分 · {{ formatDistance(item.distance_km) }}</text>
          </view>
        </view>
      </scroll-view>
      <view v-else class="empty-block">附近暂时没有可预约达人</view>

      <view class="section-head"><text>附近活动</text><text class="more">更多 ›</text></view>
      <view v-if="loadError" class="error-block" @tap="loadDiscovery">{{ loadError }}，点击重试</view>
      <view v-for="item in activities" :key="item.id" class="activity-card">
        <view class="activity-image">
          <image v-if="item.cover_url" class="activity-cover" :src="item.cover_url" mode="aspectFill" />
          <text v-else>{{ item.category }}</text>
        </view>
        <view class="activity-copy">
          <text class="activity-title">{{ item.title }}</text>
          <text>{{ item.meeting_place_name }} · {{ formatDistance(item.distance_km) }}</text>
          <text>{{ formatActivityTime(item.starts_at) }}　{{ item.min_participants }}/{{ item.capacity }}人成局</text>
        </view>
        <text class="price"><small>AA</small> ¥{{ formatAmount(item.aa_principal_amount) }}</text>
      </view>
      <view v-if="!loading && !loadError && !activities.length" class="empty-block">附近暂时没有活动</view>
    </main>

    <DazzyTabBar active="home" />
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'

import DazzyTabBar from '@/components/DazzyTabBar.vue'
import { getNearbyActivities, getRecommendedProviders } from '@/services/discovery'
import type { ActivityListItem, ProviderListItem } from '@/types/api'

const categories = [
  { label: '旅游', icon: '旅', color: '#29c7d1' }, { label: '台球', icon: '球', color: '#40b85a' },
  { label: '桌游', icon: '游', color: '#c86be0' }, { label: '商务', icon: '商', color: '#718bf0' },
]
const providers = ref<ProviderListItem[]>([])
const activities = ref<ActivityListItem[]>([])
const loading = ref(true)
const loadError = ref('')

function formatAmount(amount: number) {
  return (amount / 100).toFixed(amount % 100 === 0 ? 0 : 2)
}

function formatDistance(distance: number | null) {
  return distance === null ? '距离未知' : `${distance.toFixed(1)}km`
}

function formatActivityTime(value: string) {
  const date = new Date(value)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

async function loadDiscovery() {
  loading.value = true
  loadError.value = ''
  try {
    const [providerResponse, activityResponse] = await Promise.all([
      getRecommendedProviders(),
      getNearbyActivities(),
    ])
    providers.value = providerResponse.data.items
    activities.value = activityResponse.data.items
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : '加载失败'
  } finally {
    loading.value = false
  }
}

onLoad(loadDiscovery)
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;
.topbar { display: flex; align-items: center; gap: 12rpx; height: 88rpx; }
button { margin: 0; padding: 0; line-height: 1; background: transparent; }
.city { min-width: 116rpx; height: 72rpx; font-size: 28rpx; font-weight: 600; color: $dz-text-primary; }
.search { display: flex; align-items: center; flex: 1; height: 64rpx; padding: 0 22rpx; border-radius: 32rpx; color: $dz-text-tertiary; background: #f5f7f8; font-size: 23rpx; }
.message { width: 60rpx; height: 60rpx; color: $dz-text-primary; }
.content { display: block; }
.hero { position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; height: 166rpx; padding-top: 40rpx; border-radius: 24rpx; color: #fff; background: $dz-gradient-brand; box-sizing: border-box; }
.hero::before,.hero::after { content: ''; position: absolute; width: 210rpx; height: 210rpx; border: 2rpx solid rgba(255,255,255,.25); border-radius: 50%; }
.hero::before { left: -100rpx; top: 10rpx; }.hero::after { right: -80rpx; top: -70rpx; }
.hero-title { z-index: 1; font-size: 40rpx; line-height: 52rpx; font-weight: 700; }.hero-subtitle { z-index: 1; font-size: 22rpx; }.hero-plane { position: absolute; right: 40rpx; top: 30rpx; transform: rotate(-20deg); font-size: 42rpx; }
.scene-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; margin-top: 18rpx; }.scene { position: relative; overflow: hidden; display: flex; flex-direction: column; height: 126rpx; padding: 12rpx 16rpx; border-radius: 20rpx; color: #fff; font-size: 20rpx; line-height: 28rpx; box-sizing: border-box; }.scene.provider { background: linear-gradient(135deg,#ff9b47,#ff6e3d); }.scene.activity { background: linear-gradient(135deg,#3aa3f5,#257ce9); }.scene-title { font-size: 29rpx; line-height: 36rpx; font-weight: 700; }.scene-action { z-index: 1; align-self: flex-start; height: 26rpx; margin-top: 4rpx; padding: 0 13rpx; border-radius: 13rpx; color: $dz-price-primary; background: #fff; font-weight: 600; line-height: 26rpx; box-sizing: border-box; }.activity .scene-action { color: #2885ea; }.scene b { position: absolute; right: 10rpx; bottom: -15rpx; display: flex; align-items: center; justify-content: center; width: 88rpx; height: 88rpx; border-radius: 50%; color: rgba(23,33,38,.5); background: rgba(255,255,255,.85); font-size: 32rpx; }
.categories { display: grid; grid-template-columns: repeat(4,1fr); padding: 24rpx 0 10rpx; }.category { display: flex; flex-direction: column; align-items: center; gap: 9rpx; font-size: 23rpx; }.category-icon { display: flex; align-items: center; justify-content: center; width: 60rpx; height: 60rpx; border-radius: 50%; color: #fff; font-size: 21rpx; font-weight: 600; }
.section-head { display: flex; justify-content: space-between; margin: 18rpx 0 14rpx; font-size: 30rpx; font-weight: 600; }.more { color: $dz-text-tertiary; font-size: 22rpx; font-weight: 400; }.rail { width: 100%; white-space: nowrap; }.provider-row { display: flex; gap: 12rpx; }.provider-card { overflow: hidden; flex: 0 0 156rpx; border: 1rpx solid $dz-border-subtle; border-radius: 14rpx; background: #fff; }.photo { position: relative; display: flex; align-items: flex-end; justify-content: center; height: 132rpx; padding-bottom: 12rpx; color: rgba(255,255,255,.82); background: linear-gradient(145deg,#badfe4,#6db8be); font-size: 50rpx; font-weight: 700; box-sizing: border-box; }.online { position: absolute; z-index: 1; left: 7rpx; top: 7rpx; padding: 3rpx 7rpx; border-radius: 8rpx; color: #fff; background: rgba(33,182,111,.9); font-size: 16rpx; }.provider-name,.rating { display: block; padding: 0 10rpx; }.provider-name { margin-top: 8rpx; font-size: 24rpx; font-weight: 600; }.rating { margin: 3rpx 0 10rpx; color: $dz-text-secondary; font-size: 19rpx; }
.activity-card { display: flex; align-items: center; gap: 15rpx; min-height: 112rpx; margin-bottom: 16rpx; }.activity-image { position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; flex: 0 0 166rpx; height: 112rpx; border-radius: 14rpx; color: #fff; background: radial-gradient(circle at 45% 52%,#f8e5a2 0 7%,#265c42 8% 15%,#12402e 16% 100%); }.activity-cover,.photo-image { position: absolute; width: 100%; height: 100%; inset: 0; }.activity-copy { min-width: 0; flex: 1; color: $dz-text-secondary; font-size: 19rpx; }.activity-copy text { display: block; overflow: hidden; margin-top: 7rpx; text-overflow: ellipsis; white-space: nowrap; }.activity-title { color: $dz-text-primary; font-size: 25rpx; font-weight: 600; }.price { align-self: flex-end; color: $dz-price-primary; font-size: 33rpx; font-weight: 700; white-space: nowrap; }.price small { font-size: 17rpx; font-weight: 500; }
.loading-block,.empty-block,.error-block { display: flex; align-items: center; justify-content: center; min-height: 112rpx; border-radius: 16rpx; color: $dz-text-secondary; background: $dz-surface-page; font-size: 23rpx; }
.error-block { min-height: 72rpx; margin-bottom: 14rpx; color: $dz-price-primary; }
</style>
