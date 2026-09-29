<template>
  <view class="dz-page reviews-page">
    <DzNavBar title="我的评价" :back-action="goBack"><template #right><text class="dz-navbar-label">{{ reviews.length || '' }}</text></template></DzNavBar>

    <main class="dz-container content">
      <NetworkState v-if="loading" message="正在加载评价…" />
      <NetworkState v-else-if="error" :message="error" action-text="重新加载" @action="load" />
      <view v-else-if="!reviews.length" class="empty">
        <view class="empty-mark">☆</view>
        <strong>还没有发表评价</strong>
        <text>完成达人服务后，可以分享你的真实感受</text>
        <button @tap="openOrders">查看我的订单</button>
      </view>
      <article v-for="review in reviews" v-else :key="review.order_no" class="review-card">
        <view class="review-head" @tap="openProvider(review.provider_public_id)">
          <view class="avatar">{{ review.provider_name.slice(0, 1) }}</view>
          <view class="provider-copy"><strong>{{ review.provider_name }}</strong><text>{{ review.service_name }}</text></view>
          <text class="arrow">›</text>
        </view>
        <view class="review-meta">
          <text class="stars">{{ '★'.repeat(review.rating) }}</text>
          <text>{{ review.is_anonymous ? '匿名评价' : '公开昵称' }}</text>
          <text :class="review.audit_status === 'approved' && review.is_visible ? 'visible' : 'hidden'">{{ review.audit_status === 'pending' ? '审核中' : review.audit_status === 'rejected' ? '审核未通过' : review.is_visible ? '公开展示中' : '平台已屏蔽' }}</text>
        </view>
        <text v-if="review.audit_status === 'rejected'" class="review-reason">未通过原因：{{ review.audit_rejection_reason }}</text>
        <text class="review-content">{{ review.content || '未填写文字评价' }}</text>
        <view v-if="review.image_urls.length" class="review-images">
          <image v-for="(url, index) in review.image_urls" :key="url" :src="url" mode="aspectFill" @tap="preview(review.image_urls, index)" />
        </view>
        <view class="review-foot"><text>{{ formatDate(review.created_at) }}</text><text>订单 {{ review.order_no }}</text></view>
      </article>
      <view v-if="reviews.length" class="list-foot">{{ loadingMore ? '正在加载更多…' : hasMore ? '继续上滑查看更多' : '已显示全部评价' }}</view>
    </main>
  </view>
</template>

<script setup lang="ts">
import { navigateBackOr } from '@/utils/navigation'
import DzNavBar from '@/components/DzNavBar.vue'
import { onReachBottom, onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'

import NetworkState from '@/components/NetworkState.vue'
import { getMyProviderOrderReviews } from '@/services/orders'
import type { MyProviderOrderReview } from '@/types/api'
import { formatBusinessDate, getErrorMessage } from '@/utils/formatters'

const reviews = ref<MyProviderOrderReview[]>([])
const loading = ref(true)
const error = ref('')
const page = ref(1)
const total = ref(0)
const loadingMore = ref(false)
const hasMore = ref(false)

function goBack() { navigateBackOr(() => uni.reLaunch({ url: '/pages/profile/index' })) }
function openOrders() { uni.navigateTo({ url: '/pages/orders/list?status=all' }) }
function openProvider(id: string) { uni.navigateTo({ url: `/pages/providers/detail?id=${id}` }) }
function preview(urls: string[], index: number) { uni.previewImage({ current: urls[index], urls }) }
function formatDate(value: string) {
  return formatBusinessDate(value)
}
async function load(reset = true) {
  if (reset) {
    loading.value = true
    page.value = 1
  } else {
    if (!hasMore.value || loadingMore.value) return
    loadingMore.value = true
  }
  error.value = ''
  try {
    const response = (await getMyProviderOrderReviews(page.value)).data
    reviews.value = reset ? response.items : [...reviews.value, ...response.items]
    total.value = response.pagination.total
    hasMore.value = reviews.value.length < total.value
    if (hasMore.value) page.value += 1
  }
  catch (reason) {
    const message = getErrorMessage(reason)
    if (reset) error.value = message
    else uni.showToast({ title: message, icon: 'none' })
  }
  finally { loading.value = false; loadingMore.value = false }
}

onShow(() => load())
onReachBottom(() => load(false))
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;
.reviews-page{min-height:100vh;background:$dz-surface-page}.hero{background:linear-gradient(150deg,#eafcfc,#fff)}.nav{display:flex;align-items:center;justify-content:space-between;height:94rpx}.nav button{display:flex;align-items:center;justify-content:center;width:88rpx;height:88rpx;margin:0 0 0 -12rpx;padding:0;border:0;background:transparent;font-size:58rpx;line-height:1}.nav button::after{display:none}.nav strong{font-size:$dz-fs-heading}.nav>text{width:76rpx;color:$dz-text-tertiary;text-align:right}.content{padding-top:22rpx;padding-bottom:calc(36rpx + env(safe-area-inset-bottom))}.review-card{margin-bottom:18rpx;padding:22rpx;border:1rpx solid rgba(24,199,198,.08);border-radius:$dz-radius-md;background:$dz-surface-card;box-shadow:$dz-shadow-card}.review-head{display:flex;align-items:center;min-height:88rpx}.avatar{display:flex;align-items:center;justify-content:center;width:76rpx;height:76rpx;flex:none;border-radius:$dz-radius-md;color:$dz-brand-deep;background:$dz-brand-soft;font-size:$dz-fs-body-strong;font-weight:$dz-fw-bold}.provider-copy{display:flex;min-width:0;flex:1;flex-direction:column;gap:7rpx;margin-left:16rpx}.provider-copy strong{font-size:$dz-fs-body}.provider-copy text{color:$dz-text-secondary;font-size:$dz-fs-caption}.arrow{color:$dz-text-tertiary;font-size:$dz-fs-title}.review-meta{display:flex;align-items:center;gap:12rpx;margin-top:16rpx}.review-meta>text{padding:5rpx 10rpx;border-radius:$dz-radius-sm;color:$dz-text-secondary;background:$dz-surface-page;font-size:$dz-fs-micro}.review-meta .stars{padding:0;color:$dz-status-warning;background:transparent;font-size:$dz-fs-caption;letter-spacing:2rpx}.review-meta .visible{color:$dz-brand-deep;background:$dz-brand-soft}.review-meta .hidden{color:#b55d35;background:$dz-price-soft}.review-content{display:block;margin-top:17rpx;color:$dz-text-primary;font-size:$dz-fs-caption;line-height:35rpx}.review-images{display:grid;grid-template-columns:repeat(3,1fr);gap:10rpx;margin-top:15rpx}.review-images image{width:100%;height:180rpx;border-radius:$dz-radius-sm}.review-foot{display:flex;justify-content:space-between;margin-top:18rpx;padding-top:14rpx;border-top:1rpx solid $dz-border-subtle;color:$dz-text-tertiary;font-size:$dz-fs-micro}.list-foot{padding:12rpx 0 24rpx;color:$dz-text-tertiary;font-size:$dz-fs-micro;text-align:center}.empty{display:flex;min-height:620rpx;flex-direction:column;align-items:center;justify-content:center;gap:14rpx;text-align:center}.empty-mark{display:flex;align-items:center;justify-content:center;width:116rpx;height:116rpx;border-radius:$dz-radius-lg;color:$dz-brand-primary;background:$dz-brand-soft;font-size:68rpx}.empty strong{font-size:$dz-fs-body-strong}.empty>text{color:$dz-text-tertiary;font-size:$dz-fs-caption}.empty button{min-width:220rpx;height:80rpx;margin-top:14rpx;border:0;border-radius:$dz-radius-lg;color:$dz-text-inverse;background:$dz-gradient-brand;font-size:$dz-fs-caption;line-height:80rpx}.empty button::after{display:none}
.review-reason{display:block;margin-top:14rpx;padding:12rpx;border-radius:$dz-radius-sm;color:$dz-status-danger-deep;background:$dz-status-danger-soft;font-size:$dz-fs-micro;line-height:1.5}
</style>
