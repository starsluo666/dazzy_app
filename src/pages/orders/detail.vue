<template>
  <view class="dz-page order-detail-page">
    <DzNavBar title="订单详情" :back-action="goBack"><template #right><button class="dz-navbar-action" aria-label="联系平台客服" hover-class="dz-pressed" @tap="openSupport()">客服</button></template></DzNavBar>

    <view v-if="loading" class="booking-empty">正在加载订单…</view>
    <view v-else-if="order" class="detail-content">
      <section class="status-hero">
        <view class="clock">◷</view>
        <view class="status-copy">
          <strong>{{ statusCopy.title }}</strong>
          <text>{{ statusCopy.description }}</text>
        </view>
        <view class="progress">
          <view
            v-for="(step, index) in steps"
            :key="step"
            :class="{ done: index < statusCopy.step, active: index === statusCopy.step }"
          >
            <i>{{ index < statusCopy.step ? '✓' : '' }}</i>
            <text>{{ step }}</text>
          </view>
        </view>
      </section>

      <section class="provider-card panel">
        <view class="avatar">
          <image v-if="order.provider_avatar_url" :src="order.provider_avatar_url" mode="aspectFill" />
          <text v-else>{{ order.provider_name.slice(0, 1) }}</text>
        </view>
        <view class="provider-copy">
          <view><strong>{{ order.provider_name }}</strong><text>{{ order.service_name }}</text></view>
          <text>★ 4.9分</text>
        </view>
        <view class="contact-actions">
          <button @tap="showPending('私信')">◌ 私信</button>
          <button @tap="showPending('电话联系')">⌕ 电话联系</button>
        </view>
      </section>

      <section class="info-card panel">
        <view><i>◷</i><text>服务时间</text><strong>{{ timeLabel }}</strong></view>
        <view><i>●</i><text>集合地点</text><strong>{{ addressLabel }}</strong><button @tap="showPending('导航')">导航</button></view>
        <view class="map"><view class="roads" /><i>●</i></view>
        <view><i>▤</i><text>订单编号</text><strong class="muted">{{ order.order_no }}</strong><button aria-label="复制订单编号" @tap="copyOrderNo">▣</button></view>
        <view><i>▦</i><text>创建时间</text><strong class="muted">{{ createdLabel }}</strong></view>
        <view v-if="order.status === 'pending_confirmation' && order.confirmation_expires_at">
          <i>⌛</i><text>确认截止</text><strong class="muted">{{ formatDateTime(order.confirmation_expires_at) }}</strong>
        </view>
        <view v-if="order.status === 'pending_review' && order.review_expires_at">
          <i>⌛</i><text>评价截止</text><strong class="muted">{{ formatDateTime(order.review_expires_at) }}</strong>
        </view>
      </section>

      <section v-if="canRewardReport" class="reward-report-link panel">
        <view><strong>发现服务违规？</strong><text>待评价期内可上传证据，核查成立后获得优惠券</text></view>
        <button @tap="openRewardReport">举报有奖 ›</button>
      </section>

      <section class="fees panel">
        <view><text>服务费</text><text>¥{{ money(order.service_fee_amount) }}</text></view>
        <view><text>交通费</text><text>¥{{ money(order.transport_fee_amount) }}</text></view>
        <view><text>优惠券</text><text class="discount">−¥{{ money(order.discount_amount) }}</text></view>
        <view class="total"><text>{{ order.paid_at ? '实付' : '应付' }}</text><strong>¥{{ money(order.payable_amount) }}</strong></view>
      </section>

      <section v-if="order.payment_order" class="finance-panel panel">
        <view class="finance-head"><strong>支付状态</strong><text :class="['finance-badge', paymentTone]">{{ order.payment_order.status_label }}</text></view>
        <view class="finance-row"><text>支付单号</text><text>{{ order.payment_order.payment_no }}</text></view>
        <view class="finance-row"><text>支付金额</text><strong>¥{{ money(order.payment_order.payable_amount) }}</strong></view>
        <view v-if="order.payment_order.paid_at" class="finance-row"><text>支付时间</text><text>{{ formatDateTime(order.payment_order.paid_at) }}</text></view>
        <text class="finance-tip">{{ paymentHint }}</text>
      </section>

      <section v-if="order.after_sales || order.refund_orders.length" class="finance-panel panel">
        <view class="finance-head"><strong>退款 / 售后进度</strong><text v-if="order.after_sales" :class="['finance-badge', afterSalesTone]">{{ order.after_sales.status_label }}</text></view>
        <view v-if="order.after_sales" class="finance-row"><text>申请单号</text><text>{{ order.after_sales.case_no }}</text></view>
        <view v-if="order.after_sales" class="finance-row"><text>申请金额</text><strong>¥{{ money(order.after_sales.requested_amount) }}</strong></view>
        <view v-if="order.after_sales?.approved_amount != null" class="finance-row"><text>审核金额</text><strong>¥{{ money(order.after_sales.approved_amount) }}</strong></view>
        <view v-if="latestRefund" class="finance-row"><text>退款状态</text><text :class="['refund-text', refundTone]">{{ latestRefund.status_label }}</text></view>
        <view v-if="latestRefund" class="finance-row"><text>退款金额</text><strong>¥{{ money(latestRefund.refund_amount) }}</strong></view>
        <view v-if="latestRefund?.refunded_at" class="finance-row"><text>到账时间</text><text>{{ formatDateTime(latestRefund.refunded_at) }}</text></view>
        <text v-if="order.after_sales?.result_note" class="finance-tip">{{ order.after_sales.result_note }}</text>
      </section>

      <section class="safety panel">
        <button
          v-if="order.arrival_photo_url"
          class="evidence-row"
          aria-label="查看集合地点照片"
          @tap="previewEvidence"
        >
          <image :src="order.arrival_photo_url" mode="aspectFill" />
          <view>
            <strong>集合地点照片已上传</strong>
            <text>{{ evidenceCopy }}</text>
          </view>
          <b>查看 ›</b>
        </button>
        <button v-else aria-label="集合地点照片尚未上传" @tap="showEvidencePending">
          <i>▣</i>
          <view><strong>集合地点照片待上传</strong><text>{{ pendingEvidenceCopy }}</text></view>
          <b>›</b>
        </button>
        <button aria-label="位置安全说明" @tap="showLocationNotice">
          <i>●</i>
          <view><strong>关键节点位置留存</strong><text>集合照会同时留存上传位置，持续定位后续接入</text></view>
          <b>›</b>
        </button>
        <button aria-label="紧急联系客服" @tap="openSupport('safety_risk')">
          <i>☎</i>
          <view><strong>紧急联系客服</strong><text>如遇紧急情况，请及时联系平台客服</text></view>
          <b>›</b>
        </button>
      </section>
    </view>

    <view v-else class="booking-empty">{{ error || '订单不存在' }}</view>

    <view v-if="reviewVisible" class="review-mask" @tap.self="reviewVisible = false">
      <view class="review-sheet">
        <view class="review-head"><strong>评价本次服务</strong><button @tap="reviewVisible = false">×</button></view>
        <text class="review-tip">评价审核通过后公开展示，帮助其他用户更好地选择达人</text>
        <view class="review-stars">
          <button v-for="star in 5" :key="star" :aria-label="`${star}星`" :class="{ active: star <= reviewRating }" @tap="reviewRating = star">★</button>
        </view>
        <textarea v-model="reviewContent" maxlength="500" placeholder="说说这次服务的感受（选填）" />
        <view class="review-photo-title"><strong>添加图片</strong><text>{{ reviewImages.length }}/3</text></view>
        <view class="review-photos">
          <view v-for="(image, index) in reviewImages" :key="image.id" class="review-photo">
            <image :src="image.url" mode="aspectFill" @tap="previewReviewImage(index)" />
            <button :aria-label="`删除第${index + 1}张图片`" @tap="removeReviewImage(index)">×</button>
          </view>
          <button v-if="reviewImages.length < 3" class="review-photo-add" :disabled="reviewUploading" @tap="chooseReviewImages">
            <strong>{{ reviewUploading ? '…' : '+' }}</strong><text>{{ reviewUploading ? '上传中' : '添加照片' }}</text>
          </button>
        </view>
        <view class="anonymous-row"><view><strong>匿名评价</strong><text>公开展示时隐藏你的昵称</text></view><switch :checked="reviewAnonymous" :color="BRAND_PRIMARY" @change="changeReviewAnonymous" /></view>
        <button class="review-submit" :disabled="reviewSubmitting || reviewUploading" @tap="submitReview">{{ reviewSubmitting ? '提交中…' : '提交评价' }}</button>
      </view>
    </view>

    <footer v-if="order && showActions" class="detail-footer">
      <button v-if="order.status === 'pending_payment'" class="outline" @tap="cancel">取消订单</button>
      <button v-if="order.status === 'pending_payment'" class="primary" @tap="continuePay">继续支付</button>
      <button v-else class="outline" @tap="openAfterSales">{{ supportLabel }}</button>
      <button
        v-if="contactableStatuses.includes(order.status)"
        class="primary"
        @tap="showPending('联系达人')"
      >联系达人</button>
      <button
        v-else-if="order.status === 'pending_confirmation'"
        class="primary"
        :disabled="confirming"
        @tap="confirmCompletion"
      >{{ confirming ? '确认中…' : '确认服务完成' }}</button>
      <button v-else-if="order.status === 'pending_review'" class="primary" @tap="openReview">去评价</button>
    </footer>
  </view>
</template>

<script setup lang="ts">
import { navigateBackOr } from '@/utils/navigation'
import DzNavBar from '@/components/DzNavBar.vue'
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'

import { BRAND_PRIMARY } from '@/utils/brand'

import {
  cancelProviderOrder,
  confirmProviderOrderCompletion,
  getProviderOrder,
  reviewProviderOrder,
  uploadReviewImage,
} from '@/services/orders'
import { orderStatusCopy } from '@/services/orderPresentation'
import { isAuthenticated } from '@/services/session'
import type { ProviderOrder } from '@/types/api'
import { formatActivityTime, formatAmount, formatBusinessDateTime, formatOrderTimeRange, getErrorMessage } from '@/utils/formatters'

const orderNo = ref('')
const order = ref<ProviderOrder | null>(null)
const loading = ref(true)
const confirming = ref(false)
const error = ref('')
const reviewVisible = ref(false)
const reviewRating = ref(5)
const reviewContent = ref('')
const reviewSubmitting = ref(false)
const reviewUploading = ref(false)
const reviewAnonymous = ref(false)
const reviewImages = ref<Array<{ id: string; url: string }>>([])
const steps = ['已支付', '已接单', '待出发', '履约中', '待确认']
const contactableStatuses = ['pending_acceptance', 'pending_service', 'departed', 'in_service']
const statusCopy = computed(() => {
  const copy = orderStatusCopy(order.value?.status || '')
  return order.value?.fulfillment_review_required
    ? { ...copy, description: '履约时间待客服核实，自动确认和分账已暂停。' }
    : copy
})
const showActions = computed(() => Boolean(
  order.value
  && (
    order.value.after_sales
    || (
      !['cancelled', 'refunded'].includes(order.value.status)
      && !(order.value.status === 'completed' && order.value.settlement?.status === 'settled')
    )
  ),
))
const latestRefund = computed(() => order.value?.refund_orders?.[order.value.refund_orders.length - 1] || null)
const paymentTone = computed(() => order.value?.payment_order?.status === 'paid' ? 'success' : order.value?.payment_order?.status === 'refunded' ? 'muted' : 'warning')
const refundTone = computed(() => latestRefund.value?.status === 'succeeded' ? 'success' : latestRefund.value?.status === 'failed' ? 'danger' : 'warning')
const afterSalesTone = computed(() => order.value?.after_sales?.status === 'refunded' ? 'success' : order.value?.after_sales?.status === 'rejected' ? 'danger' : 'warning')
const paymentHint = computed(() => {
  const status = order.value?.payment_order?.status
  if (status === 'pending_payment') return '请在支付有效期内完成支付，逾期后支付单会自动关闭。'
  if (status === 'paid') return '款项已支付，平台会在服务完成后按规则处理结算。'
  if (status === 'partially_refunded') return '支付单已部分退款，退款进度以售后记录为准。'
  if (status === 'refunded') return '支付单已完成退款。'
  return '支付单已关闭。'
})
const supportLabel = computed(() => order.value?.after_sales ? '查看售后进度' : '申请退款/售后')
const money = formatAmount
const addressLabel = computed(() => order.value
  ? [order.value.meeting_location_name, order.value.meeting_address]
    .filter((value, index, values) => value && values.indexOf(value) === index)
    .join('，')
  : '')

const timeLabel = computed(() => {
  if (!order.value) return ''
  return formatOrderTimeRange(order.value.starts_at, order.value.ends_at)
})
const createdLabel = computed(() => order.value
  ? formatBusinessDateTime(order.value.created_at)
  : '')
const evidenceCopy = computed(() => order.value?.arrival_photo_uploaded_at
  ? `${formatDateTime(order.value.arrival_photo_uploaded_at)}，已留存上传位置`
  : '达人已到达集合地点，并留存上传位置')
const pendingEvidenceCopy = computed(() => {
  if (!order.value) return ''
  if (['departed', 'in_service', 'pending_confirmation'].includes(order.value.status)) return '达人到场后将上传照片，请稍后查看'
  return '达人确认出发并到场后上传'
})

function formatDateTime(value: string) {
  return formatActivityTime(value)
}
function goBack() { navigateBackOr(() => uni.reLaunch({ url: '/pages/orders/list' })) }
function showPending(name: string) { uni.showToast({ title: `${name}功能即将接入`, icon: 'none' }) }
function openSupport(reason = 'service_quality') {
  if (!order.value) return
  const title = encodeURIComponent(`${order.value.service_name} · ${order.value.order_no}`)
  uni.navigateTo({
    url: `/pages/support/index?mode=new&caseType=complaint&targetType=provider_order&targetId=${encodeURIComponent(order.value.order_no)}&targetTitle=${title}&reason=${reason}`,
  })
}
const canRewardReport = computed(() => Boolean(
  order.value?.status === 'pending_review'
  && order.value.review_expires_at
  && Date.parse(order.value.review_expires_at) > Date.now(),
))
function openRewardReport() {
  if (order.value) uni.navigateTo({ url: `/pages/report/index?orderNo=${encodeURIComponent(order.value.order_no)}` })
}
function openAfterSales() {
  if (!order.value) return
  uni.navigateTo({
    url: `/pages/orders/after-sales?orderNo=${encodeURIComponent(order.value.order_no)}`,
  })
}
function showEvidencePending() { uni.showToast({ title: '达人上传后可在这里查看', icon: 'none' }) }
function showLocationNotice() {
  uni.showModal({
    title: '位置安全说明',
    content: '当前阶段会在达人上传集合照时留存一次位置。服务中持续定位将在后续阶段接入。',
    showCancel: false,
  })
}
function previewEvidence() {
  if (order.value?.arrival_photo_url) {
    uni.previewImage({ current: order.value.arrival_photo_url, urls: [order.value.arrival_photo_url] })
  }
}
function copyOrderNo() { if (order.value) uni.setClipboardData({ data: order.value.order_no }) }
function continuePay() {
  if (order.value) uni.navigateTo({ url: `/pages/booking/payment?orderNo=${order.value.order_no}` })
}
function cancel() {
  if (!order.value) return
  uni.showModal({
    title: '取消订单',
    content: '取消后将立即释放达人档期。',
    success: async (result) => {
      if (!result.confirm) return
      try {
        order.value = (await cancelProviderOrder(order.value!.order_no)).data
      } catch (reason) {
        uni.showToast({ title: getErrorMessage(reason, '取消失败'), icon: 'none' })
      }
    },
  })
}
function confirmCompletion() {
  if (!order.value || confirming.value) return
  uni.showModal({
    title: '确认服务完成',
    content: '请确认达人已按约定完成本次服务。确认后订单将进入待评价。',
    confirmText: '确认完成',
    success: async (result) => {
      if (!result.confirm || !order.value) return
      confirming.value = true
      try {
        order.value = (await confirmProviderOrderCompletion(order.value.order_no)).data
        uni.showToast({ title: '已确认服务完成', icon: 'success' })
      } catch (reason) {
        uni.showToast({ title: getErrorMessage(reason, '确认失败'), icon: 'none' })
      } finally {
        confirming.value = false
      }
    },
  })
}
function openReview() {
  reviewVisible.value = true
  reviewRating.value = 5
  reviewContent.value = ''
  reviewAnonymous.value = false
  reviewImages.value = []
}
function chooseReviewImages() {
  if (reviewUploading.value) return
  uni.chooseImage({
    count: 3 - reviewImages.value.length,
    sizeType: ['compressed'],
    success: async ({ tempFilePaths, tempFiles }) => {
      reviewUploading.value = true
      try {
        for (let index = 0; index < tempFilePaths.length; index += 1) {
          const selectedFile = Array.isArray(tempFiles) ? tempFiles[index] : tempFiles
          const file = selectedFile && typeof selectedFile === 'object' && 'file' in selectedFile
            ? (selectedFile as { file: unknown }).file
            : selectedFile
          const uploaded = (await uploadReviewImage(tempFilePaths[index], file)).data
          reviewImages.value.push({ id: uploaded.id, url: uploaded.url || tempFilePaths[index] })
        }
      } catch (reason) {
        uni.showToast({ title: getErrorMessage(reason, '图片上传失败'), icon: 'none' })
      } finally {
        reviewUploading.value = false
      }
    },
  })
}
function removeReviewImage(index: number) { reviewImages.value.splice(index, 1) }
function changeReviewAnonymous(event: Event) {
  reviewAnonymous.value = Boolean((event as CustomEvent<{ value: boolean }>).detail.value)
}
function previewReviewImage(index: number) {
  const urls = reviewImages.value.map(image => image.url)
  uni.previewImage({ current: urls[index], urls })
}
async function submitReview() {
  if (!order.value || reviewSubmitting.value) return
  reviewSubmitting.value = true
  try {
    order.value = (await reviewProviderOrder(order.value.order_no, {
      rating: reviewRating.value,
      content: reviewContent.value.trim(),
      image_ids: reviewImages.value.map(image => image.id),
      is_anonymous: reviewAnonymous.value,
    })).data
    reviewVisible.value = false
    uni.showToast({ title: '评价已提交，等待审核', icon: 'none' })
  } catch (reason) {
    uni.showToast({ title: getErrorMessage(reason, '评价提交失败'), icon: 'none' })
  } finally {
    reviewSubmitting.value = false
  }
}
async function load() {
  if (!orderNo.value) return
  loading.value = true
  error.value = ''
  try {
    order.value = (await getProviderOrder(orderNo.value)).data
  } catch (reason) {
    error.value = getErrorMessage(reason)
  } finally {
    loading.value = false
  }
}

onLoad((query) => { orderNo.value = typeof query?.orderNo === 'string' ? query.orderNo : '' })
onShow(() => { if (isAuthenticated()) load() })
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;
@use '../../styles/booking.scss';
.reward-report-link { display: flex; align-items: center; justify-content: space-between; gap: 14rpx; margin-top: 18rpx; padding: 22rpx; }
.reward-report-link view { display: flex; flex-direction: column; gap: 6rpx; }
.reward-report-link strong { font-size: 25rpx; }.reward-report-link text { color: #7a8492; font-size: 20rpx; }
.reward-report-link button { margin: 0; padding: 0 12rpx; border: 0; color: #078f93; background: transparent; font-size: 22rpx; white-space: nowrap; }
.order-detail-page{min-height:100vh;padding-bottom:calc(136rpx + env(safe-area-inset-bottom));background:$dz-surface-page}.page-head{position:relative;display:flex;align-items:flex-end;justify-content:center;height:calc(104rpx + env(safe-area-inset-top));padding:0 24rpx 8rpx;background:$dz-surface-card;box-sizing:border-box}.page-head>button{position:absolute;left:20rpx;bottom:0;width:88rpx;height:88rpx;margin:0;padding:0;border:0;background:transparent;font-size:$dz-fs-price-lg;line-height:88rpx}.page-head button::after,.provider-card button::after,.info-card button::after,.safety button::after,.detail-footer button::after{display:none}.page-head>text{padding-bottom:24rpx;font-size:$dz-fs-body-strong;font-weight:$dz-fw-bold}.page-head>view{position:absolute;right:16rpx;bottom:0;display:flex;align-items:center;justify-content:center;min-width:100rpx;height:88rpx;font-size:$dz-fs-caption}.detail-content{padding:18rpx 24rpx 32rpx}.panel{margin-top:18rpx;border-radius:$dz-radius-md;background:$dz-surface-card;box-shadow:$dz-shadow-card}.status-hero{position:relative;display:flex;align-items:flex-start;min-height:240rpx;padding:28rpx 25rpx;border-radius:$dz-radius-md;background:linear-gradient(135deg,#bff8f5,#d9fbfa);box-sizing:border-box}.clock{display:flex;align-items:center;justify-content:center;width:76rpx;height:76rpx;border:10rpx solid #fff;border-radius:50%;color:$dz-text-inverse;background:$dz-brand-primary;font-size:$dz-fs-title}.status-copy{display:flex;flex-direction:column;margin-left:20rpx}.status-copy strong{color:$dz-status-success-deep;font-size:$dz-fs-title}.status-copy text{margin-top:7rpx;color:#1d686d;font-size:$dz-fs-caption}.progress{position:absolute;right:24rpx;bottom:25rpx;left:24rpx;display:flex}.progress view{position:relative;display:flex;flex:1;flex-direction:column;align-items:center;color:#589095;font-size:$dz-fs-micro}.progress view::before{position:absolute;z-index:0;top:14rpx;right:50%;left:-50%;height:3rpx;background:#bbd7d9;content:''}.progress view:first-child::before{display:none}.progress i{z-index:1;width:28rpx;height:28rpx;border-radius:50%;background:#b7d2d4;color:$dz-text-inverse;font-size:$dz-fs-micro;font-style:normal;line-height:28rpx;text-align:center}.progress .done i,.progress .active i{background:$dz-brand-primary}.progress .done::before,.progress .active::before{background:$dz-brand-primary}.progress text{margin-top:8rpx;font-size:$dz-fs-micro}.provider-card{display:flex;align-items:center;padding:21rpx}.avatar{display:flex;align-items:center;justify-content:center;overflow:hidden;width:112rpx;height:112rpx;border-radius:50%;color:$dz-brand-deep;background:$dz-brand-soft;font-size:$dz-fs-title}.avatar image{width:100%;height:100%}.provider-copy{display:flex;min-width:0;flex:1;flex-direction:column;gap:18rpx;margin-left:20rpx}.provider-copy>view{display:flex;align-items:center;gap:10rpx}.provider-copy strong{font-size:$dz-fs-body-strong}.provider-copy>view text{padding:5rpx 10rpx;border-radius:$dz-radius-sm;color:$dz-brand-deep;background:$dz-brand-soft;font-size:$dz-fs-micro}.provider-copy>text{color:$dz-price-primary;font-size:$dz-fs-caption}.contact-actions{display:flex;flex-direction:column;gap:10rpx}.contact-actions button{height:88rpx;margin:0;padding:0 17rpx;border:1rpx solid $dz-brand-primary;border-radius:$dz-radius-sm;color:$dz-brand-deep;background:$dz-surface-card;font-size:$dz-fs-caption;line-height:88rpx}.info-card{padding:10rpx 22rpx}.info-card>view:not(.map){display:flex;align-items:center;min-height:96rpx;border-bottom:1rpx solid $dz-border-subtle}.info-card>view:last-child{border:0}.info-card>view>i{width:42rpx;color:$dz-brand-deep;font-size:$dz-fs-caption;font-style:normal}.info-card>view>text{font-size:$dz-fs-caption}.info-card>view>strong{flex:1;margin-left:15rpx;text-align:right;font-size:$dz-fs-caption}.info-card>view>strong.muted{color:$dz-text-secondary;font-size:$dz-fs-micro;font-weight:$dz-fw-medium}.info-card>view>button{height:88rpx;margin:0 0 0 12rpx;padding:0 15rpx;border:1rpx solid $dz-brand-primary;border-radius:$dz-radius-sm;color:$dz-brand-deep;background:$dz-surface-card;font-size:$dz-fs-micro;line-height:88rpx}.map{position:relative;overflow:hidden;height:120rpx;border-radius:$dz-radius-sm;background:#edf4eb;background-image:repeating-linear-gradient(25deg,transparent 0 32rpx,#fff 33rpx 38rpx),repeating-linear-gradient(95deg,transparent 0 52rpx,#fff 53rpx 58rpx)}.map .roads{position:absolute;inset:0;background:linear-gradient(18deg,transparent 48%,rgba(255,205,83,.6) 49% 52%,transparent 53%)}.map>i{position:absolute;left:50%;top:50%;color:$dz-brand-deep;font-size:$dz-fs-heading;transform:translate(-50%,-50%)}.fees{padding:20rpx 24rpx}.fees view{display:flex;justify-content:space-between;padding:9rpx 0;font-size:$dz-fs-caption}.fees .discount{color:$dz-price-primary}.fees .total{margin-top:8rpx;padding-top:18rpx;border-top:1rpx dashed $dz-border-subtle;color:$dz-price-primary;font-size:$dz-fs-caption}.total strong{font-size:$dz-fs-heading}.safety{padding:0 20rpx}.safety button{display:flex;align-items:center;width:100%;min-height:96rpx;margin:0;padding:12rpx 0;border:0;border-bottom:1rpx solid $dz-border-subtle;background:$dz-surface-card;text-align:left}.safety button:last-child{border:0}.safety button>i{display:flex;align-items:center;justify-content:center;width:54rpx;height:54rpx;border-radius:50%;color:#ff641d;background:$dz-price-soft;font-size:$dz-fs-caption;font-style:normal}.safety button>image{width:66rpx;height:66rpx;flex:none;border-radius:$dz-radius-sm}.safety button>view{display:flex;min-width:0;flex:1;flex-direction:column;gap:6rpx;margin-left:17rpx}.safety strong{font-size:$dz-fs-caption}.safety text{color:$dz-text-secondary;font-size:$dz-fs-micro}.safety b{color:$dz-text-tertiary;font-size:$dz-fs-caption}.safety .evidence-row b{color:$dz-brand-deep;font-size:$dz-fs-micro}.detail-footer{position:fixed;z-index:20;right:0;bottom:0;left:0;display:flex;gap:14rpx;max-width:750px;height:calc(124rpx + env(safe-area-inset-bottom));margin:auto;padding:18rpx 24rpx env(safe-area-inset-bottom);background:$dz-surface-card;box-shadow:$dz-shadow-floating;box-sizing:border-box}.detail-footer button{flex:1;height:88rpx;margin:0;border-radius:$dz-radius-full;font-size:$dz-fs-caption;line-height:88rpx}.detail-footer button:active{opacity:.78;transform:scale(.99)}.detail-footer button[disabled]{opacity:.55}.detail-footer .outline{border:1rpx solid $dz-price-primary;color:$dz-price-primary;background:$dz-surface-card}.detail-footer .primary{border:0;color:$dz-text-inverse;background:$dz-gradient-price}
.review-mask{position:fixed;z-index:50;inset:0;display:flex;align-items:flex-end;background:rgba(15,31,35,.45)}.review-sheet{width:100%;max-height:88vh;overflow-y:auto;padding:30rpx 28rpx calc(28rpx + env(safe-area-inset-bottom));border-radius:$dz-radius-lg 30rpx 0 0;background:$dz-surface-card;box-sizing:border-box}.review-head{display:flex;align-items:center;justify-content:space-between}.review-head strong{font-size:$dz-fs-body-strong}.review-head button{width:72rpx;height:72rpx;margin:-8rpx -8rpx 0 0;padding:0;border:0;color:$dz-text-tertiary;background:transparent;font-size:$dz-fs-title;line-height:72rpx}.review-tip{display:block;margin-top:10rpx;color:$dz-text-secondary;font-size:$dz-fs-caption}.review-stars{display:flex;justify-content:center;gap:12rpx;margin:22rpx 0}.review-stars button{display:flex;align-items:center;justify-content:center;width:72rpx;height:72rpx;margin:0;padding:0;border:0;color:#d9e2e2;background:transparent;font-size:54rpx;line-height:1}.review-stars button::after,.review-photo button::after,.review-photo-add::after,.review-submit::after{display:none}.review-stars button.active{color:$dz-status-warning}.review-sheet textarea{width:100%;height:170rpx;padding:20rpx;border:1rpx solid $dz-border-subtle;border-radius:$dz-radius-sm;background:$dz-surface-page;font-size:$dz-fs-caption;box-sizing:border-box}.review-photo-title{display:flex;justify-content:space-between;margin-top:22rpx;font-size:$dz-fs-caption}.review-photo-title text{color:$dz-text-tertiary}.review-photos{display:flex;gap:14rpx;margin-top:14rpx}.review-photo,.review-photo-add{position:relative;width:132rpx;height:132rpx;border-radius:$dz-radius-sm}.review-photo{overflow:visible}.review-photo image{width:100%;height:100%;border-radius:$dz-radius-sm}.review-photo button{position:absolute;right:-10rpx;top:-10rpx;width:44rpx;height:44rpx;margin:0;padding:0;border:2rpx solid #fff;border-radius:50%;color:$dz-text-inverse;background:rgba(22,35,39,.78);font-size:$dz-fs-body;line-height:40rpx}.review-photo-add{display:flex;flex-direction:column;align-items:center;justify-content:center;margin:0;padding:0;border:2rpx dashed #b8d7d8;color:$dz-text-secondary;background:#f4fbfb;line-height:1}.review-photo-add strong{font-size:$dz-fs-title;font-weight:$dz-fw-regular}.review-photo-add text{margin-top:8rpx;font-size:$dz-fs-micro}.anonymous-row{display:flex;align-items:center;justify-content:space-between;min-height:92rpx;margin-top:16rpx}.anonymous-row>view{display:flex;flex-direction:column;gap:6rpx}.anonymous-row strong{font-size:$dz-fs-caption}.anonymous-row text{color:$dz-text-tertiary;font-size:$dz-fs-micro}.review-submit{width:100%;height:88rpx;margin-top:14rpx;border:0;border-radius:$dz-radius-full;color:$dz-text-inverse;background:$dz-gradient-price;font-size:$dz-fs-caption;line-height:88rpx}.review-submit[disabled]{opacity:.55}
.finance-panel{padding:20rpx 24rpx}.finance-head{display:flex;align-items:center;justify-content:space-between;padding-bottom:14rpx;border-bottom:1rpx solid $dz-border-subtle}.finance-head strong{font-size:$dz-fs-caption}.finance-badge{padding:7rpx 14rpx;border-radius:$dz-radius-sm;color:$dz-status-warning-deep;background:$dz-status-warning-soft;font-size:$dz-fs-micro}.finance-badge.success{color:$dz-status-success-deep;background:$dz-brand-soft}.finance-badge.muted{color:$dz-text-secondary;background:$dz-surface-page}.finance-badge.danger{color:$dz-status-danger-deep;background:$dz-price-soft}.finance-row{display:flex;align-items:center;justify-content:space-between;min-height:58rpx;color:$dz-text-secondary;font-size:$dz-fs-caption}.finance-row>strong{color:$dz-price-primary;font-size:$dz-fs-caption}.finance-row>text:last-child{max-width:68%;overflow:hidden;text-align:right;text-overflow:ellipsis;white-space:nowrap}.finance-tip{display:block;margin-top:10rpx;color:$dz-text-tertiary;font-size:$dz-fs-micro;line-height:1.5}.refund-text.success{color:$dz-status-success-deep}.refund-text.warning{color:$dz-status-warning-deep}.refund-text.danger{color:$dz-status-danger-deep}
</style>
