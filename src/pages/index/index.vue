<template>
  <view class="dz-page dz-page--with-tabbar">
    <DzNavBar mode="toolbar">
      <button class="city" hover-class="control--pressed" @tap="chooseCity"><text>{{ discovery.cityName }}</text><text class="city-arrow">▾</text></button>
      <button class="search" hover-class="control--pressed" @tap="openPage('/pages/discovery/search')"><text class="search-icon">⌕</text><text>搜索达人、活动</text></button>
    </DzNavBar>

    <main class="content dz-container">
      <HomeCouponCampaigns :items="couponCampaigns" :initial-campaign-id="initialCampaignId" @claimed="campaignClaimed">
      <view class="hero">
        <image class="hero-art" src="/static/home/city-discovery-hero-v1.webp" mode="aspectFill" />
        <text class="hero-title">发现同城好搭子</text>
        <text class="hero-subtitle">一起玩， 一起聊， 一起出发</text>
      </view>
      </HomeCouponCampaigns>

      <view class="scene-grid dz-anim-stagger">
        <view class="scene provider dz-anim-fade-up" hover-class="scene--pressed" role="button" aria-label="达人陪伴，找搭子" @tap="openProviders()">
          <text class="scene-title">达人陪伴</text>
          <text class="scene-copy">1对1预约服务</text>
          <view class="scene-action"><text class="scene-action-label">找搭子</text><text class="scene-arrow">›</text></view>
          <image class="scene-art provider-art" src="/static/home/provider-companion-v2.webp" mode="aspectFit" aria-hidden="true" />
        </view>
        <view class="scene activity dz-anim-fade-up" hover-class="scene--pressed" role="button" aria-label="同城组局，去组局" @tap="openActivities()">
          <text class="scene-title">同城组局</text>
          <text class="scene-copy">多人兴趣活动</text>
          <view class="scene-action"><text class="scene-action-label">去组局</text><text class="scene-arrow">›</text></view>
          <image class="scene-art group-art" src="/static/home/group-activity-v2.webp" mode="aspectFit" aria-hidden="true" />
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
          <image v-if="item.icon" class="category-icon" :src="item.icon" mode="aspectFit" aria-hidden="true" />
          <text v-else class="category-icon category-icon--fallback" aria-hidden="true">{{ item.label.slice(0, 1) }}</text>
          <text class="category-label">{{ item.label }}</text>
        </view>
      </view>

      <view class="section-head provider-head"><text>推荐达人</text><text class="more" @tap="openProviders()">更多 <i>›</i></text></view>
      <view v-if="loading" class="loading-block">正在发现同城搭子…</view>
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
      <view v-else-if="!loading" class="empty-block">暂无符合条件的达人，可切换城市或定位</view>

      <view class="section-head activity-head"><text>{{ discovery.longitude ? '附近活动' : '同城活动' }}</text><text class="more" @tap="openActivities()">更多 <i>›</i></text></view>
      <view v-if="activityError" class="error-block" @tap="loadDiscovery">{{ activityError }}，点击重试</view>
      <HomeActivityCarousel v-if="activities.length" :items="activities.slice(0, 3)" @select="openActivityDetail" />
      <view v-if="!loading && !activityError && !activities.length" class="empty-block">当前城市暂无符合条件的活动</view>
    </main>

    <DazzyTabBar active="home" />
  </view>
</template>

<script setup lang="ts">
import DzNavBar from '@/components/DzNavBar.vue'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { ref } from 'vue'

import DazzyTabBar from '@/components/DazzyTabBar.vue'
import HomeActivityCarousel from '@/components/HomeActivityCarousel.vue'
import HomeProviderCard from '@/components/HomeProviderCard.vue'
import HomeCouponCampaigns from '@/components/HomeCouponCampaigns.vue'
import { getHomeDiscovery, getServiceCategories } from '@/services/discovery'
import { allProviderCategory, configuredProviderCategories } from '@/services/providerCategories'
import {
  discoveryQuery,
  getDiscoveryContext,
  resolveDiscoveryContext,
  openDiscoveryCityPicker,
} from '@/services/discoveryContext'
import { openPage } from '@/services/navigation'
import type { CouponCampaign, HomeActivityListItem, HomeProviderListItem } from '@/types/api'
import { getErrorMessage } from '@/utils/formatters'

const categories = ref([allProviderCategory])
const couponCampaigns = ref<CouponCampaign[]>([])
const initialCampaignId = ref('')
function campaignClaimed(item: CouponCampaign) { couponCampaigns.value = couponCampaigns.value.map(c => c.public_id === item.public_id ? item : c) }
onLoad((query) => { initialCampaignId.value = typeof query?.coupon_campaign === 'string' ? query.coupon_campaign : '' })
const providers = ref<HomeProviderListItem[]>([])
const activities = ref<HomeActivityListItem[]>([])
const loading = ref(true)
const activityError = ref('')
const providerError = ref('')
const discovery = ref(getDiscoveryContext())
let loadVersion = 0
let categoryVersion = 0

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
  const version = ++loadVersion
  loading.value = true
  categories.value = [allProviderCategory]
  providers.value = []
  activities.value = []
  activityError.value = ''
  providerError.value = ''

  try {
    const context = await resolveDiscoveryContext()
    if (version !== loadVersion) return
    discovery.value = context
    loadCategories(context.cityCode)
    const response = await getHomeDiscovery(discoveryQuery(discovery.value))
    if (version !== loadVersion) return
    providers.value = response.data.recommended_providers
    activities.value = response.data.recommended_activities
    couponCampaigns.value = response.data.coupon_campaigns || []
    providerError.value = response.data.errors.recommended_providers || ''
    activityError.value = response.data.errors.recommended_activities || ''
  } catch (error) {
    if (version !== loadVersion) return
    providers.value = []
    activities.value = []
    couponCampaigns.value = []
    providerError.value = getErrorMessage(error)
    activityError.value = getErrorMessage(error)
  } finally {
    if (version === loadVersion) loading.value = false
  }
}

function chooseCity() { openDiscoveryCityPicker() }

async function loadCategories(cityCode: string) {
  const version = ++categoryVersion
  try {
    const items = (await getServiceCategories(cityCode)).data.items
    if (version === categoryVersion) {
      categories.value = [...configuredProviderCategories(items).slice(0, 7), allProviderCategory]
    }
  } catch {
    if (version === categoryVersion) categories.value = [allProviderCategory]
  }
}

onShow(loadDiscovery)
onUnload(() => { loadVersion++; categoryVersion++ })
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;

.topbar { display:flex; align-items:center; gap:24rpx; height:100rpx; }
.search::after { border:0; }
.control--pressed { opacity:.65; }
button { margin:0; padding:0; line-height:1; background:transparent; }
.city { border:0; outline:0; box-shadow:none; }
.city::after { display:none; }
.city { display:flex; align-items:center; justify-content:center; gap:8rpx; flex:0 0 auto; height:88rpx; min-height:44px; color:$dz-text-primary; font-size:$dz-fs-body; font-weight:$dz-fw-semibold; line-height:1; }
.city-arrow { font-size:$dz-fs-caption; }
.search { display:flex; align-items:center; flex:1; min-width:0; gap:12rpx; height:76rpx; min-height:44px; padding:0 24rpx; border:1rpx solid $dz-border-material; border-radius:$dz-radius-full; color:$dz-text-secondary; background:$dz-surface-glass; box-shadow:inset 0 1rpx 0 $dz-surface-highlight, 0 8rpx 24rpx rgba(31,65,72,.06); font-size:$dz-fs-caption; line-height:1; box-sizing:border-box; white-space:nowrap; }
.search-icon { color:$dz-text-secondary; font-size:$dz-fs-body; }
.content { display:block; padding-top:24rpx; padding-right:22rpx; padding-left:22rpx; }
.hero { position:relative; overflow:hidden; display:flex; flex-direction:column; justify-content:center; height:240rpx; padding:0 32rpx; border:1rpx solid $dz-border-material; border-radius:$dz-radius-lg; color:#075b67; box-shadow:$dz-shadow-card; box-sizing:border-box; }
.hero::after { position:absolute; inset:0; border-radius:inherit; box-shadow:inset 0 1rpx 0 $dz-surface-highlight; content:''; pointer-events:none; }
.hero-art { position:absolute; width:100%; height:100%; top:0; right:0; bottom:0; left:0; }
.hero-title,.hero-subtitle { position:relative; z-index:1; }
.hero-title { font-size:$dz-fs-price-lg; line-height:62rpx; font-weight:$dz-fw-bold; letter-spacing:-1rpx; }
.hero-subtitle { margin-top:$dz-space-1; font-size:$dz-fs-body; font-weight:$dz-fw-medium; letter-spacing:1rpx; }
.scene-grid { display:grid; grid-template-columns:1fr 1fr; gap:$dz-space-2; margin-top:$dz-space-3; }
.scene { position:relative; overflow:hidden; display:flex; flex-direction:column; justify-content:center; min-width:0; height:calc(210rpx - 20px); padding:16rpx 22rpx; border:1rpx solid $dz-border-material; border-radius:32rpx; color:#607477; box-shadow:0 8rpx 24rpx rgba(31,65,72,.05),inset 0 1rpx 0 $dz-surface-highlight; font-size:22rpx; line-height:28rpx; box-sizing:border-box; transition:transform $dz-duration-fast $dz-ease-out, opacity $dz-duration-fast $dz-ease-standard; }
.scene.provider { background:linear-gradient(135deg,#fff8f2,#ffeade); }
.scene.activity { background:linear-gradient(135deg,#f1fbfa,#d7f2ee); }
.scene-title { position:relative; z-index:1; align-self:flex-start; white-space:nowrap; font-size:30rpx; line-height:36rpx; font-weight:$dz-fw-bold; }
.provider .scene-title { color:#b64724; }
.activity .scene-title { color:#087d82; }
.scene-copy { position:relative; z-index:1; align-self:flex-start; margin-top:2rpx; white-space:nowrap; }
.scene-action { position:relative; z-index:2; display:flex; align-items:center; justify-content:center; gap:8rpx; align-self:flex-start; flex-shrink:0; height:40rpx; margin-top:8rpx; padding:0 16rpx; border:1rpx solid rgba(255,255,255,.36); border-radius:$dz-radius-full; color:$dz-text-inverse; background:#087d82; font-size:22rpx; font-weight:$dz-fw-semibold; line-height:28rpx; white-space:nowrap; box-sizing:border-box; }
.provider .scene-action { background:#c64920; }
.scene-action-label,.scene-arrow { display:block; line-height:28rpx; }
.scene-arrow { font-size:26rpx; font-weight:$dz-fw-medium; }
.more i { font-style:normal; }
.scene-art { position:absolute; z-index:0; right:2rpx; bottom:6rpx; height:calc(100% - 12rpx); pointer-events:none; }
.provider-art { width:148rpx; }
.group-art { width:152rpx; }
.scene--pressed,.category--pressed { transform:scale(0.98); opacity:0.94; }
.categories { display:grid; grid-template-columns:repeat(4,1fr); grid-auto-rows:112rpx; margin-top:$dz-space-3; padding:12rpx 8rpx; border:1rpx solid $dz-border-material; border-radius:$dz-radius-lg; background:$dz-surface-card; box-shadow:$dz-shadow-card,inset 0 1rpx 0 $dz-surface-highlight; box-sizing:border-box; }
.category { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:5rpx; border-radius:$dz-radius-md; color:$dz-text-primary; font-size:$dz-fs-caption; transition:transform $dz-duration-fast $dz-ease-out, opacity $dz-duration-fast $dz-ease-standard, background-color $dz-duration-base $dz-ease-standard; }
.category-icon { display:block; width:54rpx; height:54rpx; padding:7rpx; border-radius:18rpx; background:$dz-surface-page; box-sizing:content-box; }
.category-icon--fallback { display:flex; align-items:center; justify-content:center; color:$dz-brand-deep; font-size:$dz-fs-body; font-weight:$dz-fw-semibold; }
.category-label { display:block; overflow:hidden; max-width:100%; white-space:nowrap; text-overflow:ellipsis; text-align:center; }
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
