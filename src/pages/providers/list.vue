<template>
  <view class="dz-page dz-page--with-tabbar">
    <view class="dz-sticky-head">
      <view class="dz-safe-top" />

      <header class="header dz-container">
        <text class="brand">DAZZY<text>搭子</text><i>◆</i></text>
        <label class="search">
          <text>⌕</text>
          <input v-model="keyword" type="text" confirm-type="search" placeholder="搜索达人或服务" @confirm="loadProviders" />
          <button v-if="keyword" aria-label="清空搜索" @tap.stop="clearKeyword">×</button>
        </label>
        <button class="filter-button" :class="{ active: activeFilterCount }" :aria-label="activeFilterCount ? `筛选，已选${activeFilterCount}项` : '筛选'" @tap="openFilter">
          <i /><i /><i /><b v-if="activeFilterCount">{{ activeFilterCount }}</b>
        </button>
      </header>
    </view>

    <scroll-view scroll-x class="category-rail" :show-scrollbar="false">
      <view class="categories dz-container">
        <view
          v-for="item in categories"
          :key="item.value"
          class="category"
          :class="{ active: category === item.value }"
          hover-class="category--pressed"
          role="button"
          @tap="changeCategory(item.value)"
        >{{ item.label }}</view>
      </view>
    </scroll-view>

    <view class="sort-row dz-container">
      <view class="sorts">
        <view
          v-for="item in sorts"
          :key="item.value"
          :class="{ active: ordering === item.value }"
          hover-class="sort--pressed"
          role="button"
          @tap="changeOrdering(item.value)"
        ><i class="sort-icon">{{ item.icon }}</i>{{ item.label }}</view>
      </view>
    </view>

    <view v-if="activeFilterCount" class="filter-summary dz-container">
      <text>已启用 {{ activeFilterCount }} 项筛选</text>
      <button @tap="clearFilters">清除筛选</button>
    </view>

    <main class="grid dz-container dz-anim-stagger">
      <DzSkeleton v-if="loading" class="grid-state" variant="cards" :count="4" />
      <NetworkState v-else-if="error" class="grid-state" :message="error" error @retry="loadProviders" />

      <view
        v-for="item in providers"
        v-else
        :key="item.public_id"
        class="card dz-anim-fade-up"
        hover-class="card--pressed"
        @tap="openDetail(item.public_id)"
      >
        <view class="photo">
          <image v-if="item.avatar_url" :src="item.avatar_url" mode="aspectFill" />
          <text v-else class="photo-fallback">{{ item.nickname.slice(0, 1) }}</text>
          <text class="online" :class="{ offline: !item.is_online }"><i />{{ item.is_online ? '在线' : '离线' }}</text>
        </view>

        <view class="body">
          <view class="name-row">
            <text class="name">{{ item.nickname }}</text>
            <text class="rating">★ <i>{{ item.rating }}分</i></text>
          </view>
          <view class="profile-row">
            <text>{{ age(item.birth_date) ? `${age(item.birth_date)}岁` : '年龄保密' }}</text>
            <text>{{ item.service_count }}次服务</text>
            <text>⌖ {{ formatDistance(item.distance_km) }}</text>
          </view>
          <view class="tags"><text>{{ serviceTag(item) }}</text><text>{{ personalityTag(item) }}</text></view>
          <view class="foot">
            <text class="price">¥{{ formatPrice(item) }}<small>/{{ billingUnit(item) }}</small></text>
            <view
              class="book"
              :class="{ disabled: !item.is_online }"
              role="button"
              :aria-disabled="!item.is_online"
              @tap.stop="bookProvider(item)"
            >{{ item.is_online ? '预约' : '不可预约' }}</view>
          </view>
        </view>
      </view>

      <DzEmptyState
        v-if="!loading && !error && !providers.length"
        class="grid-state"
        title="暂无符合条件的达人"
        description="试试调整筛选条件或换个关键词"
        :action-text="activeFilterCount ? '清除筛选' : ''"
        @action="clearFilters"
      />
    </main>

    <DzBottomSheet :visible="filterOpen" title="筛选达人" @close="closeFilter">
      <view class="filter-section">
          <strong>接单状态</strong>
          <view class="filter-options two-columns">
            <button :class="{ active: !draftFilters.onlineOnly }" @tap="draftFilters.onlineOnly=false">全部达人</button>
            <button :class="{ active: draftFilters.onlineOnly }" @tap="draftFilters.onlineOnly=true">仅看在线</button>
          </view>
        </view>

        <view class="filter-section">
          <strong>性别</strong>
          <view class="filter-options">
            <button v-for="item in genderOptions" :key="item.value" :class="{ active: draftFilters.gender===item.value }" @tap="draftFilters.gender=item.value">{{ item.label }}</button>
          </view>
        </view>

        <view class="filter-section">
          <strong>最低评分</strong>
          <view class="filter-options">
            <button v-for="item in ratingOptions" :key="item.value" :class="{ active: draftFilters.minRating===item.value }" @tap="draftFilters.minRating=item.value">{{ item.label }}</button>
          </view>
        </view>

        <view class="filter-section">
          <strong>最高价格</strong>
          <view class="filter-options price-options">
            <button v-for="item in priceOptions" :key="item.value" :class="{ active: draftFilters.maxPriceAmount===item.value }" @tap="draftFilters.maxPriceAmount=item.value">{{ item.label }}</button>
          </view>
        </view>

        <footer class="sheet-actions">
          <button class="reset" @tap="resetDraftFilters">重置</button>
          <button class="apply" @tap="applyFilters">查看结果</button>
        </footer>
    </DzBottomSheet>

    <DazzyTabBar active="provider" />
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import DazzyTabBar from '@/components/DazzyTabBar.vue'
import DzBottomSheet from '@/components/DzBottomSheet.vue'
import DzEmptyState from '@/components/DzEmptyState.vue'
import DzSkeleton from '@/components/DzSkeleton.vue'
import NetworkState from '@/components/NetworkState.vue'
import { getRecommendedProviders, getServiceCategories } from '@/services/discovery'
import {
  discoveryQuery,
  getDiscoveryContext,
  resolveDiscoveryContext,
} from '@/services/discoveryContext'
import { openPage } from '@/services/navigation'
import type { ProviderListItem, ProviderServiceSummary } from '@/types/api'
import { formatAmount, formatDistance, getErrorMessage } from '@/utils/formatters'
import { businessDateKeyParts, businessTimeParts } from '@/utils/businessTime'

type Ordering = 'recommended' | 'distance' | 'rating' | 'price'

type GenderFilter = '' | 'male' | 'female'
interface ProviderFilters {
  onlineOnly: boolean
  gender: GenderFilter
  minRating: number
  maxPriceAmount: number
}

const fallbackCategories = [
  { label: '全部', value: '' },
  { label: '棋牌', value: 'mahjong' },
  { label: '桌球', value: 'billiards' },
  { label: '电竞', value: 'esports' },
  { label: '密室', value: 'escape-room' },
  { label: '桌游', value: 'board-games' },
  { label: '爬山', value: 'travel' },
  { label: '商务', value: 'business' },
]
const categories = ref([...fallbackCategories])
const sorts: Array<{ label: string; value: Ordering; icon: string }> = [
  { label: '综合', value: 'recommended', icon: '✦' },
  { label: '距离', value: 'distance', icon: '⌖' },
  { label: '评分', value: 'rating', icon: '★' },
  { label: '价格', value: 'price', icon: '¥' },
]
const genderOptions: Array<{ label: string; value: GenderFilter }> = [
  { label: '不限', value: '' },
  { label: '男生', value: 'male' },
  { label: '女生', value: 'female' },
]
const ratingOptions = [
  { label: '不限', value: 0 },
  { label: '4.5分以上', value: 4.5 },
  { label: '4.8分以上', value: 4.8 },
]
const priceOptions = [
  { label: '不限', value: 0 },
  { label: '¥100以内', value: 10000 },
  { label: '¥200以内', value: 20000 },
  { label: '¥300以内', value: 30000 },
]
const emptyFilters = (): ProviderFilters => ({
  onlineOnly: false,
  gender: '',
  minRating: 0,
  maxPriceAmount: 0,
})

const providers = ref<ProviderListItem[]>([])
const ordering = ref<Ordering>('recommended')
const category = ref('')
const keyword = ref('')
const filters = ref<ProviderFilters>(emptyFilters())
const draftFilters = ref<ProviderFilters>(emptyFilters())
const filterOpen = ref(false)
const loading = ref(true)
const error = ref('')
const discovery = ref(getDiscoveryContext())
const activeFilterCount = computed(() => [
  filters.value.onlineOnly,
  Boolean(filters.value.gender),
  filters.value.minRating > 0,
  filters.value.maxPriceAmount > 0,
].filter(Boolean).length)

function age(birthDate: string | null) {
  if (!birthDate) return null
  const birth = businessDateKeyParts(birthDate)
  const today = businessTimeParts(Date.now())
  let result = today.year - birth.year
  if (today.month < birth.month || (today.month === birth.month && today.day < birth.day)) result--
  return result
}

function matchedService(item: ProviderListItem): ProviderServiceSummary | undefined {
  const categoryServices = category.value
    ? item.services.filter(service => service.category_slug === category.value)
    : item.services
  const pricedServices = filters.value.maxPriceAmount
    ? categoryServices.filter(service => service.price_amount <= filters.value.maxPriceAmount)
    : categoryServices
  return [...pricedServices].sort((left, right) => left.price_amount - right.price_amount)[0]
    || categoryServices[0]
    || item.services[0]
}

function formatPrice(item: ProviderListItem) {
  return formatAmount(matchedService(item)?.price_amount || 0)
}

function billingUnit(item: ProviderListItem) {
  return matchedService(item)?.billing_type === 'per_session' ? '次' : '小时'
}

function serviceTag(item: ProviderListItem) {
  return (matchedService(item)?.category || '达人服务').replace('陪玩', '').replace('陪伴', '')
}

function personalityTag(item: ProviderListItem) {
  return item.service_count > 30 ? '健谈' : item.rating >= '4.90' ? '细心' : '活泼'
}

async function loadProviders() {
  loading.value = true
  error.value = ''
  try {
    providers.value = (await getRecommendedProviders({
      keyword: keyword.value.trim() || undefined,
      category: category.value || undefined,
      gender: filters.value.gender || undefined,
      online_only: filters.value.onlineOnly ? 1 : undefined,
      min_rating: filters.value.minRating || undefined,
      max_price_amount: filters.value.maxPriceAmount || undefined,
      ordering: ordering.value,
      page_size: 20,
      ...discoveryQuery(discovery.value),
    })).data.items
  } catch (reason) {
    error.value = getErrorMessage(reason)
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  try {
    const items = (await getServiceCategories()).data.items
    if (items.length) {
      const primaryValues = new Set(fallbackCategories.map(item => item.value))
      const configuredExtras = items
        .filter(item => !primaryValues.has(item.slug))
        .map(item => ({
          label: item.name.replace('陪玩', '').replace('陪伴', ''),
          value: item.slug,
        }))
      categories.value = [...fallbackCategories, ...configuredExtras]
    }
  } catch {
    categories.value = [...fallbackCategories]
  }
}

function changeCategory(value: string) {
  category.value = value
  loadProviders()
}

function changeOrdering(value: Ordering) {
  ordering.value = value
  loadProviders()
}

function openDetail(publicId: string) {
  openPage(`/pages/providers/detail?id=${publicId}`)
}

function bookProvider(item: ProviderListItem) {
  if (!item.is_online) {
    uni.showToast({ title: '达人当前离线，暂时无法预约', icon: 'none' })
    return
  }
  openDetail(item.public_id)
}

function clearKeyword() {
  keyword.value = ''
  loadProviders()
}

function openFilter() {
  draftFilters.value = { ...filters.value }
  filterOpen.value = true
}

function closeFilter() {
  filterOpen.value = false
}

function resetDraftFilters() {
  draftFilters.value = emptyFilters()
}

function applyFilters() {
  filters.value = { ...draftFilters.value }
  filterOpen.value = false
  loadProviders()
}

function clearFilters() {
  filters.value = emptyFilters()
  draftFilters.value = emptyFilters()
  loadProviders()
}

onLoad(async (query) => {
  category.value = typeof query?.category === 'string' ? query.category : ''
  discovery.value = await resolveDiscoveryContext()
  loadCategories()
  await loadProviders()
})
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;

button { margin:0; padding:0; border:0; background:transparent; line-height:1; }
button::after { display:none; }
.header { display:flex; align-items:center; gap:18rpx; min-height:104rpx; }
.brand { position:relative; flex:0 0 auto; color:$dz-text-primary; font-size:37rpx; font-style:italic; font-weight:$dz-fw-bold; letter-spacing:-2rpx; }
.brand>text { margin-left:6rpx; font-size:$dz-fs-body-strong; font-style:normal; letter-spacing:0; }
.brand i { position:absolute; right:42rpx; bottom:-8rpx; color:$dz-brand-primary; font-size:$dz-fs-micro; font-style:normal; }
.search { display:flex; align-items:center; flex:1; min-width:0; gap:12rpx; height:64rpx; padding:0 16rpx 0 22rpx; border:1rpx solid $dz-border-material; border-radius:$dz-radius-full; color:$dz-text-tertiary; background:$dz-surface-glass; box-shadow:inset 0 1rpx 0 $dz-surface-highlight,0 8rpx 24rpx rgba(31,65,72,.055); font-size:$dz-fs-caption; box-sizing:border-box; }
.search>text:first-child { color:$dz-text-secondary; font-size:$dz-fs-body-strong; }
.search input { flex:1; min-width:0; height:100%; color:$dz-text-primary; font-size:$dz-fs-caption; }
.search button { display:flex; align-items:center; justify-content:center; flex:0 0 54rpx; width:54rpx; height:88rpx; color:$dz-text-tertiary; font-size:$dz-fs-body-strong; }
.filter-button { position:relative; display:flex; flex-direction:column; align-items:center; justify-content:center; flex:0 0 72rpx; gap:5rpx; width:72rpx; height:72rpx; border:1rpx solid $dz-border-material; border-radius:50%; background:$dz-surface-raised; box-shadow:inset 0 1rpx 0 $dz-surface-highlight; }
.filter-button.active { background:$dz-brand-soft; }
.filter-button i { display:block; width:34rpx; height:3rpx; border-radius:2rpx; background:$dz-brand-deep; }
.filter-button i:nth-child(2) { width:24rpx; }
.filter-button i:nth-child(3) { width:12rpx; }
.filter-button b { position:absolute; right:-2rpx; top:-3rpx; display:flex; align-items:center; justify-content:center; min-width:28rpx; height:28rpx; padding:0 6rpx; border:3rpx solid #fff; border-radius:$dz-radius-sm; color:$dz-text-inverse; background:$dz-price-primary; box-sizing:border-box; font-size:$dz-fs-micro; line-height:1; }
.category-rail { white-space:nowrap; }
.categories { display:flex; gap:16rpx; padding-top:12rpx; padding-bottom:18rpx; }
.category { display:flex; align-items:center; justify-content:center; flex:0 0 auto; min-width:116rpx; height:58rpx; padding:0 24rpx; border:1rpx solid $dz-border-material; border-radius:$dz-radius-full; color:$dz-text-primary; background:$dz-surface-raised; box-shadow:inset 0 1rpx 0 $dz-surface-highlight; font-size:$dz-fs-caption; box-sizing:border-box; transition:transform $dz-duration-fast $dz-ease-out, opacity $dz-duration-fast $dz-ease-standard; }
.category--pressed { transform:scale(.95); opacity:.8; }
.category.active { border-color:transparent; color:$dz-text-inverse; background:$dz-gradient-brand; box-shadow:$dz-shadow-brand; font-weight:$dz-fw-bold; }
.sort-row { min-height:78rpx; }
.sorts { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); align-items:stretch; width:100%; height:78rpx; }
.sorts>view { position:relative; display:flex; align-items:center; justify-content:center; gap:8rpx; color:$dz-text-primary; font-size:$dz-fs-caption; transition:opacity $dz-duration-fast $dz-ease-standard; }
.sort-icon{display:inline-flex;width:24rpx;align-items:center;justify-content:center;color:$dz-text-tertiary;font-size:22rpx;font-style:normal}.sorts>view.active .sort-icon{color:$dz-brand-deep}
.sort--pressed { opacity:.6; }
.sorts>view.active { color:$dz-brand-deep; font-weight:$dz-fw-bold; }
.sorts>view.active::before { position:absolute; right:4rpx; bottom:8rpx; left:4rpx; height:4rpx; border-radius:2rpx; background:$dz-brand-primary; content:''; }
.filter-summary { display:flex; align-items:center; justify-content:space-between; height:58rpx; margin-bottom:8rpx; border-radius:$dz-radius-sm; color:$dz-brand-deep; background:$dz-brand-soft; font-size:$dz-fs-caption; }
.filter-summary button { width:104rpx; height:58rpx; color:$dz-brand-deep; font-size:$dz-fs-caption; }
.grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:$dz-space-2; padding-top:4rpx; }
.grid-state { grid-column:1/-1; }
.card { overflow:hidden; border:1rpx solid $dz-border-material; border-radius:$dz-radius-lg; background:$dz-surface-card; box-shadow:$dz-shadow-card,inset 0 1rpx 0 $dz-surface-highlight; transform-origin:center; transition:transform $dz-duration-fast $dz-ease-out, opacity $dz-duration-fast $dz-ease-standard; will-change:transform; }
.card--pressed { transform:scale(0.98); opacity:0.94; }
.photo { position:relative; display:flex; align-items:center; justify-content:center; height:260rpx; color:$dz-text-inverse; background:linear-gradient(145deg,$dz-brand-soft,$dz-brand-primary); font-size:64rpx; font-weight:$dz-fw-bold; }
.photo image { width:100%; height:100%; }
.photo-fallback { font-size:64rpx; }
.online { position:absolute; left:12rpx; bottom:10rpx; padding:5rpx 12rpx; border:1rpx solid rgba(255,255,255,.4); border-radius:$dz-radius-full; color:$dz-text-primary; background:rgba(255,255,255,.86); font-size:$dz-fs-micro; font-weight:$dz-fw-medium; }
.online i { display:inline-block; width:13rpx; height:13rpx; margin-right:7rpx; border-radius:50%; background:$dz-status-success; }
.online.offline { color:$dz-text-secondary; }
.online.offline i { background:$dz-text-tertiary; }
/* #ifdef H5 */
.search,.filter-button,.category,.online { -webkit-backdrop-filter:saturate(170%) blur(16px); backdrop-filter:saturate(170%) blur(16px); }
/* #endif */
.favorite { position:absolute; right:10rpx; top:8rpx; color:$dz-text-inverse; font-size:$dz-fs-price-lg; line-height:50rpx; text-shadow:0 2rpx 5rpx rgba(0,0,0,.35); }
.body { padding:13rpx 14rpx 15rpx; }
.name-row,.profile-row,.foot { display:flex; align-items:center; justify-content:space-between; }
.name { color:$dz-text-primary; font-size:$dz-fs-body; font-weight:$dz-fw-bold; }
.rating { color:$dz-status-warning; font-size:$dz-fs-caption; }
.rating i { color:$dz-text-secondary; font-size:$dz-fs-caption; font-style:normal; font-weight:$dz-fw-regular; }
.profile-row { margin-top:8rpx; color:$dz-text-secondary; font-size:$dz-fs-micro; }
.profile-row text:nth-child(2) { display:none; }
.tags { display:flex; gap:8rpx; margin-top:12rpx; }
.tags text { padding:4rpx 12rpx; border-radius:$dz-radius-full; color:$dz-brand-deep; background:$dz-brand-soft; font-size:$dz-fs-micro; }
.foot { margin-top:14rpx; }
.price { color:$dz-price-primary; font-size:$dz-fs-body-strong; font-weight:$dz-fw-medium; }
.price small { font-size:$dz-fs-micro; font-weight:$dz-fw-regular; }
.book { display:flex; align-items:center; justify-content:center; min-width:86rpx; height:48rpx; border:1rpx solid rgba(255,255,255,.34); border-radius:$dz-radius-full; color:$dz-text-inverse; background:$dz-gradient-brand; box-shadow:$dz-shadow-brand; font-size:$dz-fs-caption; font-weight:$dz-fw-bold; box-sizing:border-box; }
.book.disabled { min-width:110rpx; border:1rpx solid $dz-border-subtle; color:$dz-text-secondary; background:$dz-surface-page; box-shadow:none; font-size:$dz-fs-caption; }
.filter-section { padding:$dz-space-3 0 8rpx; }
.filter-section>strong { display:block; margin-bottom:15rpx; color:$dz-text-primary; font-size:$dz-fs-caption; }
.filter-options { display:grid; grid-template-columns:repeat(3,1fr); gap:12rpx; }
.filter-options.two-columns { grid-template-columns:repeat(2,1fr); }
.filter-options.price-options { grid-template-columns:repeat(4,1fr); }
.filter-options button { display:flex; align-items:center; justify-content:center; min-width:0; height:88rpx; padding:0 8rpx; border:2rpx solid transparent; border-radius:$dz-radius-sm; color:$dz-text-secondary; background:$dz-surface-page; font-size:$dz-fs-caption; line-height:1.25; transition:opacity $dz-duration-fast $dz-ease-standard; }
.filter-options button.active { border-color:$dz-brand-primary; color:$dz-brand-deep; background:$dz-brand-soft; font-weight:$dz-fw-bold; }
.sheet-actions { display:grid; grid-template-columns:180rpx 1fr; gap:$dz-space-2; margin-top:$dz-space-3; }
.sheet-actions button { display:flex; align-items:center; justify-content:center; height:88rpx; border-radius:$dz-radius-full; font-size:$dz-fs-caption; font-weight:$dz-fw-bold; line-height:1.2; text-align:center; box-sizing:border-box; transition:transform $dz-duration-fast $dz-ease-out, opacity $dz-duration-fast $dz-ease-standard; }
.sheet-actions button:active { transform:scale(0.97); opacity:0.92; }
.sheet-actions .reset { border:1rpx solid $dz-border-subtle; color:$dz-text-primary; background:$dz-surface-card; }
.sheet-actions .apply { color:$dz-text-inverse; background:$dz-gradient-brand; }

@media screen and (min-width:480px) {
  .photo { height:276rpx; }
}
@media screen and (max-width:360px) {
  .header { gap:10rpx; }
  .brand { font-size:$dz-fs-body-strong; }
  .brand>text { font-size:$dz-fs-caption; }
  .filter-options.price-options { grid-template-columns:repeat(2,1fr); }
}
@media (prefers-reduced-motion:reduce) {
  .card,.sheet-actions button { transition:none; }
  .card--pressed { transform:none; opacity:0.85; }
  .sheet-actions button:active { transform:none; opacity:0.85; }
}
</style>
