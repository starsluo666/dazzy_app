<template>
  <view class="dz-page support-page">
    <DzNavBar :title="selected ? '反馈详情' : '问题反馈'" :back-action="goBack" />

    <main v-if="!selected" class="support-content dz-container">
      <section class="support-hero">
        <view class="hero-icon"><image src="/static/functions/customer-service.svg" mode="aspectFit" /></view>
        <view><strong>有问题，我们来帮你</strong><text>反馈会保留完整处理记录</text></view>
      </section>

      <view class="refund-hint" role="note">
        <view class="refund-hint__icon" aria-hidden="true">!</view>
        <view><strong>支付与退款</strong><text>涉及支付、退款的问题，请在对应订单详情页发起售后</text></view>
      </view>

      <view class="case-tabs">
        <button v-for="tab in tabs" :key="tab.key" :class="{ active: activeTab === tab.key }" @tap="activeTab = tab.key">{{ tab.label }}</button>
      </view>

      <view class="list-heading"><strong>我的反馈</strong><text>完整展示历史处理记录</text></view>
      <view v-if="loading" class="state">正在加载反馈…</view>
      <view v-else-if="error" class="state error" role="button" @tap="loadCases">{{ error }}，点击重试</view>
      <view v-else-if="!filteredCases.length" class="empty-state">
        <view>✓</view><strong>当前没有{{ activeTab === 'all' ? '' : '相关' }}反馈</strong><text>需要帮助时，可以随时提交问题</text>
      </view>
      <view v-else class="case-list">
        <button v-for="item in filteredCases" :key="item.case_no" class="case-card" @tap="openDetail(item)">
          <view class="case-top"><strong>{{ item.case_no }}</strong><text :class="statusTone(item.status)">{{ item.status_label }}</text><b>›</b></view>
          <view class="case-meta"><text :class="item.case_type">{{ item.case_type_label }}</text><span>· {{ item.target_type_label }}</span><small>{{ formatDateTime(item.created_at) }}</small></view>
          <strong class="case-subject">{{ item.reason_label }}</strong>
          <p>{{ item.description }}</p>
          <view v-if="latestRecord(item)" class="latest"><i /> <text>{{ displayRecordTypeLabel(latestRecord(item)?.record_type_label) }}：</text><span>{{ latestRecord(item)?.content || '反馈状态已更新' }}</span></view>
          <view class="case-foot"><text>{{ item.attachment_urls.length ? `附件 ${item.attachment_urls.length}` : '无附件' }}</text><text>查看进度　›</text></view>
        </button>
      </view>
    </main>

    <main v-else class="detail-content dz-container">
      <section class="detail-status" :class="statusTone(selected.status)">
        <view><text>{{ selected.status_label }}</text><strong>{{ selected.reason_label }}</strong><small>{{ selected.case_no }}</small></view>
        <i>{{ selected.status === 'resolved' || selected.status === 'closed' ? '✓' : '…' }}</i>
      </section>

      <section class="detail-card panel">
        <h2>关联对象</h2>
        <view class="target-row"><view>{{ selected.target_type_label.slice(0, 1) }}</view><span><strong>{{ selected.target_title }}</strong><text>{{ selected.target_subtitle || selected.target_type_label }}</text></span></view>
      </section>

      <section class="detail-card panel">
        <h2>问题说明</h2>
        <p>{{ selected.description }}</p>
        <view v-if="selected.attachment_urls.length" class="attachments">
          <image v-for="(url, index) in selected.attachment_urls" :key="url" :src="url" mode="aspectFill" @tap="previewAttachments(index)" />
        </view>
      </section>

      <section class="detail-card panel timeline-card">
        <h2>处理进度</h2>
        <view v-for="record in selected.records" :key="record.id" class="timeline-item">
          <i /><view><strong>{{ displayRecordTypeLabel(record.record_type_label) }}</strong><small>{{ record.actor_name }} · {{ formatDateTime(record.created_at) }}</small><p v-if="record.content">{{ record.content }}</p></view>
        </view>
      </section>

      <section v-if="selected.result_note" class="result-card">
        <strong>平台处理结论</strong><p>{{ selected.result_note }}</p>
      </section>
      <section v-if="selected.reward_eligible" class="result-card">
        <strong>举报奖励</strong><p>{{ selected.reward_issued ? '奖励优惠券已发放，可在下单时选择使用。' : '客服核实举报成立后发放优惠券。' }}</p>
      </section>
    </main>

    <footer v-if="!selected" class="support-footer"><button @tap="openCreate">＋　新建投诉/反馈</button></footer>
    <footer v-else-if="canOperateSelected" class="detail-footer">
      <button v-if="isOpen(selected.status)" class="outline" @tap="openReply">补充说明</button>
      <button v-if="canRequestReview" class="primary" @tap="openReview">申请复核</button>
    </footer>

    <view v-if="sheetMode" class="sheet-mask" @tap.self="closeSheet">
      <section class="form-sheet">
        <view class="sheet-handle" />
        <view class="sheet-title"><strong>{{ sheetTitle }}</strong><button aria-label="关闭" @tap="closeSheet">×</button></view>

        <template v-if="sheetMode === 'create'">
          <view class="target-summary"><small>关联对象</small><strong>{{ form.targetTitle || '平台服务' }}</strong><text>{{ form.targetType === 'general' ? '订单可在下方选填；反馈其他对象请从对应详情页进入' : targetTypeLabel(form.targetType) }}</text></view>
          <view v-if="routePrefill.targetType === 'general'" class="feedback-order-picker">
            <label class="field-label">关联订单（选填）</label>
            <picker :range="feedbackOrderLabels" :value="feedbackOrderIndex" @change="selectFeedbackOrder">
              <view class="feedback-order-field">
                <text class="feedback-order-value">{{ form.targetType === 'provider_order' ? form.targetTitle : '不关联订单' }}</text>
                <view class="feedback-order-chevron" aria-hidden="true" />
              </view>
            </picker>
          </view>
          <label class="field-label">问题分类</label>
          <view class="reason-grid">
            <button v-for="item in visibleReasonOptions" :key="item.value" :class="{ active: form.reason === item.value }" @tap="form.reason = item.value">{{ item.label }}</button>
          </view>
          <label class="field-label">问题说明</label>
          <textarea v-model="form.description" :class="{ invalid: formAttempted && form.description.trim().length < 5 }" maxlength="1000" placeholder="请描述发生时间、具体经过和希望平台协助的事项" />
          <view class="counter">{{ form.description.length }}/1000</view>
          <text v-if="formAttempted && form.description.trim().length < 5" class="field-error">问题说明至少填写5个字，还差 {{ 5 - form.description.trim().length }} 字</text>
          <view class="upload-title"><label class="field-label">证据图片</label><text>{{ uploads.length }}/3</text></view>
          <view class="upload-list">
            <view v-for="(image, index) in uploads" :key="image.id"><image :src="image.url" mode="aspectFill" /><button @tap="uploads.splice(index, 1)">×</button></view>
            <button v-if="uploads.length < 3" class="upload-add" :disabled="uploading" @tap="chooseImages"><strong>{{ uploading ? '…' : '+' }}</strong><text>{{ uploading ? '上传中' : '添加图片' }}</text></button>
          </view>
          <button class="sheet-submit" :class="{ blocked: formAttempted && form.description.trim().length < 5 }" :disabled="submitting || uploading" @tap="submitCase">{{ submitting ? '提交中…' : '提交反馈' }}</button>
        </template>

        <template v-else>
          <text class="sheet-tip">{{ sheetMode === 'reply' ? '补充信息会同步给处理客服并写入反馈时间线。' : '请说明对处理结果有异议的原因和新增依据；每条反馈仅可申请一次复核。' }}</text>
          <textarea v-model="messageText" :class="{ invalid: messageAttempted && messageText.trim().length < (sheetMode === 'reply' ? 2 : 5) }" maxlength="1000" :placeholder="sheetMode === 'reply' ? '请输入需要补充的情况' : '请输入申请复核的具体原因'" />
          <view class="counter">{{ messageText.length }}/1000</view>
          <text v-if="messageAttempted && messageText.trim().length < (sheetMode === 'reply' ? 2 : 5)" class="field-error">内容至少填写 {{ sheetMode === 'reply' ? 2 : 5 }} 个字</text>
          <button class="sheet-submit" :class="{ blocked: messageAttempted && messageText.trim().length < (sheetMode === 'reply' ? 2 : 5) }" :disabled="submitting" @tap="submitMessage">{{ submitting ? '提交中…' : sheetMode === 'reply' ? '提交补充' : '提交复核申请' }}</button>
        </template>
      </section>
    </view>
  </view>
</template>

<script setup lang="ts">
import { navigateBackOr } from '@/utils/navigation'
import DzNavBar from '@/components/DzNavBar.vue'
import { computed, reactive, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'

import {
  createSupportCase,
  getSupportCase,
  getSupportCases,
  replySupportCase,
  requestSupportCaseReview,
  uploadSupportAttachment,
} from '@/services/support'
import type { SupportCase, SupportCaseReason, SupportCaseStatus, SupportTargetType } from '@/types/api'
import { formatBusinessDateTime, getErrorMessage } from '@/utils/formatters'
import { getProviderOrders } from '@/services/orders'

type UploadItem = { id: string; url: string }
type SheetMode = '' | 'create' | 'reply' | 'review'

const cases = ref<SupportCase[]>([])
const feedbackOrders = ref<Array<{ order_no: string; service_name: string }>>([])
const feedbackOrderLabels = computed(() => ['不关联订单', ...feedbackOrders.value.map((item) => `${item.service_name} · ${item.order_no}`)])
const selected = ref<SupportCase | null>(null)
const loading = ref(true)
const error = ref('')
const activeTab = ref<'all' | 'processing' | 'completed'>('all')
const sheetMode = ref<SheetMode>('')
const submitting = ref(false)
const uploading = ref(false)
const uploads = ref<UploadItem[]>([])
const messageText = ref('')
const formAttempted = ref(false)
const messageAttempted = ref(false)
const pendingCaseNo = ref('')
const routePrefill = reactive({
  targetType: 'general' as SupportTargetType,
  targetId: '',
  targetTitle: '',
  reason: 'other' as SupportCaseReason,
})
const form = reactive({
  caseType: 'complaint' as const,
  targetType: 'general' as SupportTargetType,
  targetId: '',
  targetTitle: '',
  reason: 'other' as SupportCaseReason,
  description: '',
})
const feedbackOrderIndex = computed(() => form.targetType === 'provider_order'
  ? feedbackOrders.value.findIndex((order) => order.order_no === form.targetId) + 1
  : 0)

const tabs = [
  { key: 'all' as const, label: '全部' },
  { key: 'processing' as const, label: '处理中' },
  { key: 'completed' as const, label: '已完结' },
]
const reasonOptions: Array<{ value: SupportCaseReason; label: string }> = [
  { value: 'platform_process', label: '平台流程' },
  { value: 'platform_product', label: '产品建议' },
  { value: 'service_quality', label: '服务体验' },
  { value: 'false_information', label: '信息不实' },
  { value: 'inappropriate_content', label: '内容不当' },
  { value: 'private_transaction', label: '私下交易' },
  { value: 'safety_risk', label: '安全风险' },
  { value: 'account_issue', label: '账号问题' },
  { value: 'other', label: '其他问题' },
]
const visibleReasonOptions = computed(() => routePrefill.targetType === 'general'
  ? reasonOptions.filter((item) => ['platform_process', 'platform_product', 'service_quality', 'account_issue', 'other'].includes(item.value))
  : reasonOptions)

const filteredCases = computed(() => cases.value.filter((item) => {
  if (activeTab.value === 'processing') return isOpen(item.status)
  if (activeTab.value === 'completed') return !isOpen(item.status)
  return true
}))
const canRequestReview = computed(() => Boolean(
  selected.value
  && ['resolved', 'rejected'].includes(selected.value.status)
  && !selected.value.review_requested_at,
))
const canOperateSelected = computed(() => Boolean(
  selected.value && (isOpen(selected.value.status) || canRequestReview.value),
))
const sheetTitle = computed(() => sheetMode.value === 'create' ? '新建投诉/反馈' : sheetMode.value === 'reply' ? '补充说明' : '申请复核')

function isOpen(status: SupportCaseStatus) { return ['pending', 'processing', 'reviewing'].includes(status) }
function statusTone(status: SupportCaseStatus) {
  if (status === 'reviewing') return 'reviewing'
  if (status === 'processing') return 'processing'
  if (status === 'pending') return 'pending'
  if (status === 'rejected') return 'rejected'
  return 'completed'
}
function targetTypeLabel(type: SupportTargetType) {
  return ({ general: '平台服务', provider: '达人', provider_order: '达人订单', activity: '活动', review: '用户评价' } as Record<SupportTargetType, string>)[type]
}
function formatDateTime(value: string) {
  return formatBusinessDateTime(value)
}
function latestRecord(item: SupportCase) { return item.records[item.records.length - 1] }
function displayRecordTypeLabel(value?: string) { return (value || '').replace(/工单/g, '反馈') }
function goBack() {
  if (selected.value) { selected.value = null; return }
  navigateBackOr(() => uni.reLaunch({ url: '/pages/profile/index' }))
}
function openCreate() {
  form.caseType = 'complaint'
  form.targetType = routePrefill.targetType
  form.targetId = routePrefill.targetId
  form.targetTitle = routePrefill.targetTitle
  form.reason = routePrefill.targetType === 'general' ? 'other' : routePrefill.reason
  form.description = ''
  formAttempted.value = false
  uploads.value = []
  sheetMode.value = 'create'
  if (routePrefill.targetType === 'general') loadFeedbackOrders()
}
async function loadFeedbackOrders() {
  try { feedbackOrders.value = (await getProviderOrders()).data.items.map((item) => ({ order_no: item.order_no, service_name: item.service_name })) }
  catch { feedbackOrders.value = [] }
}
function selectFeedbackOrder(event: { detail: { value: string } }) {
  const index = Number(event.detail.value) - 1
  const order = feedbackOrders.value[index]
  form.targetType = order ? 'provider_order' : 'general'
  form.targetId = order?.order_no || ''
  form.targetTitle = order ? `${order.service_name} · ${order.order_no}` : ''
}
function closeSheet() { if (!submitting.value && !uploading.value) sheetMode.value = '' }
async function loadCases() {
  loading.value = true
  error.value = ''
  try { cases.value = (await getSupportCases()).data.items }
  catch (reason) { error.value = getErrorMessage(reason, '反馈加载失败') }
  finally { loading.value = false }
}
async function loadPage() {
  await loadCases()
  if (!pendingCaseNo.value) return
  try { selected.value = (await getSupportCase(pendingCaseNo.value)).data }
  catch (reason) { uni.showToast({ title: getErrorMessage(reason, '反馈详情加载失败'), icon: 'none' }) }
  finally { pendingCaseNo.value = '' }
}
async function openDetail(item: SupportCase) {
  selected.value = item
  try { selected.value = (await getSupportCase(item.case_no)).data }
  catch (reason) { uni.showToast({ title: getErrorMessage(reason, '详情加载失败'), icon: 'none' }) }
}
function previewAttachments(index: number) {
  if (!selected.value) return
  uni.previewImage({ current: selected.value.attachment_urls[index], urls: selected.value.attachment_urls })
}
async function chooseImages() {
  if (uploading.value || uploads.value.length >= 3) return
  const remaining = 3 - uploads.value.length
  uni.chooseImage({
    count: remaining,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async ({ tempFilePaths, tempFiles }) => {
      uploading.value = true
      try {
        for (let index = 0; index < tempFilePaths.length; index += 1) {
          const selectedFile = Array.isArray(tempFiles) ? tempFiles[index] : tempFiles
          const file = selectedFile && typeof selectedFile === 'object' && 'file' in selectedFile
            ? (selectedFile as { file: unknown }).file
            : selectedFile
          const result = (await uploadSupportAttachment(tempFilePaths[index], file)).data
          uploads.value.push(result)
        }
      } catch (reason) {
        uni.showToast({ title: getErrorMessage(reason, '图片上传失败'), icon: 'none' })
      } finally { uploading.value = false }
    },
  })
}
async function submitCase() {
  formAttempted.value = true
  if (submitting.value) return
  if (form.description.trim().length < 5) {
    uni.showToast({ title: `问题说明至少填写5个字，还差${5 - form.description.trim().length}字`, icon: 'none' })
    return
  }
  submitting.value = true
  try {
    const response = await createSupportCase({
      case_type: form.caseType,
      target_type: form.targetType,
      ...(form.targetId ? { target_id: form.targetId } : {}),
      reason: form.reason,
      description: form.description.trim(),
      attachment_ids: uploads.value.map((item) => item.id),
    })
    sheetMode.value = ''
    await loadCases()
    selected.value = response.data
    uni.showToast({ title: response.created ? '反馈已提交' : '已有处理中反馈', icon: 'success' })
  } catch (reason) {
    uni.showToast({ title: getErrorMessage(reason, '提交失败'), icon: 'none' })
  } finally { submitting.value = false }
}
function openReply() { messageText.value = ''; messageAttempted.value = false; sheetMode.value = 'reply' }
function openReview() { messageText.value = ''; messageAttempted.value = false; sheetMode.value = 'review' }
async function submitMessage() {
  messageAttempted.value = true
  const minimum = sheetMode.value === 'reply' ? 2 : 5
  if (!selected.value || submitting.value) return
  if (messageText.value.trim().length < minimum) {
    uni.showToast({ title: `内容至少填写${minimum}个字`, icon: 'none' })
    return
  }
  submitting.value = true
  try {
    const response = sheetMode.value === 'reply'
      ? await replySupportCase(selected.value.case_no, messageText.value.trim())
      : await requestSupportCaseReview(selected.value.case_no, messageText.value.trim())
    selected.value = response.data
    const index = cases.value.findIndex((item) => item.case_no === response.data.case_no)
    if (index >= 0) cases.value[index] = response.data
    sheetMode.value = ''
    uni.showToast({ title: '提交成功', icon: 'success' })
  } catch (reason) {
    uni.showToast({ title: getErrorMessage(reason, '提交失败'), icon: 'none' })
  } finally { submitting.value = false }
}

onLoad((query) => {
  const allowedTargets: SupportTargetType[] = ['general', 'provider', 'provider_order', 'activity', 'review']
  const allowedReasons = reasonOptions.map((item) => item.value)
  if (typeof query?.targetType === 'string' && allowedTargets.includes(query.targetType as SupportTargetType)) routePrefill.targetType = query.targetType as SupportTargetType
  if (query?.caseType === 'report') {
    uni.redirectTo({ url: '/pages/report/index' })
    return
  }
  if (typeof query?.targetId === 'string') routePrefill.targetId = query.targetId
  if (typeof query?.targetTitle === 'string') routePrefill.targetTitle = decodeURIComponent(query.targetTitle)
  if (typeof query?.reason === 'string' && allowedReasons.includes(query.reason as SupportCaseReason)) routePrefill.reason = query.reason as SupportCaseReason
  if (typeof query?.caseNo === 'string') pendingCaseNo.value = query.caseNo
  if (query?.mode === 'new') openCreate()
})
onShow(loadPage)
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;
.support-page{min-height:100vh;padding-bottom:calc(126rpx + env(safe-area-inset-bottom));background:$dz-surface-page}.page-head{position:sticky;z-index:20;top:0;display:grid;grid-template-columns:72rpx 1fr 72rpx;align-items:end;height:calc(96rpx + env(safe-area-inset-top));padding:0 18rpx 17rpx;background:rgba(255,255,255,.96);box-sizing:border-box}.page-head button{width:64rpx;height:64rpx;margin:0;padding:0;border:0;background:transparent;font-size:$dz-fs-price-lg;line-height:58rpx}.page-head button::after,.case-tabs button::after,.case-card::after,.support-footer button::after,.detail-footer button::after,.sheet-title button::after,.reason-grid button::after,.upload-list button::after,.sheet-submit::after{display:none}.page-head>text{text-align:center;font-size:$dz-fs-body-strong;font-weight:$dz-fw-bold}.support-content,.detail-content{padding:22rpx 24rpx 40rpx}.support-hero{display:flex;align-items:center;gap:25rpx;padding:25rpx 28rpx;border:1rpx solid #e0eded;border-radius:$dz-radius-md;background:linear-gradient(135deg,#fff,#effbfb)}.hero-icon{display:flex;align-items:center;justify-content:center;width:112rpx;height:112rpx;border-radius:50%;background:#dff8f8}.hero-icon image{width:78rpx;height:78rpx}.support-hero>view:last-child{display:flex;flex-direction:column;gap:10rpx}.support-hero strong{font-size:$dz-fs-body-strong}.support-hero text{color:$dz-text-secondary;font-size:$dz-fs-caption}.panel{background:$dz-surface-card;box-shadow:$dz-shadow-card}.case-tabs{display:grid;grid-template-columns:repeat(3,1fr);margin-top:24rpx;border:1rpx solid $dz-border-subtle;border-radius:$dz-radius-md;background:$dz-surface-card}.case-tabs button{position:relative;height:70rpx;margin:0;border:0;background:transparent;color:$dz-text-secondary;font-size:$dz-fs-caption;line-height:70rpx}.case-tabs button.active{color:$dz-brand-deep;font-weight:$dz-fw-bold}.case-tabs button.active::before{position:absolute;right:30%;bottom:0;left:30%;height:5rpx;border-radius:3rpx;background:$dz-brand-primary;content:''}.list-heading{display:flex;align-items:center;justify-content:space-between;margin:28rpx 4rpx 15rpx}.list-heading strong{font-size:$dz-fs-body}.list-heading text{color:$dz-text-tertiary;font-size:$dz-fs-micro}.case-list{display:flex;flex-direction:column;gap:16rpx}.case-card{display:flex;flex-direction:column;width:100%;margin:0;padding:21rpx 22rpx;border:1rpx solid $dz-border-subtle;border-radius:$dz-radius-md;background:$dz-surface-card;text-align:left;box-shadow:0 7rpx 22rpx rgba(38,67,73,.05);box-sizing:border-box}.case-top{display:flex;align-items:center}.case-top>strong{font-size:$dz-fs-caption;font-weight:$dz-fw-semibold}.case-top>text{margin-left:auto;padding:6rpx 11rpx;border-radius:$dz-radius-sm;font-size:$dz-fs-micro}.case-top>b{margin-left:10rpx;color:$dz-text-tertiary;font-size:$dz-fs-body;font-weight:$dz-fw-regular}.case-top .pending{color:#b46818;background:$dz-status-warning-soft}.case-top .processing{color:$dz-brand-deep;background:$dz-brand-soft}.case-top .reviewing{color:#a86213;background:#fff0df}.case-top .completed{color:#27815f;background:$dz-status-success-soft}.case-top .rejected{color:#8d5d59;background:$dz-status-danger-soft}.case-meta{display:flex;align-items:center;gap:7rpx;margin-top:14rpx;color:$dz-text-secondary;font-size:$dz-fs-micro}.case-meta>text{padding:4rpx 8rpx;border-radius:7rpx;color:$dz-brand-deep;background:$dz-brand-soft}.case-meta>text.complaint,.case-meta>text.report{color:#de5d22;background:#fff0e9}.case-meta small{margin-left:auto;color:$dz-text-tertiary;font-size:$dz-fs-micro}.case-subject{margin-top:14rpx;font-size:$dz-fs-caption}.case-card>p{overflow:hidden;margin:9rpx 0 0;color:$dz-text-secondary;font-size:$dz-fs-caption;line-height:29rpx;text-overflow:ellipsis;white-space:nowrap}.latest{display:flex;align-items:center;overflow:hidden;margin-top:14rpx;padding:13rpx;border-radius:$dz-radius-sm;background:#f3fafa;font-size:$dz-fs-micro;white-space:nowrap}.latest i{flex:0 0 auto;width:11rpx;height:11rpx;margin-right:8rpx;border-radius:50%;background:$dz-brand-primary}.latest text{color:$dz-brand-deep}.latest span{overflow:hidden;color:$dz-text-secondary;text-overflow:ellipsis}.case-foot{display:flex;justify-content:space-between;margin-top:14rpx;padding-top:12rpx;border-top:1rpx solid $dz-border-subtle;color:$dz-text-tertiary;font-size:$dz-fs-micro}.case-foot text:last-child{color:$dz-brand-deep}.refund-hint{display:grid;grid-template-columns:38rpx 1fr;align-items:start;gap:12rpx;margin:16rpx 0 0;padding:16rpx 18rpx;border:1rpx solid #f2d7c5;border-radius:$dz-radius-sm;background:#fff8f2}.refund-hint__icon{display:flex;align-items:center;justify-content:center;width:34rpx;height:34rpx;margin-top:1rpx;border-radius:50%;color:$dz-text-inverse;background:$dz-status-warning;font-size:$dz-fs-caption;font-weight:$dz-fw-bold;line-height:1}.refund-hint>view:last-child{display:flex;flex-direction:column;gap:3rpx}.refund-hint strong{color:#8a4822;font-size:$dz-fs-caption;line-height:1.4}.refund-hint text{color:#735f53;font-size:$dz-fs-micro;line-height:1.55}.state,.empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:320rpx;color:$dz-text-secondary;font-size:$dz-fs-caption}.state.error{color:#c6633b}.empty-state view{display:flex;align-items:center;justify-content:center;width:72rpx;height:72rpx;border-radius:50%;color:$dz-text-inverse;background:$dz-brand-primary;font-size:$dz-fs-heading}.empty-state strong{margin-top:18rpx;color:$dz-text-primary;font-size:$dz-fs-caption}.empty-state text{margin-top:8rpx;color:$dz-text-tertiary;font-size:$dz-fs-micro}.support-footer,.detail-footer{position:fixed;z-index:25;right:0;bottom:0;left:0;max-width:750px;margin:auto;padding:12rpx 24rpx calc(12rpx + env(safe-area-inset-bottom));background:$dz-surface-card;box-shadow:0 -7rpx 24rpx rgba(28,61,68,.08)}.support-footer button{width:100%;height:78rpx;margin:0;border:0;border-radius:$dz-radius-sm;color:$dz-text-inverse;background:$dz-gradient-brand;font-size:$dz-fs-caption;font-weight:$dz-fw-bold;line-height:78rpx}.detail-content{padding-bottom:45rpx}.detail-status{display:flex;align-items:center;justify-content:space-between;padding:25rpx;border-radius:$dz-radius-md;background:#eafbfb}.detail-status.pending,.detail-status.reviewing{background:#fff4e6}.detail-status.rejected{background:$dz-status-danger-soft}.detail-status>view{display:flex;flex-direction:column;gap:7rpx}.detail-status text{color:$dz-brand-deep;font-size:$dz-fs-caption}.detail-status strong{font-size:$dz-fs-body}.detail-status small{color:$dz-text-secondary;font-size:$dz-fs-micro}.detail-status>i{display:flex;align-items:center;justify-content:center;width:70rpx;height:70rpx;border-radius:50%;color:$dz-text-inverse;background:$dz-brand-primary;font-size:$dz-fs-heading;font-style:normal}.detail-card{margin-top:18rpx;padding:23rpx;border-radius:$dz-radius-md}.detail-card h2{margin:0 0 18rpx;font-size:$dz-fs-caption}.target-row{display:flex;align-items:center}.target-row>view{display:flex;align-items:center;justify-content:center;width:66rpx;height:66rpx;border-radius:$dz-radius-sm;color:$dz-brand-deep;background:$dz-brand-soft;font-size:$dz-fs-body;font-weight:$dz-fw-bold}.target-row span{display:flex;flex-direction:column;gap:6rpx;margin-left:16rpx}.target-row strong{font-size:$dz-fs-caption}.target-row text{color:$dz-text-secondary;font-size:$dz-fs-micro}.detail-card>p,.result-card p{margin:0;color:$dz-text-secondary;font-size:$dz-fs-caption;line-height:1.7;white-space:pre-wrap}.attachments{display:grid;grid-template-columns:repeat(3,1fr);gap:10rpx;margin-top:18rpx}.attachments image{width:100%;height:150rpx;border-radius:$dz-radius-sm}.timeline-item{position:relative;display:grid;grid-template-columns:22rpx 1fr;gap:14rpx;padding-bottom:24rpx}.timeline-item::before{position:absolute;left:9rpx;top:18rpx;bottom:0;width:2rpx;background:#d9ecec;content:''}.timeline-item:last-child::before{display:none}.timeline-item>i{z-index:1;width:18rpx;height:18rpx;margin-top:5rpx;border:4rpx solid #d9f7f7;border-radius:50%;background:$dz-brand-primary;box-sizing:border-box}.timeline-item>view{display:flex;flex-direction:column;gap:6rpx}.timeline-item strong{font-size:$dz-fs-caption}.timeline-item small{color:$dz-text-tertiary;font-size:$dz-fs-micro}.timeline-item p{margin:5rpx 0 0;padding:13rpx;border-radius:$dz-radius-sm;color:$dz-text-secondary;background:$dz-surface-page;font-size:$dz-fs-micro;line-height:1.55}.result-card{margin-top:18rpx;padding:21rpx;border-radius:$dz-radius-sm;color:#20765b;background:$dz-status-success-soft}.result-card strong{font-size:$dz-fs-caption}.result-card p{margin-top:8rpx;color:#3e7665}.detail-footer{display:flex;gap:14rpx}.detail-footer button{height:76rpx;margin:0;border-radius:$dz-radius-sm;font-size:$dz-fs-caption;line-height:76rpx}.detail-footer .outline{flex:1;border:1rpx solid $dz-brand-primary;color:$dz-brand-deep;background:$dz-surface-card}.detail-footer .primary{flex:1.4;border:0;color:$dz-text-inverse;background:$dz-gradient-brand}.sheet-mask{position:fixed;z-index:70;inset:0;background:rgba(14,28,31,.55)}.form-sheet{position:absolute;right:0;bottom:0;left:0;overflow-y:auto;max-width:750px;max-height:90vh;margin:auto;padding:13rpx 24rpx calc(24rpx + env(safe-area-inset-bottom));border-radius:$dz-radius-lg 30rpx 0 0;background:$dz-surface-card;box-sizing:border-box}.sheet-handle{width:68rpx;height:7rpx;margin:0 auto 12rpx;border-radius:4rpx;background:#d3d9da}.sheet-title{display:flex;align-items:center;justify-content:space-between}.sheet-title strong{font-size:$dz-fs-body}.sheet-title button{width:58rpx;height:58rpx;margin:0;border:0;background:transparent;color:$dz-text-secondary;font-size:$dz-fs-title;line-height:58rpx}.target-summary{display:flex;flex-direction:column;gap:5rpx;margin-top:16rpx;padding:16rpx;border:1rpx solid $dz-border-subtle;border-radius:$dz-radius-sm;background:#fbfdfd}.target-summary small{color:$dz-text-tertiary;font-size:$dz-fs-micro}.target-summary strong{font-size:$dz-fs-caption}.target-summary text{color:$dz-text-secondary;font-size:$dz-fs-micro;line-height:1.5}.field-label{display:block;margin-top:19rpx;font-size:$dz-fs-caption;font-weight:$dz-fw-bold}.reason-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:9rpx;margin-top:12rpx}.reason-grid button{height:57rpx;margin:0;padding:0 5rpx;border:1rpx solid $dz-border-subtle;border-radius:$dz-radius-sm;color:$dz-text-secondary;background:$dz-surface-card;font-size:$dz-fs-micro;line-height:57rpx}.reason-grid button.active{border-color:$dz-brand-primary;color:$dz-brand-deep;background:$dz-brand-soft}.form-sheet textarea{width:100%;height:180rpx;margin-top:12rpx;padding:16rpx;border:1rpx solid $dz-border-subtle;border-radius:$dz-radius-sm;background:$dz-surface-page;font-size:$dz-fs-caption;line-height:1.6;box-sizing:border-box}.counter{margin-top:6rpx;color:$dz-text-tertiary;font-size:$dz-fs-micro;text-align:right}.upload-title{display:flex;align-items:center;justify-content:space-between}.upload-title text{margin-top:19rpx;color:$dz-text-tertiary;font-size:$dz-fs-micro}.upload-list{display:flex;gap:11rpx;margin-top:11rpx}.upload-list>view{position:relative;width:108rpx;height:108rpx}.upload-list image{width:100%;height:100%;border-radius:$dz-radius-sm}.upload-list>view button{position:absolute;right:-7rpx;top:-7rpx;width:31rpx;height:31rpx;margin:0;padding:0;border:0;border-radius:50%;color:$dz-text-inverse;background:rgba(24,37,40,.78);font-size:$dz-fs-caption;line-height:31rpx}.upload-add{display:flex;flex-direction:column;align-items:center;justify-content:center;width:108rpx;height:108rpx;margin:0;border:1rpx dashed #99d8d9;border-radius:$dz-radius-sm;color:$dz-brand-deep;background:$dz-brand-soft}.upload-add strong{font-size:$dz-fs-body-strong;font-weight:$dz-fw-regular}.upload-add text{font-size:$dz-fs-micro}.sheet-submit{width:100%;height:74rpx;margin:22rpx 0 0;border:0;border-radius:$dz-radius-sm;color:$dz-text-inverse;background:$dz-gradient-brand;font-size:$dz-fs-caption;font-weight:$dz-fw-bold;line-height:74rpx}.sheet-submit[disabled]{opacity:.45}.sheet-tip{display:block;margin:12rpx 0 4rpx;padding:14rpx;border-radius:$dz-radius-sm;color:$dz-text-secondary;background:$dz-surface-page;font-size:$dz-fs-micro;line-height:1.6}
.form-sheet textarea.invalid{border-color:$dz-status-danger;background:$dz-status-danger-soft}.field-error{display:block;margin-top:7rpx;color:$dz-status-danger;font-size:$dz-fs-micro}.sheet-submit.blocked{background:#d94a4a}
.feedback-order-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $dz-space-3;
  min-height: max(44px, 88rpx);
  margin-top: $dz-space-2;
  padding: $dz-space-2 $dz-space-3;
  border: 1rpx solid $dz-border-subtle;
  border-radius: $dz-radius-sm;
  background: $dz-surface-subtle;
  box-sizing: border-box;
}
.feedback-order-value {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: $dz-text-secondary;
  font-size: max(14px, #{$dz-fs-body});
  font-weight: $dz-fw-regular;
  line-height: 1.5;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.feedback-order-chevron {
  flex: none;
  width: 12rpx;
  height: 12rpx;
  margin-right: 4rpx;
  border-top: 2rpx solid $dz-text-secondary;
  border-right: 2rpx solid $dz-text-secondary;
  transform: rotate(45deg);
}
.upload-add {
  gap: $dz-space-2;
  padding: 0;
  line-height: 1.4;
}
.upload-add text {
  font-size: max(12px, #{$dz-fs-micro});
  white-space: nowrap;
}
</style>
