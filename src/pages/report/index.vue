<template>
  <view class="dz-page report-page">
    <header class="page-head"><button @tap="goBack">‹</button><strong>举报有奖</strong></header>
    <scroll-view scroll-y class="report-content">
      <section class="rules-card">
        <strong class="rules-heading">维护真实、安全的服务体验</strong>
        <text>订单确认完成后，在待评价期内提交举报。请关联本人订单，填写经过并上传至少一张证据图片。平台核实成立后发放优惠券。</text>
        <view v-if="rules" class="reward-box">
          <b>¥{{ money(rules.coupon_amount) }}</b>
          <span>奖励优惠券</span>
          <small>达人服务订单原价大于 ¥{{ money(rules.coupon_min_order_amount) }} 可用，有效期 {{ rules.coupon_valid_days }} 天</small>
        </view>
        <text v-if="rules">待评价期限为 {{ rules.review_timeout_days }} 天；过期、已评价或已举报的订单不可关联。最终是否发券以客服核查结果为准。</text>
      </section>

      <section class="form-card">
        <strong class="field-heading">关联订单 <em>必选</em></strong>
        <view v-if="loading" class="empty">正在加载可举报订单…</view>
        <view v-else-if="!rules?.eligible_orders.length" class="empty">暂无可关联订单。仅显示待评价期限内的本人订单。</view>
        <button v-for="order in rules?.eligible_orders || []" :key="order.order_no" class="order-option" :class="{ active: orderNo === order.order_no }" @tap="orderNo = order.order_no">
          <view><b>{{ order.service_name }} · {{ order.provider_name }}</b><text>{{ order.order_no }}</text><small>评价截止：{{ order.review_expires_at.slice(0, 16).replace('T', ' ') }}</small></view>
          <i>{{ orderNo === order.order_no ? '✓' : '' }}</i>
        </button>
        <text v-if="attempted && !orderNo" class="error">请选择待评价订单</text>
      </section>

      <section class="form-card">
        <strong class="field-heading">举报问题 <em>必选</em></strong>
        <view class="reason-options"><button v-for="item in reasons" :key="item.value" :class="{ active: reason === item.value }" @tap="reason = item.value">{{ item.label }}</button></view>
        <strong class="field-heading">问题描述 <em>必填</em></strong>
        <textarea v-model="description" maxlength="1000" placeholder="请说明发生时间、地点、具体经过和希望平台核查的事项" />
        <text v-if="attempted && description.trim().length < 5" class="error">问题描述至少填写 5 个字</text>
        <strong class="field-heading">证据图片 <em>至少 1 张</em></strong>
        <view class="uploads">
          <view v-for="(item, index) in uploads" :key="item.id" class="upload-item"><image :src="item.url" mode="aspectFill" /><button @tap="uploads.splice(index, 1)">×</button></view>
          <button v-if="uploads.length < 3" class="upload-add" :disabled="uploading" @tap="chooseImages">{{ uploading ? '上传中' : '＋ 添加图片' }}</button>
        </view>
        <text v-if="attempted && !uploads.length" class="error">至少上传一张证据图片</text>
      </section>
    </scroll-view>
    <footer><button :disabled="submitting || uploading || loading" @tap="submit">{{ submitting ? '提交中…' : '提交举报' }}</button></footer>
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { createSupportCase, getRewardReportRules, uploadSupportAttachment } from '@/services/support'
import type { RewardReportRules } from '@/services/support'
import type { SupportCaseReason } from '@/types/api'
import { formatAmount, getErrorMessage } from '@/utils/formatters'

const money = formatAmount
const reasons: Array<{ value: SupportCaseReason; label: string }> = [
  { value: 'service_quality', label: '服务质量' },
  { value: 'false_information', label: '虚假信息' },
  { value: 'private_transaction', label: '诱导私下交易' },
  { value: 'safety_risk', label: '安全风险' },
  { value: 'other', label: '其他问题' },
]
const rules = ref<RewardReportRules | null>(null)
const orderNo = ref('')
const reason = ref<SupportCaseReason>('service_quality')
const description = ref('')
const uploads = ref<Array<{ id: string; url: string }>>([])
const loading = ref(true)
const uploading = ref(false)
const submitting = ref(false)
const attempted = ref(false)
function goBack() { uni.navigateBack() }

function chooseImages() {
  if (uploading.value || uploads.value.length >= 3) return
  uni.chooseImage({
    count: 3 - uploads.value.length, sizeType: ['compressed'], sourceType: ['album', 'camera'],
    success: async ({ tempFilePaths, tempFiles }) => {
      uploading.value = true
      try {
        for (let index = 0; index < tempFilePaths.length; index += 1) {
          const selectedFile = Array.isArray(tempFiles) ? tempFiles[index] : tempFiles
          const file = selectedFile && typeof selectedFile === 'object' && 'file' in selectedFile
            ? (selectedFile as { file: unknown }).file : selectedFile
          uploads.value.push((await uploadSupportAttachment(tempFilePaths[index], file)).data)
        }
      } catch (error) { uni.showToast({ title: getErrorMessage(error, '图片上传失败'), icon: 'none' }) }
      finally { uploading.value = false }
    },
  })
}

async function submit() {
  attempted.value = true
  if (!orderNo.value || description.value.trim().length < 5 || !uploads.value.length || submitting.value) return
  submitting.value = true
  try {
    const response = await createSupportCase({
      case_type: 'report', target_type: 'provider_order', target_id: orderNo.value,
      reason: reason.value, description: description.value.trim(),
      attachment_ids: uploads.value.map((item) => item.id), reward_eligible: true,
    })
    uni.showToast({ title: '举报已提交，等待平台核查', icon: 'success' })
    setTimeout(() => uni.redirectTo({ url: `/pages/support/index?caseNo=${response.data.case_no}` }), 800)
  } catch (error) { uni.showToast({ title: getErrorMessage(error, '举报提交失败'), icon: 'none' }) }
  finally { submitting.value = false }
}

onLoad(async (query) => {
  try {
    rules.value = (await getRewardReportRules()).data
    const prefill = typeof query?.orderNo === 'string' ? query.orderNo : ''
    if (rules.value.eligible_orders.some((item) => item.order_no === prefill)) orderNo.value = prefill
  } catch (error) { uni.showToast({ title: getErrorMessage(error, '规则加载失败'), icon: 'none' }) }
  finally { loading.value = false }
})
</script>

<style scoped lang="scss">
.report-page { min-height: 100vh; background: #f5f7f8; padding-bottom: 110rpx; }
.page-head { height: 100rpx; display: flex; align-items: center; justify-content: center; background: #fff; }
.page-head button { position: absolute; left: 18rpx; border: 0; background: transparent; font-size: 48rpx; }
.page-head strong { font-size: 32rpx; }
.report-content { height: calc(100vh - 210rpx); }
.rules-card, .form-card { display: flex; flex-direction: column; gap: 16rpx; margin: 20rpx 24rpx; padding: 24rpx; border-radius: 16rpx; background: #fff; }
.rules-card { background: linear-gradient(135deg, #e5faf9, #fff); }
.rules-heading { font-size: 32rpx; }
.rules-card > text, .reward-box small { color: #65727e; font-size: 23rpx; line-height: 1.6; }
.reward-box { display: flex; align-items: center; gap: 12rpx; padding: 18rpx; background: #fff; border-radius: 12rpx; }
.reward-box b { color: #ee7045; font-size: 44rpx; }.reward-box span { font-weight: 600; }
.reward-box small { flex: 1; text-align: right; }
.field-heading { font-size: 28rpx; }.form-card em { color: #e75a52; font-size: 22rpx; font-style: normal; }
.order-option { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 18rpx; border: 1rpx solid #e4e9eb; border-radius: 10rpx; background: #fff; text-align: left; }
.order-option.active { border-color: #08b5ba; background: #f0fbfb; }.order-option view { display: flex; flex-direction: column; gap: 7rpx; }
.order-option b { font-size: 25rpx; }.order-option text,.order-option small,.empty { color: #7a8492; font-size: 21rpx; }.order-option i { color: #08b5ba; }
.reason-options { display: flex; flex-wrap: wrap; gap: 10rpx; }.reason-options button { margin: 0; padding: 0 18rpx; border: 1rpx solid #e4e9eb; border-radius: 25rpx; background: #fff; font-size: 22rpx; }.reason-options button.active { color: #078f93; border-color: #08b5ba; background: #f0fbfb; }
textarea { width: 100%; min-height: 180rpx; padding: 15rpx; box-sizing: border-box; border: 1rpx solid #e4e9eb; border-radius: 10rpx; font-size: 24rpx; }
.uploads { display: flex; gap: 12rpx; }.upload-item { position: relative; width: 140rpx; height: 140rpx; }.upload-item image { width: 100%; height: 100%; border-radius: 10rpx; }.upload-item button { position: absolute; top: -10rpx; right: -10rpx; width: 34rpx; height: 34rpx; padding: 0; border: 0; border-radius: 50%; color: #fff; background: #e75a52; line-height: 34rpx; }.upload-add { width: 140rpx; height: 140rpx; margin: 0; border: 1rpx dashed #a8bfc0; border-radius: 10rpx; background: #f5fbfb; font-size: 22rpx; }
.error { color: #e75a52; font-size: 21rpx; }
footer { position: fixed; bottom: 0; left: 0; right: 0; padding: 16rpx 24rpx 30rpx; background: #fff; }footer button { width: 100%; height: 76rpx; border: 0; border-radius: 40rpx; color: #fff; background: #08b5ba; font-size: 28rpx; }footer button[disabled] { opacity: .5; }
</style>
