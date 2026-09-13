<template>
  <view class="dz-page dz-page--with-tabbar">
    <view class="dz-safe-top" />
    <view class="topbar dz-container">
      <button class="city">邯郸市 <text class="city-arrow">▾</text></button>
      <view class="search"><text class="search-icon">⌕</text><text>搜索达人、活动、场馆</text></view>
    </view>

    <main class="content dz-container">
      <view class="hero">
        <image class="hero-art" src="/static/home/city-discovery-hero-v1.webp" mode="aspectFill" />
        <text class="hero-title">发现同城好搭子</text>
        <text class="hero-subtitle">一起玩， 一起聊， 一起出发</text>
      </view>

      <view class="scene-grid dz-anim-stagger">
        <view class="scene provider dz-anim-fade-up" hover-class="scene--pressed" @tap="openProviders()">
          <text class="scene-title">达人陪伴</text>
          <text class="scene-copy">1对1预约服务</text>
          <text class="scene-action">找搭子 <i>›</i></text>
          <image v-if="homeCardAssets?.provider_companion_url" class="scene-art provider-art" :src="homeCardAssets.provider_companion_url" mode="aspectFit" />
          <b v-else>搭</b>
        </view>
        <view class="scene activity dz-anim-fade-up" hover-class="scene--pressed" @tap="openActivities()">
          <text class="scene-title">同城组局</text>
          <text class="scene-copy">多人兴趣活动</text>
          <text class="scene-action">去组局 <i>›</i></text>
          <image v-if="homeCardAssets?.group_activity_url" class="scene-art group-art" :src="homeCardAssets.group_activity_url" mode="aspectFit" />
          <b v-else>局</b>
        </view>
      </view>

      <view class="categories">
        <view
          v-for="item in categories"
          :key="item.label"
          class="category dz-anim-fade-up"
          hover-class="category--pressed"
          role="button"
          :aria-label="item.label"
          @tap="openProviders(item.slug)"
        >
          <image class="category-icon" :src="item.icon" mode="aspectFit" aria-hidden="true" /><text>{{ item.label }}</text>
        </view>
      </view>

      <view class="section-head provider-head"><text>推荐达人</text><text class="more" @tap="openProviders()">更多 <i>›</i></text></view>
      <view v-if="loading" class="loading-block">正在发现附近的搭子…</view>
      <scroll-view v-if="providers.length" scroll-x class="provider-scroller" :show-scrollbar="false">
        <view class="provider-rail dz-anim-stagger">
          <HomeProviderCard
            v-for="item in providers.slice(0, 4)"
            :key="item.public_id"
            class="provider-item dz-anim-fade-up"
            :item="item"
            @select="openProviderDetail"
          />
        </view>
      </scroll-view>
      <view v-else-if="providerError" class="error-block" @tap="loadDiscovery">{{ providerError }}，点击重试</view>
      <view v-else-if="!loading" class="empty-block">附近暂时没有达人</view>

      <view class="section-head activity-head"><text>附近活动</text><text class="more" @tap="openActivities()">更多 <i>›</i></text></view>
      <view v-if="activityError" class="error-block" @tap="loadDiscovery">{{ activityError }}，点击重试</view>
      <HomeActivityCarousel v-if="activities.length" :items="activities.slice(0, 3)" @select="openActivityDetail" />
      <view v-if="!loading && !activityError && !activities.length" class="empty-block">附近暂时没有活动</view>
    </main>

    <DazzyTabBar active="home" />
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'

import DazzyTabBar from '@/components/DazzyTabBar.vue'
import HomeActivityCarousel from '@/components/HomeActivityCarousel.vue'
import HomeProviderCard from '@/components/HomeProviderCard.vue'
import { getHomeDiscovery } from '@/services/discovery'
import { openPage } from '@/services/navigation'
import type { HomeActivityListItem, HomeCardAssets, HomeProviderListItem } from '@/types/api'
import { getErrorMessage } from '@/utils/formatters'

const categories = [
  { label: '棋牌', slug: 'mahjong', icon: '/static/home/categories/chess-cards.svg' },
  { label: '桌球', slug: 'billiards', icon: '/static/home/categories/billiards.svg' },
  { label: '电竞', slug: 'esports', icon: '/static/home/categories/esports.svg' },
  { label: '密室', slug: 'escape-room', icon: '/static/home/categories/escape-room.svg' },
  { label: '桌游', slug: 'board-games', icon: '/static/home/categories/board-games.svg' },
  { label: '爬山', slug: 'travel', icon: '/static/home/categories/hiking.svg' },
  { label: '商务', slug: 'business', icon: '/static/home/categories/business.svg' },
  { label: '全部', slug: '', icon: '/static/home/categories/all.svg' },
]
const providers = ref<HomeProviderListItem[]>([])
const activities = ref<HomeActivityListItem[]>([])
const loading = ref(true)
const activityError = ref('')
const providerError = ref('')
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

async function loadDiscovery() {
  loading.value = true
  activityError.value = ''
  providerError.value = ''

  try {
    const response = await getHomeDiscovery()
    providers.value = response.data.recommended_providers
    activities.value = response.data.recommended_activities
    homeCardAssets.value = response.data.card_assets
    providerError.value = response.data.errors.recommended_providers || ''
    activityError.value = response.data.errors.recommended_activities || ''
  } catch (error) {
    providers.value = []
    activities.value = []
    homeCardAssets.value = null
    providerError.value = getErrorMessage(error)
    activityError.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
}

onLoad(loadDiscovery)
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;

.topbar { display:flex; align-items:center; gap:24rpx; height:100rpx; }
button { margin:0; padding:0; line-height:1; background:transparent; }
.city { border:0; outline:0; box-shadow:none; }
.city::after { display:none; }
.city { flex:0 0 auto; height:70rpx; color:$dz-text-primary; font-size:$dz-fs-body; font-weight:$dz-fw-semibold; }
.city-arrow { font-size:$dz-fs-caption; }
.search { display:flex; align-items:center; flex:1; min-width:0; gap:12rpx; height:68rpx; padding:0 24rpx; border:1rpx solid $dz-border-material; border-radius:$dz-radius-full; color:$dz-text-secondary; background:$dz-surface-glass; box-shadow:inset 0 1rpx 0 $dz-surface-highlight, 0 8rpx 24rpx rgba(31,65,72,.06); font-size:$dz-fs-caption; box-sizing:border-box; white-space:nowrap; }
.search-icon { color:$dz-text-secondary; font-size:$dz-fs-body; }
.content { display:block; padding-right:22rpx; padding-left:22rpx; }
.hero { position:relative; overflow:hidden; display:flex; flex-direction:column; justify-content:center; height:240rpx; padding:0 32rpx; border:1rpx solid $dz-border-material; border-radius:$dz-radius-lg; color:#075b67; box-shadow:$dz-shadow-card; box-sizing:border-box; }
.hero::after { position:absolute; inset:0; border-radius:inherit; box-shadow:inset 0 1rpx 0 $dz-surface-highlight; content:''; pointer-events:none; }
.hero-art { position:absolute; width:100%; height:100%; top:0; right:0; bottom:0; left:0; }
.hero-title,.hero-subtitle { position:relative; z-index:1; }
.hero-title { font-size:$dz-fs-price-lg; line-height:62rpx; font-weight:$dz-fw-bold; letter-spacing:-1rpx; }
.hero-subtitle { margin-top:$dz-space-1; font-size:$dz-fs-body; font-weight:$dz-fw-medium; letter-spacing:1rpx; }
.scene-grid { display:grid; grid-template-columns:1fr 1fr; gap:$dz-space-2; margin-top:$dz-space-3; }
.scene { position:relative; overflow:hidden; display:flex; flex-direction:column; height:210rpx; padding:$dz-space-3; border:1rpx solid $dz-border-material; border-radius:$dz-radius-lg; color:$dz-text-secondary; box-shadow:$dz-shadow-card,inset 0 1rpx 0 $dz-surface-highlight; font-size:$dz-fs-caption; line-height:32rpx; box-sizing:border-box; transition:transform $dz-duration-fast $dz-ease-out, opacity $dz-duration-fast $dz-ease-standard, box-shadow $dz-duration-fast $dz-ease-standard; }
.scene.provider { background:linear-gradient(145deg,#fff8f2 0%,$dz-price-soft 58%,#ffe7da 100%); }
.scene.activity { background:linear-gradient(145deg,#f7ffff 0%,$dz-brand-soft 58%,#ccefed 100%); }
.scene-title { position:relative; z-index:1; font-size:$dz-fs-heading; line-height:44rpx; font-weight:$dz-fw-bold; }
.provider .scene-title { color:$dz-price-primary; }
.activity .scene-title { color:$dz-brand-deep; }
.scene-copy { position:relative; z-index:1; margin-top:3rpx; }
.scene-action { position:relative; z-index:2; align-self:flex-start; height:48rpx; margin-top:19rpx; padding:0 20rpx; border:1rpx solid rgba(255,255,255,.36); border-radius:$dz-radius-full; color:$dz-text-inverse; background:$dz-gradient-brand; box-shadow:$dz-shadow-brand; font-size:$dz-fs-caption; font-weight:$dz-fw-semibold; line-height:46rpx; box-sizing:border-box; }
.scene-action i,.more i { font-style:normal; }
.activity .scene-action { color:$dz-text-inverse; }
.scene-art { position:absolute; z-index:0; right:-12rpx; bottom:-8rpx; pointer-events:none; }
.provider-art { width:174rpx; height:202rpx; }
.group-art { right:-20rpx; width:210rpx; height:190rpx; }
.scene b { display:none; }
.scene--pressed,.category--pressed { transform:scale(0.98); opacity:0.94; }
.categories { display:grid; grid-template-columns:repeat(4,1fr); grid-template-rows:repeat(2,1fr); height:248rpx; margin-top:$dz-space-3; padding:12rpx 8rpx; border:1rpx solid $dz-border-material; border-radius:$dz-radius-lg; background:$dz-surface-card; box-shadow:$dz-shadow-card,inset 0 1rpx 0 $dz-surface-highlight; box-sizing:border-box; }
.category { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:5rpx; border-radius:$dz-radius-md; color:$dz-text-primary; font-size:$dz-fs-caption; transition:transform $dz-duration-fast $dz-ease-out, opacity $dz-duration-fast $dz-ease-standard, background-color $dz-duration-base $dz-ease-standard; }
.category-icon { display:block; width:54rpx; height:54rpx; padding:7rpx; border-radius:18rpx; background:$dz-surface-page; box-sizing:content-box; }
.category--pressed { background:$dz-brand-soft; }
/* #ifdef H5 */
.search { -webkit-backdrop-filter:saturate(180%) blur(18px); backdrop-filter:saturate(180%) blur(18px); }
/* #endif */
.section-head { display:flex; justify-content:space-between; align-items:center; margin:$dz-space-4 2rpx $dz-space-2; font-size:$dz-fs-heading; line-height:44rpx; font-weight:$dz-fw-semibold; }
.more { color:$dz-text-secondary; font-size:$dz-fs-caption; font-weight:$dz-fw-regular; }
.provider-head { margin-top:$dz-space-4; }
.provider-scroller { width:calc(100% + 22rpx); margin-right:-22rpx; }
.provider-rail { display:flex; width:max-content; gap:$dz-space-2; padding:2rpx 22rpx 24rpx 2rpx; }
.provider-item { flex:0 0 286rpx; }
.activity-head { margin-top:$dz-space-4; }
.loading-block,.empty-block,.error-block { display:flex; align-items:center; justify-content:center; min-height:112rpx; border:1rpx solid $dz-border-material; border-radius:$dz-radius-lg; color:$dz-text-secondary; background:$dz-surface-card; box-shadow:$dz-shadow-card; font-size:$dz-fs-caption; }
.error-block { min-height:72rpx; margin-bottom:$dz-space-2; color:$dz-status-danger; }

@media (prefers-reduced-motion: reduce) {
  .scene,.category { transition:none; }
  .scene--pressed,.category--pressed { transform:none; opacity:0.85; }
}
</style>
