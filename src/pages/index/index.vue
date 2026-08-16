<template>
  <view class="dz-page dz-page--with-tabbar">
    <view class="dz-safe-top" />
    <view class="topbar dz-container">
      <button class="city">邯郸市 <text class="city-arrow">▾</text></button>
      <view class="search"><text class="search-icon">⌕</text><text>搜索达人、活动、场馆</text></view>
      <button class="message" aria-label="消息"><text>•••</text><i /></button>
    </view>

    <main class="content dz-container">
      <view class="hero">
        <image class="hero-art" src="/static/home/city-discovery-hero-v1.webp" mode="aspectFill" />
        <text class="hero-title">发现同城好搭子</text>
        <text class="hero-subtitle">一起玩， 一起聊， 一起出发</text>
      </view>

      <view class="scene-grid">
        <view class="scene provider" hover-class="scene--pressed" @tap="openProviders()"><text class="scene-title">达人陪伴</text><text>1对1陪伴·更贴心</text><text class="scene-action">找搭子</text><image v-if="homeCardAssets?.provider_companion_url" class="scene-art provider-art" :src="homeCardAssets.provider_companion_url" mode="aspectFit" /><b v-else>搭</b></view>
        <view class="scene activity" hover-class="scene--pressed" @tap="openActivities()"><text class="scene-title">同城组局</text><text>多人组局·更热闹</text><text class="scene-action">去组局</text><image v-if="homeCardAssets?.group_activity_url" class="scene-art group-art" :src="homeCardAssets.group_activity_url" mode="aspectFit" /><b v-else>局</b></view>
      </view>

      <view class="categories">
        <view v-for="item in categories" :key="item.label" class="category" hover-class="category--pressed" @tap="openProviders(item.slug)">
          <view class="category-icon" :style="{ background: item.color }">{{ item.icon }}</view><text>{{ item.label }}</text>
        </view>
      </view>

      <view class="section-head"><text>推荐达人</text><text class="more" @tap="openProviders()">更多 ›</text></view>
      <view v-if="loading" class="loading-block">正在发现附近的搭子…</view>
      <scroll-view v-else-if="providers.length" scroll-x class="rail" :show-scrollbar="false">
        <view class="provider-row">
          <view v-for="item in providers" :key="item.public_id" class="provider-card" hover-class="card--pressed" @tap="openProviderDetail(item.public_id)">
            <view class="photo">
              <image v-if="item.avatar_url" class="photo-image" :src="item.avatar_url" mode="aspectFill" />
              <text v-else>{{ item.nickname.slice(0, 1) }}</text>
              <text class="online">已认证</text>
            </view>
            <view class="provider-summary"><text class="provider-name">{{ item.nickname }}</text><text class="rating">★ {{ item.rating }}</text></view>
            <view class="provider-tags"><text>{{ shortCategory(item) }}</text><text>{{ item.verified ? '健谈' : '活泼' }}</text></view>
            <text class="provider-location">{{ shortCity(item.service_city_name) }} · {{ item.service_count }}次</text>
          </view>
        </view>
      </scroll-view>
      <view v-else class="empty-block">附近暂时没有可预约达人</view>

      <view class="section-head"><text>附近活动</text><text class="more" @tap="openActivities()">更多 ›</text></view>
      <view v-if="loadError" class="error-block" @tap="loadDiscovery">{{ loadError }}，点击重试</view>
      <view v-for="item in activities.slice(0, 1)" :key="item.id" class="activity-card" hover-class="card--pressed" @tap="openActivityDetail(item.id)">
        <view class="activity-image">
          <image v-if="item.cover_url" class="activity-cover" :src="item.cover_url" mode="aspectFill" />
          <text v-else>{{ item.category }}</text>
        </view>
        <view class="activity-copy">
          <text class="activity-title">{{ item.title }}</text>
          <text class="activity-meta">⌖　{{ item.meeting_place_name }}</text>
          <text class="activity-meta">◷　{{ formatActivityTime(item.starts_at) }}</text>
          <text class="activity-meta">♧　{{ item.min_participants }}/{{ item.capacity }}人</text>
          <view class="activity-tags"><text>{{ item.category }}</text><text>新手友好</text></view>
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
import { getHomeCardAssets, getNearbyActivities, getRecommendedProviders } from '@/services/discovery'
import { openPage } from '@/services/navigation'
import type { ActivityListItem, HomeCardAssets, ProviderListItem } from '@/types/api'
import { formatActivityTime, formatAmount, getErrorMessage } from '@/utils/formatters'

const categories = [
  { label: '旅游', slug: 'travel', icon: '✈', color: 'linear-gradient(145deg,#52e0df,#16b9c9)' },
  { label: '台球', slug: 'billiards', icon: '8', color: 'linear-gradient(145deg,#62d88a,#159347)' },
  { label: '桌游', slug: 'board-games', icon: '⚄', color: 'linear-gradient(145deg,#b98bff,#7252e8)' },
  { label: '商务', slug: 'business', icon: '▰', color: 'linear-gradient(145deg,#48bcff,#1688ea)' },
]
const providers = ref<ProviderListItem[]>([])
const activities = ref<ActivityListItem[]>([])
const loading = ref(true)
const loadError = ref('')
const homeCardAssets = ref<HomeCardAssets | null>(null)

function openProviders(category?: string) {
  openPage(`/pages/providers/list${category ? `?category=${category}` : ''}`)
}

function openActivities(category?: string) {
  openPage(`/pages/activities/list${category ? `?category=${category}` : ''}`)
}

function openProviderDetail(publicId: string) {
  openPage(`/pages/providers/detail?id=${publicId}`)
}

function openActivityDetail(id: number) {
  openPage(`/pages/activities/detail?id=${id}`)
}

function shortCategory(item: ProviderListItem) {
  return (item.services[0]?.category || '达人服务').replace('陪玩', '达人').replace('陪伴', '达人')
}

function shortCity(value: string) {
  return value.replace(/市$/, '')
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
    loadError.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }

  try {
    homeCardAssets.value = (await getHomeCardAssets()).data
  } catch {
    homeCardAssets.value = null
  }
}

onLoad(loadDiscovery)
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;

.topbar { display:flex; align-items:center; gap:14rpx; height:94rpx; }
button { margin:0; padding:0; line-height:1; background:transparent; }
.city,.message { border:0; outline:0; box-shadow:none; }
.city::after,.message::after { display:none; }
.city { flex:0 0 auto; height:70rpx; color:#111; font-size:29rpx; font-weight:700; }
.city-arrow { font-size:20rpx; }
.search { display:flex; align-items:center; flex:1; gap:12rpx; height:62rpx; padding:0 24rpx; border:1rpx solid #e2e7e9; border-radius:32rpx; color:#8f999e; background:#fff; font-size:22rpx; box-sizing:border-box; }
.search-icon { color:#68747a; font-size:31rpx; }
.message { position:relative; display:flex; align-items:center; justify-content:center; width:58rpx; height:58rpx; border:3rpx solid #171d20; border-radius:45% 45% 45% 38%; color:#171d20; font-size:17rpx; }
.message i { position:absolute; right:-3rpx; top:-4rpx; width:13rpx; height:13rpx; border:3rpx solid #fff; border-radius:50%; background:#ff4141; }
.content { display:block; }
.hero { position:relative; overflow:hidden; display:flex; flex-direction:column; justify-content:center; height:232rpx; padding:0 30rpx; border-radius:24rpx; color:#075b67; box-sizing:border-box; }
.hero-art { position:absolute; width:100%; height:100%; inset:0; }
.hero-title,.hero-subtitle { position:relative; z-index:1; }
.hero-title { font-size:39rpx; line-height:54rpx; font-weight:800; letter-spacing:1rpx; }
.hero-subtitle { margin-top:8rpx; font-size:23rpx; font-weight:500; }
.scene-grid { display:grid; grid-template-columns:1fr 1fr; gap:16rpx; margin-top:22rpx; }
.scene { position:relative; overflow:hidden; display:flex; flex-direction:column; height:204rpx; padding:25rpx 22rpx; border-radius:22rpx; color:#273036; font-size:22rpx; line-height:32rpx; box-sizing:border-box; }
.scene.provider { background:linear-gradient(135deg,#fff4e8,#ffe6d3); }
.scene.activity { background:linear-gradient(135deg,#eef8ff,#dcecff); }
.scene-title { position:relative; z-index:1; font-size:34rpx; line-height:44rpx; font-weight:800; }
.provider .scene-title { color:#ff5b24; }
.activity .scene-title { color:#1683ed; }
.scene-action { position:relative; z-index:2; align-self:flex-start; height:48rpx; margin-top:22rpx; padding:0 17rpx; border-radius:24rpx; color:#fff; background:#ff541e; font-size:23rpx; font-weight:700; line-height:48rpx; box-sizing:border-box; }
.activity .scene-action { color:#fff; background:#258af3; }
.scene-art { position:absolute; z-index:0; right:-12rpx; bottom:-8rpx; pointer-events:none; }
.provider-art { width:174rpx; height:202rpx; }
.group-art { right:-20rpx; width:210rpx; height:190rpx; }
.scene b { display:none; }
.scene--pressed,.category--pressed,.card--pressed { opacity:.74; }
.categories { display:grid; grid-template-columns:repeat(4,1fr); margin-top:22rpx; padding:18rpx 0 14rpx; border-radius:22rpx; background:#fff; box-shadow:0 8rpx 28rpx rgba(31,65,72,.09); }
.category { display:flex; flex-direction:column; align-items:center; gap:10rpx; border-right:1rpx solid #edf0f1; color:#20272a; font-size:23rpx; }
.category:last-child { border-right:0; }
.category-icon { display:flex; align-items:center; justify-content:center; width:66rpx; height:66rpx; border-radius:22rpx; color:#fff; font-size:29rpx; font-weight:800; box-shadow:0 7rpx 14rpx rgba(31,65,72,.13); }
.section-head { display:flex; justify-content:space-between; align-items:center; margin:30rpx 2rpx 18rpx; font-size:31rpx; font-weight:800; }
.more { color:#7c878c; font-size:22rpx; font-weight:400; }
.rail { width:100%; white-space:nowrap; }
.provider-row { display:flex; gap:14rpx; }
.provider-card { overflow:hidden; flex:0 0 176rpx; border:1rpx solid $dz-border-subtle; border-radius:18rpx; background:#fff; box-shadow:0 7rpx 22rpx rgba(31,65,72,.07); }
.photo { position:relative; display:flex; align-items:flex-end; justify-content:center; height:206rpx; color:#fff; background:linear-gradient(145deg,#badfe4,#6db8be); font-size:50rpx; font-weight:700; }
.activity-cover,.photo-image { position:absolute; width:100%; height:100%; inset:0; }
.online { position:absolute; z-index:1; left:9rpx; top:9rpx; padding:3rpx 8rpx; border-radius:9rpx; color:#fff; background:rgba(25,182,110,.92); font-size:16rpx; font-weight:500; }
.provider-summary { display:flex; align-items:center; justify-content:space-between; padding:12rpx 10rpx 0; }
.provider-name { font-size:25rpx; font-weight:700; }
.rating { color:#707a80; font-size:18rpx; }
.rating::first-letter { color:#ffad1f; }
.provider-tags { display:flex; gap:6rpx; padding:10rpx 9rpx 0; }
.provider-tags text { overflow:hidden; max-width:86rpx; padding:3rpx 7rpx; border:1rpx solid #d9e0e2; border-radius:7rpx; color:#707a80; font-size:16rpx; text-overflow:ellipsis; white-space:nowrap; }
.provider-tags text:first-child { border-color:#32d1cf; color:#08aeb4; }
.provider-location { display:block; overflow:hidden; padding:11rpx 10rpx 14rpx; color:#858f94; font-size:18rpx; text-overflow:ellipsis; white-space:nowrap; }
.activity-card { position:relative; display:flex; overflow:hidden; min-height:226rpx; margin-bottom:16rpx; border:1rpx solid $dz-border-subtle; border-radius:24rpx; background:#fff; box-shadow:0 8rpx 25rpx rgba(31,65,72,.07); }
.activity-image { position:relative; overflow:hidden; display:flex; align-items:center; justify-content:center; flex:0 0 268rpx; min-height:226rpx; color:#fff; background:#12402e; }
.activity-copy { min-width:0; flex:1; padding:20rpx 18rpx; color:#66737a; font-size:19rpx; box-sizing:border-box; }
.activity-copy>text { display:block; overflow:hidden; margin-top:9rpx; text-overflow:ellipsis; white-space:nowrap; }
.activity-title { margin-top:0!important; color:#172126; font-size:27rpx; font-weight:800; }
.activity-meta { font-size:19rpx; }
.activity-tags { display:flex; gap:8rpx; margin-top:10rpx; }
.activity-tags text { padding:4rpx 9rpx; border:1rpx solid #dce2e4; border-radius:7rpx; color:#6c777c; font-size:17rpx; }
.activity-tags text:first-child { border-color:#32d1cf; color:#08aeb4; }
.price { position:absolute; right:20rpx; bottom:18rpx; color:$dz-price-primary; font-size:36rpx; font-weight:800; white-space:nowrap; }
.price small { padding:3rpx 7rpx; border:1rpx solid #ffb699; border-radius:7rpx; font-size:18rpx; font-weight:500; }
.loading-block,.empty-block,.error-block { display:flex; align-items:center; justify-content:center; min-height:112rpx; border-radius:16rpx; color:$dz-text-secondary; background:$dz-surface-page; font-size:23rpx; }
.error-block { min-height:72rpx; margin-bottom:14rpx; color:$dz-price-primary; }
</style>
