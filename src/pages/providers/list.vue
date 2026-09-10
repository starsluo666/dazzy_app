<template>
  <view class="dz-page dz-page--with-tabbar">
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

    <scroll-view scroll-x class="category-rail" :show-scrollbar="false">
      <view class="categories dz-container">
        <view
          v-for="item in categories"
          :key="item.value"
          class="category"
          :class="{ active: category === item.value }"
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
          role="button"
          @tap="changeOrdering(item.value)"
        >{{ item.label }}</view>
      </view>
      <view class="city" role="button" @tap="showCityPending">⌖ 邯郸市⌄</view>
    </view>

    <view v-if="activeFilterCount" class="filter-summary dz-container">
      <text>已启用 {{ activeFilterCount }} 项筛选</text>
      <button @tap="clearFilters">清除筛选</button>
    </view>

    <main class="grid dz-container">
      <NetworkState v-if="loading" class="grid-state" message="正在加载达人…" />
      <NetworkState v-else-if="error" class="grid-state" :message="error" error @retry="loadProviders" />

      <view
        v-for="item in providers"
        v-else
        :key="item.public_id"
        class="card"
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

      <NetworkState
        v-if="!loading && !error && !providers.length"
        class="grid-state"
        message="暂无符合条件的达人"
      />
    </main>

    <view v-if="filterOpen" class="filter-layer" @tap="closeFilter">
      <section class="filter-sheet" role="dialog" aria-label="筛选达人" @tap.stop>
        <view class="sheet-handle" />
        <header class="sheet-head">
          <strong>筛选达人</strong>
          <button aria-label="关闭筛选" @tap="closeFilter">×</button>
        </header>

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
      </section>
    </view>

    <DazzyTabBar active="provider" />
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import DazzyTabBar from '@/components/DazzyTabBar.vue'
import NetworkState from '@/components/NetworkState.vue'
import { getRecommendedProviders, getServiceCategories } from '@/services/discovery'
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
const sorts: Array<{ label: string; value: Ordering }> = [
  { label: '综合', value: 'recommended' },
  { label: '距离', value: 'distance' },
  { label: '评分', value: 'rating' },
  { label: '价格', value: 'price' },
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

function showPending(feature: string) {
  uni.showToast({ title: `${feature}功能即将接入`, icon: 'none' })
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

function showCityPending() {
  showPending('城市选择')
}

onLoad((query) => {
  category.value = typeof query?.category === 'string' ? query.category : ''
  loadCategories()
  loadProviders()
})
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;

button { margin:0; padding:0; border:0; background:transparent; line-height:1; }
button::after { display:none; }
.header { display:flex; align-items:center; gap:18rpx; min-height:104rpx; }
.brand { position:relative; flex:0 0 auto; color:#171d20; font-size:37rpx; font-style:italic; font-weight:900; letter-spacing:-2rpx; }
.brand>text { margin-left:6rpx; font-size:29rpx; font-style:normal; letter-spacing:0; }
.brand i { position:absolute; right:42rpx; bottom:-8rpx; color:$dz-brand-primary; font-size:16rpx; font-style:normal; }
.search { display:flex; align-items:center; flex:1; min-width:0; gap:12rpx; height:62rpx; padding:0 16rpx 0 22rpx; border:1rpx solid #e2e7e9; border-radius:32rpx; color:$dz-text-tertiary; background:#fff; font-size:22rpx; box-sizing:border-box; }
.search>text:first-child { color:#748086; font-size:31rpx; }
.search input { flex:1; min-width:0; height:100%; color:$dz-text-primary; font-size:21rpx; }
.search button { display:flex; align-items:center; justify-content:center; flex:0 0 54rpx; width:54rpx; height:88rpx; color:$dz-text-tertiary; font-size:31rpx; }
.filter-button { position:relative; display:flex; flex-direction:column; align-items:center; justify-content:center; flex:0 0 88rpx; gap:5rpx; width:88rpx; height:88rpx; border-radius:50%; }
.filter-button.active { background:$dz-brand-soft; }
.filter-button i { display:block; width:34rpx; height:3rpx; border-radius:2rpx; background:$dz-brand-deep; }
.filter-button i:nth-child(2) { width:24rpx; }
.filter-button i:nth-child(3) { width:12rpx; }
.filter-button b { position:absolute; right:-2rpx; top:-3rpx; display:flex; align-items:center; justify-content:center; min-width:28rpx; height:28rpx; padding:0 6rpx; border:3rpx solid #fff; border-radius:16rpx; color:#fff; background:$dz-price-primary; box-sizing:border-box; font-size:16rpx; line-height:1; }
.category-rail { white-space:nowrap; }
.categories { display:flex; gap:16rpx; padding-top:12rpx; padding-bottom:18rpx; }
.category { display:flex; align-items:center; justify-content:center; flex:0 0 auto; min-width:116rpx; height:58rpx; padding:0 24rpx; border-radius:30rpx; color:#283136; background:#f7f8f9; font-size:23rpx; }
.category.active { color:#fff; background:linear-gradient(135deg,#18c7c6,#08b7c3); font-weight:700; }
.sort-row { display:flex; align-items:center; justify-content:space-between; min-height:78rpx; }
.sorts { display:flex; align-items:stretch; gap:38rpx; height:78rpx; }
.sorts>view { position:relative; display:flex; align-items:center; color:#30383c; font-size:23rpx; }
.sorts>view.active { color:$dz-brand-deep; font-weight:700; }
.sorts>view.active::before { position:absolute; right:4rpx; bottom:8rpx; left:4rpx; height:4rpx; border-radius:2rpx; background:$dz-brand-primary; content:''; }
.city { flex:0 0 auto; color:#4f5a60; font-size:22rpx; }
.filter-summary { display:flex; align-items:center; justify-content:space-between; height:58rpx; margin-bottom:8rpx; border-radius:14rpx; color:$dz-brand-deep; background:$dz-brand-soft; font-size:19rpx; }
.filter-summary button { width:104rpx; height:58rpx; color:$dz-brand-deep; font-size:19rpx; }
.grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16rpx; padding-top:4rpx; }
.grid-state { grid-column:1/-1; }
.card { overflow:hidden; border:1rpx solid $dz-border-subtle; border-radius:18rpx; background:#fff; box-shadow:0 8rpx 24rpx rgba(31,65,72,.07); }
.card--pressed { opacity:.74; }
.photo { position:relative; display:flex; align-items:center; justify-content:center; height:254rpx; color:#fff; background:linear-gradient(145deg,#b7e3e4,#63b8bd); font-size:64rpx; font-weight:700; }
.photo image { width:100%; height:100%; }
.photo-fallback { font-size:64rpx; }
.online { position:absolute; left:12rpx; bottom:10rpx; padding:5rpx 12rpx; border-radius:18rpx; color:#1f292d; background:rgba(255,255,255,.88); font-size:18rpx; font-weight:500; }
.online i { display:inline-block; width:13rpx; height:13rpx; margin-right:7rpx; border-radius:50%; background:#16bd62; }
.online.offline { color:#667177; }
.online.offline i { background:#9aa4aa; }
.favorite { position:absolute; right:10rpx; top:8rpx; color:#fff; font-size:50rpx; line-height:50rpx; text-shadow:0 2rpx 5rpx rgba(0,0,0,.35); }
.body { padding:13rpx 14rpx 15rpx; }
.name-row,.profile-row,.foot { display:flex; align-items:center; justify-content:space-between; }
.name { color:$dz-text-primary; font-size:27rpx; font-weight:800; }
.rating { color:#ffad1f; font-size:24rpx; }
.rating i { color:#4d585d; font-size:21rpx; font-style:normal; font-weight:400; }
.profile-row { margin-top:8rpx; color:#657177; font-size:18rpx; }
.profile-row text:nth-child(2) { display:none; }
.tags { display:flex; gap:8rpx; margin-top:12rpx; }
.tags text { padding:4rpx 10rpx; border:1rpx solid #46d1d0; border-radius:10rpx; color:$dz-brand-deep; font-size:18rpx; }
.foot { margin-top:14rpx; }
.price { color:#ff501e; font-size:30rpx; font-weight:500; }
.price small { font-size:17rpx; font-weight:400; }
.book { display:flex; align-items:center; justify-content:center; min-width:86rpx; height:48rpx; border-radius:25rpx; color:#fff; background:$dz-gradient-brand; font-size:22rpx; font-weight:700; }
.book.disabled { min-width:110rpx; color:#7b858a; background:#edf0f1; font-size:19rpx; }
.filter-layer { position:fixed; z-index:60; inset:0; background:rgba(15,28,32,.52); }
.filter-sheet { position:absolute; right:0; bottom:0; left:0; overflow-y:auto; max-width:750px; max-height:90vh; margin:auto; padding:14rpx 26rpx calc(26rpx + env(safe-area-inset-bottom)); border-radius:32rpx 32rpx 0 0; background:#fff; box-sizing:border-box; }
.sheet-handle { width:72rpx; height:7rpx; margin:0 auto 10rpx; border-radius:4rpx; background:#d5dddf; }
.sheet-head { display:flex; align-items:center; justify-content:space-between; height:76rpx; }
.sheet-head strong { color:$dz-text-primary; font-size:30rpx; }
.sheet-head button { display:flex; align-items:center; justify-content:center; width:88rpx; height:88rpx; margin-right:-20rpx; color:$dz-text-secondary; font-size:39rpx; }
.filter-section { padding:18rpx 0 8rpx; }
.filter-section>strong { display:block; margin-bottom:15rpx; color:$dz-text-primary; font-size:23rpx; }
.filter-options { display:grid; grid-template-columns:repeat(3,1fr); gap:12rpx; }
.filter-options.two-columns { grid-template-columns:repeat(2,1fr); }
.filter-options.price-options { grid-template-columns:repeat(4,1fr); }
.filter-options button { display:flex; align-items:center; justify-content:center; min-width:0; height:88rpx; padding:0 8rpx; border:2rpx solid transparent; border-radius:15rpx; color:$dz-text-secondary; background:#f3f6f7; font-size:20rpx; line-height:1.25; }
.filter-options button.active { border-color:$dz-brand-primary; color:$dz-brand-deep; background:$dz-brand-soft; font-weight:700; }
.sheet-actions { display:grid; grid-template-columns:180rpx 1fr; gap:16rpx; margin-top:24rpx; }
.sheet-actions button { display:flex; align-items:center; justify-content:center; height:88rpx; border-radius:44rpx; font-size:24rpx; font-weight:700; line-height:1.2; text-align:center; box-sizing:border-box; }
.sheet-actions .reset { border:1rpx solid $dz-border-subtle; color:$dz-text-primary; background:#fff; }
.sheet-actions .apply { color:#fff; background:$dz-gradient-brand; }

@media screen and (min-width:480px) {
  .photo { height:276rpx; }
}
@media screen and (max-width:360px) {
  .header { gap:10rpx; }
  .brand { font-size:31rpx; }
  .brand>text { font-size:25rpx; }
  .filter-options.price-options { grid-template-columns:repeat(2,1fr); }
}
@media (prefers-reduced-motion:reduce) {
  .card { transition:none; }
}
</style>
