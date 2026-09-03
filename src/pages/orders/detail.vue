<template>
  <view class="dz-page order-detail-page">
    <header class="page-head">
      <button aria-label="返回" @tap="goBack">‹</button>
      <text>订单详情</text>
      <view role="button" aria-label="联系平台客服" @tap="showPending('客服')">♧ 客服</view>
    </header>

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
      </section>

      <section class="fees panel">
        <view><text>服务费</text><text>¥{{ money(order.service_fee_amount) }}</text></view>
        <view><text>交通费</text><text>¥{{ money(order.transport_fee_amount) }}</text></view>
        <view><text>优惠券</text><text class="discount">−¥{{ money(order.discount_amount) }}</text></view>
        <view class="total"><text>{{ order.paid_at ? '实付' : '应付' }}</text><strong>¥{{ money(order.payable_amount) }}</strong></view>
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
        <button aria-label="紧急联系客服" @tap="showPending('紧急客服')">
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
        <text class="review-tip">你的评价会帮助其他用户更好地选择达人</text>
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
        <view class="anonymous-row"><view><strong>匿名评价</strong><text>公开展示时隐藏你的昵称</text></view><switch :checked="reviewAnonymous" color="#18c7c6" @change="changeReviewAnonymous" /></view>
        <button class="review-submit" :disabled="reviewSubmitting || reviewUploading" @tap="submitReview">{{ reviewSubmitting ? '提交中…' : '提交评价' }}</button>
      </view>
    </view>

    <footer v-if="order && showActions" class="detail-footer">
      <button v-if="order.status === 'pending_payment'" class="outline" @tap="cancel">取消订单</button>
      <button v-if="order.status === 'pending_payment'" class="primary" @tap="continuePay">继续支付</button>
      <button v-else class="outline" @tap="showPending('联系客服')">联系客服</button>
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
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'

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
import { formatAmount, getErrorMessage } from '@/utils/formatters'

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
const statusCopy = computed(() => orderStatusCopy(order.value?.status || ''))
const showActions = computed(() => order.value && !['completed', 'cancelled', 'refunded'].includes(order.value.status))
const money = formatAmount
const addressLabel = computed(() => order.value
  ? [order.value.meeting_location_name, order.value.meeting_address]
    .filter((value, index, values) => value && values.indexOf(value) === index)
    .join('，')
  : '')

const timeLabel = computed(() => {
  if (!order.value) return ''
  const start = new Date(order.value.starts_at)
  const end = new Date(order.value.ends_at)
  return `${twoDigits(start.getMonth() + 1)}月${twoDigits(start.getDate())}日 ${twoDigits(start.getHours())}:${twoDigits(start.getMinutes())}—${twoDigits(end.getHours())}:${twoDigits(end.getMinutes())}`
})
const createdLabel = computed(() => order.value
  ? new Date(order.value.created_at).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  })
  : '')
const evidenceCopy = computed(() => order.value?.arrival_photo_uploaded_at
  ? `${formatDateTime(order.value.arrival_photo_uploaded_at)}，已留存上传位置`
  : '达人已到达集合地点，并留存上传位置')
const pendingEvidenceCopy = computed(() => {
  if (!order.value) return ''
  if (['departed', 'in_service', 'pending_confirmation'].includes(order.value.status)) return '达人到场后将上传照片，请稍后查看'
  return '达人确认出发并到场后上传'
})

function twoDigits(value: number) { return String(value).padStart(2, '0') }
function formatDateTime(value: string) {
  const date = new Date(value)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`
}
function goBack() { uni.navigateBack() }
function showPending(name: string) { uni.showToast({ title: `${name}功能即将接入`, icon: 'none' }) }
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
    uni.showToast({ title: '评价已提交', icon: 'success' })
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
@use '../../styles/tokens.scss' as *; @use '../../styles/booking.scss';
.order-detail-page{min-height:100vh;padding-bottom:calc(136rpx + env(safe-area-inset-bottom));background:#f6fafb}.page-head{position:relative;display:flex;align-items:flex-end;justify-content:center;height:calc(104rpx + env(safe-area-inset-top));padding:0 24rpx 8rpx;background:#fff;box-sizing:border-box}.page-head>button{position:absolute;left:20rpx;bottom:0;width:88rpx;height:88rpx;margin:0;padding:0;border:0;background:transparent;font-size:50rpx;line-height:88rpx}.page-head button::after,.provider-card button::after,.info-card button::after,.safety button::after,.detail-footer button::after{display:none}.page-head>text{padding-bottom:24rpx;font-size:31rpx;font-weight:700}.page-head>view{position:absolute;right:16rpx;bottom:0;display:flex;align-items:center;justify-content:center;min-width:100rpx;height:88rpx;font-size:21rpx}.detail-content{padding:18rpx 24rpx 32rpx}.panel{margin-top:18rpx;border-radius:23rpx;background:#fff;box-shadow:$dz-shadow-card}.status-hero{position:relative;display:flex;align-items:flex-start;min-height:240rpx;padding:28rpx 25rpx;border-radius:24rpx;background:linear-gradient(135deg,#bff8f5,#d9fbfa);box-sizing:border-box}.clock{display:flex;align-items:center;justify-content:center;width:76rpx;height:76rpx;border:10rpx solid #fff;border-radius:50%;color:#fff;background:$dz-brand-primary;font-size:38rpx}.status-copy{display:flex;flex-direction:column;margin-left:20rpx}.status-copy strong{color:#087e84;font-size:38rpx}.status-copy text{margin-top:7rpx;color:#1d686d;font-size:21rpx}.progress{position:absolute;right:24rpx;bottom:25rpx;left:24rpx;display:flex}.progress view{position:relative;display:flex;flex:1;flex-direction:column;align-items:center;color:#589095;font-size:16rpx}.progress view::before{position:absolute;z-index:0;top:14rpx;right:50%;left:-50%;height:3rpx;background:#bbd7d9;content:''}.progress view:first-child::before{display:none}.progress i{z-index:1;width:28rpx;height:28rpx;border-radius:50%;background:#b7d2d4;color:#fff;font-size:16rpx;font-style:normal;line-height:28rpx;text-align:center}.progress .done i,.progress .active i{background:$dz-brand-primary}.progress .done::before,.progress .active::before{background:$dz-brand-primary}.progress text{margin-top:8rpx;font-size:16rpx}.provider-card{display:flex;align-items:center;padding:21rpx}.avatar{display:flex;align-items:center;justify-content:center;overflow:hidden;width:112rpx;height:112rpx;border-radius:50%;color:$dz-brand-deep;background:$dz-brand-soft;font-size:38rpx}.avatar image{width:100%;height:100%}.provider-copy{display:flex;min-width:0;flex:1;flex-direction:column;gap:18rpx;margin-left:20rpx}.provider-copy>view{display:flex;align-items:center;gap:10rpx}.provider-copy strong{font-size:29rpx}.provider-copy>view text{padding:5rpx 10rpx;border-radius:9rpx;color:$dz-brand-deep;background:$dz-brand-soft;font-size:18rpx}.provider-copy>text{color:$dz-price-primary;font-size:21rpx}.contact-actions{display:flex;flex-direction:column;gap:10rpx}.contact-actions button{height:88rpx;margin:0;padding:0 17rpx;border:1rpx solid $dz-brand-primary;border-radius:18rpx;color:$dz-brand-deep;background:#fff;font-size:19rpx;line-height:88rpx}.info-card{padding:10rpx 22rpx}.info-card>view:not(.map){display:flex;align-items:center;min-height:96rpx;border-bottom:1rpx solid $dz-border-subtle}.info-card>view:last-child{border:0}.info-card>view>i{width:42rpx;color:$dz-brand-deep;font-size:25rpx;font-style:normal}.info-card>view>text{font-size:21rpx}.info-card>view>strong{flex:1;margin-left:15rpx;text-align:right;font-size:21rpx}.info-card>view>strong.muted{color:$dz-text-secondary;font-size:18rpx;font-weight:500}.info-card>view>button{height:88rpx;margin:0 0 0 12rpx;padding:0 15rpx;border:1rpx solid $dz-brand-primary;border-radius:14rpx;color:$dz-brand-deep;background:#fff;font-size:18rpx;line-height:88rpx}.map{position:relative;overflow:hidden;height:120rpx;border-radius:15rpx;background:#edf4eb;background-image:repeating-linear-gradient(25deg,transparent 0 32rpx,#fff 33rpx 38rpx),repeating-linear-gradient(95deg,transparent 0 52rpx,#fff 53rpx 58rpx)}.map .roads{position:absolute;inset:0;background:linear-gradient(18deg,transparent 48%,rgba(255,205,83,.6) 49% 52%,transparent 53%)}.map>i{position:absolute;left:50%;top:50%;color:$dz-brand-deep;font-size:36rpx;transform:translate(-50%,-50%)}.fees{padding:20rpx 24rpx}.fees view{display:flex;justify-content:space-between;padding:9rpx 0;font-size:21rpx}.fees .discount{color:$dz-price-primary}.fees .total{margin-top:8rpx;padding-top:18rpx;border-top:1rpx dashed $dz-border-subtle;color:$dz-price-primary;font-size:25rpx}.total strong{font-size:34rpx}.safety{padding:0 20rpx}.safety button{display:flex;align-items:center;width:100%;min-height:96rpx;margin:0;padding:12rpx 0;border:0;border-bottom:1rpx solid $dz-border-subtle;background:#fff;text-align:left}.safety button:last-child{border:0}.safety button>i{display:flex;align-items:center;justify-content:center;width:54rpx;height:54rpx;border-radius:50%;color:#ff641d;background:$dz-price-soft;font-size:24rpx;font-style:normal}.safety button>image{width:66rpx;height:66rpx;flex:none;border-radius:13rpx}.safety button>view{display:flex;min-width:0;flex:1;flex-direction:column;gap:6rpx;margin-left:17rpx}.safety strong{font-size:22rpx}.safety text{color:$dz-text-secondary;font-size:18rpx}.safety b{color:$dz-text-tertiary;font-size:24rpx}.safety .evidence-row b{color:$dz-brand-deep;font-size:18rpx}.detail-footer{position:fixed;z-index:20;right:0;bottom:0;left:0;display:flex;gap:14rpx;max-width:750px;height:calc(124rpx + env(safe-area-inset-bottom));margin:auto;padding:18rpx 24rpx env(safe-area-inset-bottom);background:#fff;box-shadow:0 -5rpx 20rpx rgba(31,65,72,.08);box-sizing:border-box}.detail-footer button{flex:1;height:88rpx;margin:0;border-radius:44rpx;font-size:25rpx;line-height:88rpx}.detail-footer button:active{opacity:.78;transform:scale(.99)}.detail-footer button[disabled]{opacity:.55}.detail-footer .outline{border:1rpx solid $dz-price-primary;color:$dz-price-primary;background:#fff}.detail-footer .primary{border:0;color:#fff;background:linear-gradient(135deg,#ff8533,#ff500c)}
.review-mask{position:fixed;z-index:50;inset:0;display:flex;align-items:flex-end;background:rgba(15,31,35,.45)}.review-sheet{width:100%;max-height:88vh;overflow-y:auto;padding:30rpx 28rpx calc(28rpx + env(safe-area-inset-bottom));border-radius:30rpx 30rpx 0 0;background:#fff;box-sizing:border-box}.review-head{display:flex;align-items:center;justify-content:space-between}.review-head strong{font-size:30rpx}.review-head button{width:72rpx;height:72rpx;margin:-8rpx -8rpx 0 0;padding:0;border:0;color:$dz-text-tertiary;background:transparent;font-size:42rpx;line-height:72rpx}.review-tip{display:block;margin-top:10rpx;color:$dz-text-secondary;font-size:19rpx}.review-stars{display:flex;justify-content:center;gap:12rpx;margin:22rpx 0}.review-stars button{display:flex;align-items:center;justify-content:center;width:72rpx;height:72rpx;margin:0;padding:0;border:0;color:#d9e2e2;background:transparent;font-size:54rpx;line-height:1}.review-stars button::after,.review-photo button::after,.review-photo-add::after,.review-submit::after{display:none}.review-stars button.active{color:#ffad1f}.review-sheet textarea{width:100%;height:170rpx;padding:20rpx;border:1rpx solid $dz-border-subtle;border-radius:18rpx;background:#f8fbfb;font-size:21rpx;box-sizing:border-box}.review-photo-title{display:flex;justify-content:space-between;margin-top:22rpx;font-size:21rpx}.review-photo-title text{color:$dz-text-tertiary}.review-photos{display:flex;gap:14rpx;margin-top:14rpx}.review-photo,.review-photo-add{position:relative;width:132rpx;height:132rpx;border-radius:16rpx}.review-photo{overflow:visible}.review-photo image{width:100%;height:100%;border-radius:16rpx}.review-photo button{position:absolute;right:-10rpx;top:-10rpx;width:44rpx;height:44rpx;margin:0;padding:0;border:2rpx solid #fff;border-radius:50%;color:#fff;background:rgba(22,35,39,.78);font-size:27rpx;line-height:40rpx}.review-photo-add{display:flex;flex-direction:column;align-items:center;justify-content:center;margin:0;padding:0;border:2rpx dashed #b8d7d8;color:$dz-text-secondary;background:#f4fbfb;line-height:1}.review-photo-add strong{font-size:38rpx;font-weight:400}.review-photo-add text{margin-top:8rpx;font-size:18rpx}.anonymous-row{display:flex;align-items:center;justify-content:space-between;min-height:92rpx;margin-top:16rpx}.anonymous-row>view{display:flex;flex-direction:column;gap:6rpx}.anonymous-row strong{font-size:22rpx}.anonymous-row text{color:$dz-text-tertiary;font-size:18rpx}.review-submit{width:100%;height:88rpx;margin-top:14rpx;border:0;border-radius:44rpx;color:#fff;background:linear-gradient(135deg,#ff8533,#ff500c);font-size:24rpx;line-height:88rpx}.review-submit[disabled]{opacity:.55}
</style>
