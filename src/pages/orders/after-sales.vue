<template>
  <view class="dz-page after-sales-page">
    <DzNavBar title="退款 / 售后" :back-action="goBack" />

    <view v-if="loading" class="state">正在加载售后信息…</view>
    <view v-else-if="error" class="state error-state">
      <text>{{ error }}</text>
      <button @tap="load">重新加载</button>
    </view>

    <main v-else-if="order" class="content">
      <section class="order-summary panel">
        <view class="summary-head">
          <view class="avatar">
            <image v-if="order.provider_avatar_url" :src="order.provider_avatar_url" mode="aspectFill" />
            <text v-else>{{ order.provider_name.slice(0, 1) }}</text>
          </view>
          <view class="summary-copy">
            <strong>{{ order.provider_name }} · {{ order.service_name }}</strong>
            <text>{{ formatDateTime(order.starts_at) }}</text>
            <small>订单号 {{ order.order_no }}</small>
          </view>
        </view>
        <view class="amount-line"><text>订单实付</text><strong>¥{{ money(order.payable_amount) }}</strong></view>
        <view class="amount-line subtle"><text>当前可退</text><strong>¥{{ money(refundableAmount) }}</strong></view>
      </section>

      <section v-if="latestCase && !creatingAnother" class="case-card panel">
        <view class="case-head">
          <view><small>售后单 {{ latestCase.case_no }}</small><strong>{{ latestCase.case_type_label }}</strong></view>
          <text :class="latestCase.status">{{ latestCase.status_label }}</text>
        </view>
        <view class="progress-list">
          <view class="progress-item done"><i /><view><strong>申请已提交</strong><text>{{ formatDateTime(latestCase.created_at) }}</text></view></view>
          <view class="progress-item" :class="{ done: latestCase.status !== 'pending' }"><i /><view><strong>平台处理中</strong><text>{{ latestCase.status === 'pending' ? '客服将尽快受理' : latestCase.status_label }}</text></view></view>
          <view class="progress-item" :class="{ done: ['refunded', 'rejected'].includes(latestCase.status) }"><i /><view><strong>处理完成</strong><text>{{ latestCase.result_note || '处理结果将通过消息通知' }}</text></view></view>
        </view>
        <view class="case-detail"><text>申请金额</text><strong>¥{{ money(latestCase.requested_amount) }}</strong></view>
        <view v-if="latestCase.approved_amount != null" class="case-detail"><text>核准金额</text><strong>¥{{ money(latestCase.approved_amount) }}</strong></view>
        <view v-if="latestCase.refund_order" class="refund-result">
          <strong>{{ latestCase.refund_order.status_label }}</strong>
          <text>退款 ¥{{ money(latestCase.refund_order.refund_amount) }} · {{ latestCase.refund_order.refund_no }}</text>
        </view>
        <view class="reason-copy"><small>申请说明</small><text>{{ latestCase.reason }}</text></view>
        <view v-if="latestCase.evidence_urls.length" class="evidence-preview">
          <image v-for="(url, index) in latestCase.evidence_urls" :key="url" :src="url" mode="aspectFill" @tap="previewCaseEvidence(index)" />
        </view>
        <button v-if="canReapply" class="reapply-button" @tap="startNewApplication">再次申请剩余金额</button>
      </section>

      <template v-else>
        <section class="form-card panel">
          <label class="section-title">售后类型</label>
          <view class="type-grid">
            <button v-for="item in caseTypes" :key="item.value" :class="{ active: caseType === item.value }" @tap="selectCaseType(item.value)">
              <strong>{{ item.label }}</strong><text>{{ item.hint }}</text>
            </button>
          </view>
        </section>

        <section class="form-card panel">
          <view class="field-head"><label for="refund-amount">申请退款金额</label><text>最多 ¥{{ money(refundableAmount) }}</text></view>
          <view class="amount-input" :class="{ invalid: amountError }"><text>¥</text><input id="refund-amount" v-model="amountText" type="digit" inputmode="decimal" placeholder="0.00" aria-label="申请退款金额" @blur="validateAmount" /></view>
          <text v-if="amountError" class="field-error">{{ amountError }}</text>
          <text v-else class="field-help">请填写希望平台审核退回的金额，最低 0.01 元。</text>
        </section>

        <section class="form-card panel">
          <view class="field-head"><label for="after-sales-reason">问题说明</label><text>{{ reason.length }}/1000</text></view>
          <textarea id="after-sales-reason" v-model="reason" :class="{ invalid: reasonTouched && reason.trim().length < 5 }" maxlength="1000" placeholder="请说明发生时间、实际情况和希望平台如何处理" aria-label="售后问题说明" @blur="reasonTouched = true" />
          <text v-if="reasonTouched && reason.trim().length < 5" class="field-error">请至少填写 5 个字，方便客服判断。</text>
        </section>

        <section class="form-card panel">
          <view class="field-head"><label>证明材料</label><text>{{ uploads.length }}/3</text></view>
          <text class="field-help">可上传聊天记录、现场照片等，单张图片请勿包含无关隐私。</text>
          <view class="upload-list">
            <view v-for="(image, index) in uploads" :key="image.id" class="upload-item">
              <image :src="image.url" mode="aspectFill" @tap="previewUploads(index)" />
              <button :aria-label="`删除第${index + 1}张凭证`" @tap="removeUpload(index)">×</button>
            </view>
            <button v-if="uploads.length < 3" class="upload-add" :disabled="uploading" @tap="chooseImages">
              <strong>{{ uploading ? '上传中…' : '添加凭证' }}</strong><text>最多 3 张</text>
            </button>
          </view>
        </section>

        <section class="notice" :class="{ settled: order.settlement?.status === 'settled' }">
          <strong>提交后会发生什么</strong>
          <text v-if="order.settlement?.status === 'settled'">该订单资金已经结算，暂不能在线申请退款，请通过订单详情联系平台客服。</text>
          <text v-else>订单将进入售后状态，待结算款项会暂停结算。客服核查后会通过消息中心告知处理结果。</text>
        </section>
      </template>
    </main>

    <footer v-if="order && (!latestCase || creatingAnother)" class="submit-footer">
      <button :class="{ blocked: reasonTouched && !canSubmit && !submitting && !uploading && order.settlement?.status !== 'settled' }" :disabled="submitting || uploading || order.settlement?.status === 'settled'" @tap="submit">{{ submitting ? '正在提交…' : '确认提交售后申请' }}</button>
    </footer>
  </view>
</template>

<script setup lang="ts">
import { navigateBackOr } from '@/utils/navigation'
import DzNavBar from '@/components/DzNavBar.vue'
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

import {
  createProviderOrderAfterSales,
  getProviderOrder,
  getProviderOrderAfterSales,
  uploadProviderOrderAfterSalesEvidence,
} from '@/services/orders'
import type { ProviderOrder, ProviderOrderAfterSalesCase, ProviderOrderAfterSalesCreateType } from '@/types/api'
import { formatAmount, formatBusinessDateTime, getErrorMessage } from '@/utils/formatters'

type CaseType = ProviderOrderAfterSalesCreateType
type UploadItem = { id: string; url: string }

const caseTypes: Array<{ value: CaseType; label: string; hint: string }> = [
  { value: 'refund', label: '退款申请', hint: '申请退回部分或全部款项' },
  { value: 'service_dispute', label: '服务争议', hint: '服务内容、时长或履约有异议' },
  { value: 'other', label: '其他售后', hint: '其他需要平台协助的问题' },
]
const orderNo = ref('')
const order = ref<ProviderOrder | null>(null)
const latestCase = ref<ProviderOrderAfterSalesCase | null>(null)
const creatingAnother = ref(false)
const caseType = ref<CaseType>('refund')
const amountText = ref('')
const amountError = ref('')
const reason = ref('')
const reasonTouched = ref(false)
const uploads = ref<UploadItem[]>([])
const uploading = ref(false)
const submitting = ref(false)
const loading = ref(true)
const error = ref('')
const money = formatAmount

const refundableAmount = computed(() => {
  if (!order.value) return 0
  const reserved = order.value.refund_orders.reduce((sum, item) => sum + item.refund_amount, 0)
  return Math.max(order.value.payable_amount - reserved, 0)
})
const requestedAmount = computed(() => {
  const normalized = amountText.value.trim()
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return Number.NaN
  return Math.round(Number(normalized) * 100)
})
const canSubmit = computed(() => !submitting.value
  && !uploading.value
  && !amountError.value
  && Number.isFinite(requestedAmount.value)
  && reason.value.trim().length >= 5
  && requestedAmount.value > 0
  && order.value?.settlement?.status !== 'settled')
const canReapply = computed(() => Boolean(
  latestCase.value
  && ['refunded', 'rejected'].includes(latestCase.value.status)
  && refundableAmount.value > 0
  && order.value?.settlement?.status !== 'settled',
))

function goBack() { navigateBackOr(() => uni.reLaunch({ url: '/pages/orders/list' })) }
function formatDateTime(value: string) {
  return formatBusinessDateTime(value)
}
function selectCaseType(value: CaseType) {
  caseType.value = value
  if (requestedAmount.value <= 0) amountText.value = (refundableAmount.value / 100).toFixed(2)
  validateAmount()
}
function validateAmount() {
  if (!Number.isFinite(requestedAmount.value)) amountError.value = '请输入正确的退款金额，最多保留两位小数。'
  else if (requestedAmount.value > refundableAmount.value) amountError.value = `申请金额不能超过 ¥${money(refundableAmount.value)}。`
  else if (requestedAmount.value <= 0) amountError.value = '申请退款金额必须大于 0。'
  else amountError.value = ''
}
function startNewApplication() {
  creatingAnother.value = true
  caseType.value = 'refund'
  amountText.value = (refundableAmount.value / 100).toFixed(2)
  amountError.value = ''
  reason.value = ''
  reasonTouched.value = false
  uploads.value = []
}
function chooseImages() {
  if (uploading.value) return
  uni.chooseImage({
    count: 3 - uploads.value.length,
    sizeType: ['compressed'],
    success: async ({ tempFilePaths, tempFiles }) => {
      uploading.value = true
      try {
        for (let index = 0; index < tempFilePaths.length; index += 1) {
          const selectedFile = Array.isArray(tempFiles) ? tempFiles[index] : tempFiles
          const file = selectedFile && typeof selectedFile === 'object' && 'file' in selectedFile
            ? (selectedFile as { file: unknown }).file
            : selectedFile
          const uploaded = (await uploadProviderOrderAfterSalesEvidence(tempFilePaths[index], file)).data
          uploads.value.push({ id: uploaded.id, url: uploaded.url || tempFilePaths[index] })
        }
      } catch (reasonValue) {
        uni.showToast({ title: getErrorMessage(reasonValue, '凭证上传失败'), icon: 'none' })
      } finally {
        uploading.value = false
      }
    },
  })
}
function removeUpload(index: number) { uploads.value.splice(index, 1) }
function previewUploads(index: number) {
  const urls = uploads.value.map(item => item.url)
  uni.previewImage({ current: urls[index], urls })
}
function previewCaseEvidence(index: number) {
  if (!latestCase.value) return
  uni.previewImage({ current: latestCase.value.evidence_urls[index], urls: latestCase.value.evidence_urls })
}
async function load() {
  if (!orderNo.value) return
  loading.value = true
  error.value = ''
  try {
    const [orderResponse, casesResponse] = await Promise.all([
      getProviderOrder(orderNo.value),
      getProviderOrderAfterSales(orderNo.value),
    ])
    order.value = orderResponse.data
    latestCase.value = casesResponse.data.items[0] || null
    amountText.value = (refundableAmount.value / 100).toFixed(2)
    validateAmount()
  } catch (reasonValue) {
    error.value = getErrorMessage(reasonValue, '售后信息加载失败')
  } finally {
    loading.value = false
  }
}
async function submit() {
  reasonTouched.value = true
  validateAmount()
  if (!canSubmit.value) {
    const message = reason.value.trim().length < 5
      ? `问题说明至少填写5个字，还差${Math.max(0, 5 - reason.value.trim().length)}字`
      : amountError.value || (uploading.value ? '图片正在上传，请稍候' : '请检查退款金额')
    uni.showToast({ title: message, icon: 'none' })
    return
  }
  submitting.value = true
  try {
    latestCase.value = (await createProviderOrderAfterSales(orderNo.value, {
      case_type: caseType.value,
      requested_amount: requestedAmount.value,
      reason: reason.value.trim(),
      evidence_asset_ids: uploads.value.map(item => item.id),
    })).data
    creatingAnother.value = false
    uni.showToast({ title: '售后申请已提交', icon: 'success' })
  } catch (reasonValue) {
    uni.showToast({ title: getErrorMessage(reasonValue, '提交失败'), icon: 'none' })
  } finally {
    submitting.value = false
  }
}

onLoad((query) => {
  orderNo.value = typeof query?.orderNo === 'string' ? query.orderNo : ''
  if (orderNo.value) load()
  else { loading.value = false; error.value = '缺少订单编号' }
})
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;
.after-sales-page{min-height:100vh;padding-bottom:calc(132rpx + env(safe-area-inset-bottom));background:$dz-surface-page}.page-head{position:sticky;z-index:12;top:0;display:flex;align-items:flex-end;justify-content:center;height:calc(104rpx + env(safe-area-inset-top));padding-bottom:18rpx;background:$dz-surface-card;box-sizing:border-box}.page-head button{position:absolute;left:16rpx;bottom:0;width:88rpx;height:88rpx;margin:0;padding:0;border:0;background:transparent;font-size:$dz-fs-price-lg;line-height:88rpx}.page-head button::after,.type-grid button::after,.upload-list button::after,.submit-footer button::after,.state button::after{display:none}.page-head>text{font-size:$dz-fs-body-strong;font-weight:$dz-fw-bold}.content{padding:22rpx 24rpx}.panel{padding:24rpx;border-radius:$dz-radius-md;background:$dz-surface-card;box-shadow:$dz-shadow-card}.summary-head{display:flex;align-items:center}.avatar{display:flex;align-items:center;justify-content:center;overflow:hidden;width:88rpx;height:88rpx;border-radius:$dz-radius-md;color:$dz-brand-deep;background:$dz-brand-soft;font-size:$dz-fs-body-strong}.avatar image{width:100%;height:100%}.summary-copy{display:flex;min-width:0;flex:1;flex-direction:column;gap:7rpx;margin-left:16rpx}.summary-copy strong{font-size:$dz-fs-caption}.summary-copy text{color:$dz-text-secondary;font-size:$dz-fs-caption}.summary-copy small{overflow:hidden;color:$dz-text-tertiary;font-size:$dz-fs-micro;text-overflow:ellipsis;white-space:nowrap}.amount-line{display:flex;align-items:center;justify-content:space-between;margin-top:20rpx;padding-top:18rpx;border-top:1rpx dashed $dz-border-subtle;font-size:$dz-fs-caption}.amount-line strong{color:$dz-price-primary;font-size:$dz-fs-body-strong}.amount-line.subtle{margin-top:8rpx;padding-top:8rpx;border:0;color:$dz-text-secondary}.amount-line.subtle strong{color:$dz-text-primary;font-size:$dz-fs-caption}.form-card,.case-card{margin-top:20rpx}.section-title,.field-head label{font-size:$dz-fs-caption;font-weight:$dz-fw-bold}.type-grid{display:grid;grid-template-columns:1fr 1fr;gap:14rpx;margin-top:18rpx}.type-grid button{display:flex;flex-direction:column;gap:7rpx;min-height:104rpx;margin:0;padding:17rpx;border:1rpx solid $dz-border-subtle;border-radius:$dz-radius-sm;background:$dz-surface-card;text-align:left}.type-grid button:last-child{grid-column:1/-1}.type-grid button.active{border-color:$dz-brand-primary;background:$dz-brand-soft;box-shadow:0 0 0 1rpx $dz-brand-primary inset}.type-grid strong{font-size:$dz-fs-caption}.type-grid text{color:$dz-text-secondary;font-size:$dz-fs-micro;line-height:1.4}.field-head{display:flex;align-items:center;justify-content:space-between}.field-head>text{color:$dz-text-tertiary;font-size:$dz-fs-micro}.amount-input{display:flex;align-items:center;height:92rpx;margin-top:18rpx;padding:0 20rpx;border:1rpx solid $dz-border-subtle;border-radius:$dz-radius-sm;background:$dz-surface-page;box-sizing:border-box}.amount-input.invalid{border-color:$dz-status-danger;background:$dz-status-danger-soft}.amount-input>text{color:$dz-text-primary;font-size:$dz-fs-body;font-weight:$dz-fw-bold}.amount-input input{flex:1;height:88rpx;margin-left:10rpx;color:$dz-text-primary;font-size:$dz-fs-body-strong}.field-help,.field-error{display:block;margin-top:10rpx;font-size:$dz-fs-micro;line-height:1.5}.field-help{color:$dz-text-tertiary}.field-error{color:$dz-status-danger-deep}.form-card textarea{width:100%;height:220rpx;margin-top:18rpx;padding:18rpx;border:1rpx solid $dz-border-subtle;border-radius:$dz-radius-sm;background:$dz-surface-page;font-size:$dz-fs-caption;line-height:1.6;box-sizing:border-box}.form-card textarea.invalid{border-color:$dz-status-danger;background:$dz-status-danger-soft}.upload-list{display:flex;flex-wrap:wrap;gap:14rpx;margin-top:18rpx}.upload-item,.upload-add{position:relative;width:142rpx;height:142rpx;border-radius:$dz-radius-sm}.upload-item image{width:100%;height:100%;border-radius:$dz-radius-sm}.upload-item button{position:absolute;right:-8rpx;top:-8rpx;width:48rpx;height:48rpx;margin:0;padding:0;border:2rpx solid #fff;border-radius:50%;color:$dz-text-inverse;background:rgba(23,33,38,.82);font-size:$dz-fs-body;line-height:44rpx}.upload-add{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9rpx;margin:0;padding:0;border:2rpx dashed $dz-brand-primary;color:$dz-brand-deep;background:$dz-brand-soft;line-height:1}.upload-add strong{font-size:$dz-fs-caption}.upload-add text{color:$dz-text-tertiary;font-size:$dz-fs-micro}.upload-add[disabled]{opacity:.5}.notice{display:flex;flex-direction:column;gap:9rpx;margin-top:20rpx;padding:20rpx;border-radius:$dz-radius-sm;color:$dz-status-warning-deep;background:$dz-status-warning-soft}.notice strong{font-size:$dz-fs-caption}.notice text{font-size:$dz-fs-micro;line-height:1.6}.case-head{display:flex;align-items:flex-start;justify-content:space-between}.case-head>view{display:flex;flex-direction:column;gap:7rpx}.case-head small{color:$dz-text-tertiary;font-size:$dz-fs-micro}.case-head strong{font-size:$dz-fs-body}.case-head>text{padding:7rpx 13rpx;border-radius:$dz-radius-sm;color:$dz-status-warning-deep;background:$dz-status-warning-soft;font-size:$dz-fs-micro}.case-head>text.refunded{color:$dz-status-success-deep;background:$dz-brand-soft}.case-head>text.rejected{color:$dz-status-danger-deep;background:$dz-price-soft}.progress-list{margin:26rpx 0}.progress-item{position:relative;display:flex;min-height:88rpx}.progress-item:not(:last-child)::before{position:absolute;left:9rpx;top:22rpx;bottom:-1rpx;width:2rpx;background:$dz-border-subtle;content:''}.progress-item>i{z-index:1;width:20rpx;height:20rpx;margin-top:3rpx;border:4rpx solid #fff;border-radius:50%;background:$dz-border-subtle;box-shadow:0 0 0 2rpx $dz-text-tertiary}.progress-item.done>i{background:$dz-brand-primary;box-shadow:0 0 0 2rpx $dz-brand-primary}.progress-item>view{display:flex;flex-direction:column;gap:7rpx;margin-left:18rpx}.progress-item strong{font-size:$dz-fs-caption}.progress-item text{color:$dz-text-secondary;font-size:$dz-fs-micro;line-height:1.5}.case-detail{display:flex;align-items:center;justify-content:space-between;min-height:60rpx;color:$dz-text-secondary;font-size:$dz-fs-caption}.case-detail strong{color:$dz-price-primary;font-size:$dz-fs-caption}.refund-result,.reason-copy{display:flex;flex-direction:column;gap:8rpx;margin-top:16rpx;padding:17rpx;border-radius:$dz-radius-sm;background:$dz-brand-soft}.refund-result strong,.reason-copy small{color:$dz-brand-deep;font-size:$dz-fs-caption}.refund-result text,.reason-copy text{color:$dz-text-secondary;font-size:$dz-fs-micro;line-height:1.55}.evidence-preview{display:flex;gap:12rpx;margin-top:16rpx}.evidence-preview image{width:132rpx;height:132rpx;border-radius:$dz-radius-sm}.submit-footer{position:fixed;z-index:20;right:0;bottom:0;left:0;max-width:750px;height:calc(116rpx + env(safe-area-inset-bottom));margin:auto;padding:14rpx 24rpx env(safe-area-inset-bottom);background:$dz-surface-card;box-shadow:$dz-shadow-floating;box-sizing:border-box}.submit-footer button{width:100%;height:82rpx;margin:0;border:0;border-radius:$dz-radius-full;color:$dz-text-inverse;background:$dz-gradient-brand;font-size:$dz-fs-caption;font-weight:$dz-fw-bold;line-height:82rpx}.submit-footer button:active{opacity:.82}.submit-footer button.blocked{background:#d94a4a}.submit-footer button[disabled]{opacity:.45}.state{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:620rpx;color:$dz-text-secondary;font-size:$dz-fs-caption}.state button{height:80rpx;margin-top:24rpx;padding:0 34rpx;border:0;border-radius:$dz-radius-lg;color:$dz-text-inverse;background:$dz-gradient-brand;line-height:80rpx}.error-state text{max-width:80%;text-align:center}
.reapply-button{width:100%;height:76rpx;margin:20rpx 0 0;padding:0;border:1rpx solid $dz-brand-primary;border-radius:$dz-radius-lg;color:$dz-brand-deep;background:$dz-surface-card;font-size:$dz-fs-caption;line-height:76rpx}.reapply-button::after{display:none}.notice.settled{color:#735c25;background:#fff8df}
</style>
