<template>
  <view class="dz-page support-page">
    <header class="page-head">
      <button aria-label="返回" @tap="goBack">‹</button>
      <text>{{ selected ? '工单详情' : '客服中心' }}</text>
      <view />
    </header>

    <main v-if="!selected" class="support-content dz-container">
      <section class="support-hero">
        <view class="hero-icon"><image src="/static/functions/customer-service.svg" mode="aspectFit" /></view>
        <view><strong>有问题，我们来帮你</strong><text>工单会保留完整处理记录</text></view>
      </section>

      <section class="quick-actions panel">
        <button @tap="openCreate('consultation')">
          <view class="quick-icon cyan"><image src="/static/functions/feedback.svg" mode="aspectFit" /></view>
          <view><strong>提交问题</strong><text>遇到使用问题，提交工单获得帮助</text></view><b>›</b>
        </button>
        <button @tap="openCreate('complaint')">
          <view class="quick-icon orange"><image src="/static/functions/report-reward.svg" mode="aspectFit" /></view>
          <view><strong>投诉 / 举报</strong><text>服务不满意或存在违规，提交平台核查</text></view><b>›</b>
        </button>
      </section>

      <view class="case-tabs">
        <button v-for="tab in tabs" :key="tab.key" :class="{ active: activeTab === tab.key }" @tap="activeTab = tab.key">{{ tab.label }}</button>
      </view>

      <view class="list-heading"><strong>我的工单</strong><text>完整展示历史处理记录</text></view>
      <view v-if="loading" class="state">正在加载工单…</view>
      <view v-else-if="error" class="state error" role="button" @tap="loadCases">{{ error }}，点击重试</view>
      <view v-else-if="!filteredCases.length" class="empty-state">
        <view>✓</view><strong>当前没有{{ activeTab === 'all' ? '' : '相关' }}工单</strong><text>需要帮助时，可以随时提交问题</text>
      </view>
      <view v-else class="case-list">
        <button v-for="item in filteredCases" :key="item.case_no" class="case-card" @tap="openDetail(item)">
          <view class="case-top"><strong>{{ item.case_no }}</strong><text :class="statusTone(item.status)">{{ item.status_label }}</text><b>›</b></view>
          <view class="case-meta"><text :class="item.case_type">{{ item.case_type_label }}</text><span>· {{ item.target_type_label }}</span><small>{{ formatDateTime(item.created_at) }}</small></view>
          <strong class="case-subject">{{ item.reason_label }}</strong>
          <p>{{ item.description }}</p>
          <view v-if="latestRecord(item)" class="latest"><i /> <text>{{ latestRecord(item)?.record_type_label }}：</text><span>{{ latestRecord(item)?.content || '工单状态已更新' }}</span></view>
          <view class="case-foot"><text>{{ item.attachment_urls.length ? `附件 ${item.attachment_urls.length}` : '无附件' }}</text><text>查看进度　›</text></view>
        </button>
      </view>
      <view class="refund-hint">ⓘ　涉及支付、退款的问题，请在对应订单详情页发起售后</view>
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
          <i /><view><strong>{{ record.record_type_label }}</strong><small>{{ record.actor_name }} · {{ formatDateTime(record.created_at) }}</small><p v-if="record.content">{{ record.content }}</p></view>
        </view>
      </section>

      <section v-if="selected.result_note" class="result-card">
        <strong>平台处理结论</strong><p>{{ selected.result_note }}</p>
      </section>
    </main>

    <footer v-if="!selected" class="support-footer"><button @tap="openCreate('consultation')">＋　新建工单</button></footer>
    <footer v-else-if="canOperateSelected" class="detail-footer">
      <button v-if="isOpen(selected.status)" class="outline" @tap="openReply">补充说明</button>
      <button v-if="canRequestReview" class="primary" @tap="openReview">申请复核</button>
    </footer>

    <view v-if="sheetMode" class="sheet-mask" @tap.self="closeSheet">
      <section class="form-sheet">
        <view class="sheet-handle" />
        <view class="sheet-title"><strong>{{ sheetTitle }}</strong><button aria-label="关闭" @tap="closeSheet">×</button></view>

        <template v-if="sheetMode === 'create'">
          <view class="type-switch">
            <button v-for="item in caseTypes" :key="item.value" :class="{ active: form.caseType === item.value }" @tap="form.caseType = item.value">{{ item.label }}</button>
          </view>
          <view class="target-summary"><small>关联对象</small><strong>{{ form.targetTitle || '平台服务' }}</strong><text>{{ form.targetType === 'general' ? '反馈指定达人、订单、活动或评价时，请从对应详情页进入' : targetTypeLabel(form.targetType) }}</text></view>
          <label class="field-label">问题分类</label>
          <view class="reason-grid">
            <button v-for="item in reasonOptions" :key="item.value" :class="{ active: form.reason === item.value }" @tap="form.reason = item.value">{{ item.label }}</button>
          </view>
          <label class="field-label">问题说明</label>
          <textarea v-model="form.description" maxlength="1000" placeholder="请描述发生时间、具体经过和希望平台协助的事项" />
          <view class="counter">{{ form.description.length }}/1000</view>
          <view class="upload-title"><label class="field-label">证据图片</label><text>{{ uploads.length }}/3</text></view>
          <view class="upload-list">
            <view v-for="(image, index) in uploads" :key="image.id"><image :src="image.url" mode="aspectFill" /><button @tap="uploads.splice(index, 1)">×</button></view>
            <button v-if="uploads.length < 3" class="upload-add" :disabled="uploading" @tap="chooseImages"><strong>{{ uploading ? '…' : '+' }}</strong><text>{{ uploading ? '上传中' : '添加图片' }}</text></button>
          </view>
          <button class="sheet-submit" :disabled="submitting || uploading || form.description.trim().length < 5" @tap="submitCase">{{ submitting ? '提交中…' : '提交工单' }}</button>
        </template>

        <template v-else>
          <text class="sheet-tip">{{ sheetMode === 'reply' ? '补充信息会同步给处理客服并写入工单时间线。' : '请说明对处理结果有异议的原因和新增依据；每张工单仅可申请一次复核。' }}</text>
          <textarea v-model="messageText" maxlength="1000" :placeholder="sheetMode === 'reply' ? '请输入需要补充的情况' : '请输入申请复核的具体原因'" />
          <view class="counter">{{ messageText.length }}/1000</view>
          <button class="sheet-submit" :disabled="submitting || messageText.trim().length < (sheetMode === 'reply' ? 2 : 5)" @tap="submitMessage">{{ submitting ? '提交中…' : sheetMode === 'reply' ? '提交补充' : '提交复核申请' }}</button>
        </template>
      </section>
    </view>
  </view>
</template>

<script setup lang="ts">
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
import type { SupportCase, SupportCaseReason, SupportCaseStatus, SupportCaseType, SupportTargetType } from '@/types/api'
import { formatBusinessDateTime, getErrorMessage } from '@/utils/formatters'

type UploadItem = { id: string; url: string }
type SheetMode = '' | 'create' | 'reply' | 'review'

const cases = ref<SupportCase[]>([])
const selected = ref<SupportCase | null>(null)
const loading = ref(true)
const error = ref('')
const activeTab = ref<'all' | 'processing' | 'completed'>('all')
const sheetMode = ref<SheetMode>('')
const submitting = ref(false)
const uploading = ref(false)
const uploads = ref<UploadItem[]>([])
const messageText = ref('')
const pendingCaseNo = ref('')
const routePrefill = reactive({
  caseType: 'consultation' as SupportCaseType,
  targetType: 'general' as SupportTargetType,
  targetId: '',
  targetTitle: '',
  reason: 'other' as SupportCaseReason,
})
const form = reactive({
  caseType: 'consultation' as SupportCaseType,
  targetType: 'general' as SupportTargetType,
  targetId: '',
  targetTitle: '',
  reason: 'other' as SupportCaseReason,
  description: '',
})

const tabs = [
  { key: 'all' as const, label: '全部' },
  { key: 'processing' as const, label: '处理中' },
  { key: 'completed' as const, label: '已完结' },
]
const caseTypes = [
  { value: 'consultation' as const, label: '咨询' },
  { value: 'complaint' as const, label: '投诉' },
  { value: 'report' as const, label: '举报' },
]
const reasonOptions: Array<{ value: SupportCaseReason; label: string }> = [
  { value: 'service_quality', label: '服务体验' },
  { value: 'false_information', label: '信息不实' },
  { value: 'inappropriate_content', label: '内容不当' },
  { value: 'private_transaction', label: '私下交易' },
  { value: 'safety_risk', label: '安全风险' },
  { value: 'account_issue', label: '账号问题' },
  { value: 'other', label: '其他问题' },
]

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
const sheetTitle = computed(() => sheetMode.value === 'create' ? '新建客服工单' : sheetMode.value === 'reply' ? '补充说明' : '申请复核')

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
function goBack() {
  if (selected.value) { selected.value = null; return }
  uni.navigateBack()
}
function openCreate(type: SupportCaseType) {
  form.caseType = routePrefill.targetType === 'general' ? type : routePrefill.caseType
  form.targetType = routePrefill.targetType
  form.targetId = routePrefill.targetId
  form.targetTitle = routePrefill.targetTitle
  form.reason = routePrefill.targetType === 'general' ? 'other' : routePrefill.reason
  form.description = ''
  uploads.value = []
  sheetMode.value = 'create'
}
function closeSheet() { if (!submitting.value && !uploading.value) sheetMode.value = '' }
async function loadCases() {
  loading.value = true
  error.value = ''
  try { cases.value = (await getSupportCases()).data.items }
  catch (reason) { error.value = getErrorMessage(reason, '工单加载失败') }
  finally { loading.value = false }
}
async function loadPage() {
  await loadCases()
  if (!pendingCaseNo.value) return
  try { selected.value = (await getSupportCase(pendingCaseNo.value)).data }
  catch (reason) { uni.showToast({ title: getErrorMessage(reason, '工单详情加载失败'), icon: 'none' }) }
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
  if (submitting.value || form.description.trim().length < 5) return
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
    uni.showToast({ title: response.created ? '工单已提交' : '已存在处理中工单', icon: 'success' })
  } catch (reason) {
    uni.showToast({ title: getErrorMessage(reason, '提交失败'), icon: 'none' })
  } finally { submitting.value = false }
}
function openReply() { messageText.value = ''; sheetMode.value = 'reply' }
function openReview() { messageText.value = ''; sheetMode.value = 'review' }
async function submitMessage() {
  if (!selected.value || submitting.value) return
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
  const allowedTypes: SupportCaseType[] = ['consultation', 'complaint', 'report']
  const allowedReasons = reasonOptions.map((item) => item.value)
  if (typeof query?.targetType === 'string' && allowedTargets.includes(query.targetType as SupportTargetType)) routePrefill.targetType = query.targetType as SupportTargetType
  if (typeof query?.caseType === 'string' && allowedTypes.includes(query.caseType as SupportCaseType)) routePrefill.caseType = query.caseType as SupportCaseType
  if (typeof query?.targetId === 'string') routePrefill.targetId = query.targetId
  if (typeof query?.targetTitle === 'string') routePrefill.targetTitle = decodeURIComponent(query.targetTitle)
  if (typeof query?.reason === 'string' && allowedReasons.includes(query.reason as SupportCaseReason)) routePrefill.reason = query.reason as SupportCaseReason
  if (typeof query?.caseNo === 'string') pendingCaseNo.value = query.caseNo
  if (query?.mode === 'new') openCreate(routePrefill.caseType)
})
onShow(loadPage)
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;
.support-page{min-height:100vh;padding-bottom:calc(126rpx + env(safe-area-inset-bottom));background:$dz-surface-page}.page-head{position:sticky;z-index:20;top:0;display:grid;grid-template-columns:72rpx 1fr 72rpx;align-items:end;height:calc(96rpx + env(safe-area-inset-top));padding:0 18rpx 17rpx;background:rgba(255,255,255,.96);box-sizing:border-box}.page-head button{width:64rpx;height:64rpx;margin:0;padding:0;border:0;background:transparent;font-size:49rpx;line-height:58rpx}.page-head button::after,.quick-actions button::after,.case-tabs button::after,.case-card::after,.support-footer button::after,.detail-footer button::after,.sheet-title button::after,.type-switch button::after,.reason-grid button::after,.upload-list button::after,.sheet-submit::after{display:none}.page-head>text{text-align:center;font-size:31rpx;font-weight:800}.support-content,.detail-content{padding:22rpx 24rpx 40rpx}.support-hero{display:flex;align-items:center;gap:25rpx;padding:25rpx 28rpx;border:1rpx solid #e0eded;border-radius:24rpx;background:linear-gradient(135deg,#fff,#effbfb)}.hero-icon{display:flex;align-items:center;justify-content:center;width:112rpx;height:112rpx;border-radius:50%;background:#dff8f8}.hero-icon image{width:78rpx;height:78rpx}.support-hero>view:last-child{display:flex;flex-direction:column;gap:10rpx}.support-hero strong{font-size:29rpx}.support-hero text{color:$dz-text-secondary;font-size:20rpx}.panel{background:#fff;box-shadow:$dz-shadow-card}.quick-actions{margin-top:20rpx;padding:0 22rpx;border-radius:24rpx}.quick-actions button{display:grid;grid-template-columns:82rpx 1fr 28rpx;align-items:center;width:100%;min-height:126rpx;margin:0;padding:18rpx 0;border:0;border-bottom:1rpx solid $dz-border-subtle;background:#fff;text-align:left}.quick-actions button:last-child{border-bottom:0}.quick-icon{display:flex;align-items:center;justify-content:center;width:68rpx;height:68rpx;border-radius:50%;background:$dz-brand-soft}.quick-icon.orange{background:#fff0e8}.quick-icon image{width:49rpx;height:49rpx}.quick-actions button>view:nth-child(2){display:flex;flex-direction:column;gap:7rpx}.quick-actions strong{font-size:25rpx}.quick-actions text{color:$dz-text-secondary;font-size:18rpx}.quick-actions b{color:$dz-text-tertiary;font-size:39rpx;font-weight:400}.case-tabs{display:grid;grid-template-columns:repeat(3,1fr);margin-top:24rpx;border:1rpx solid $dz-border-subtle;border-radius:21rpx;background:#fff}.case-tabs button{position:relative;height:70rpx;margin:0;border:0;background:transparent;color:$dz-text-secondary;font-size:21rpx;line-height:70rpx}.case-tabs button.active{color:$dz-brand-deep;font-weight:700}.case-tabs button.active::before{position:absolute;right:30%;bottom:0;left:30%;height:5rpx;border-radius:3rpx;background:$dz-brand-primary;content:''}.list-heading{display:flex;align-items:center;justify-content:space-between;margin:28rpx 4rpx 15rpx}.list-heading strong{font-size:28rpx}.list-heading text{color:$dz-text-tertiary;font-size:17rpx}.case-list{display:flex;flex-direction:column;gap:16rpx}.case-card{display:flex;flex-direction:column;width:100%;margin:0;padding:21rpx 22rpx;border:1rpx solid $dz-border-subtle;border-radius:22rpx;background:#fff;text-align:left;box-shadow:0 7rpx 22rpx rgba(38,67,73,.05);box-sizing:border-box}.case-top{display:flex;align-items:center}.case-top>strong{font-size:20rpx;font-weight:600}.case-top>text{margin-left:auto;padding:6rpx 11rpx;border-radius:8rpx;font-size:17rpx}.case-top>b{margin-left:10rpx;color:$dz-text-tertiary;font-size:28rpx;font-weight:400}.case-top .pending{color:#b46818;background:#fff3df}.case-top .processing{color:$dz-brand-deep;background:$dz-brand-soft}.case-top .reviewing{color:#a86213;background:#fff0df}.case-top .completed{color:#27815f;background:#eaf8f1}.case-top .rejected{color:#8d5d59;background:#f7eeee}.case-meta{display:flex;align-items:center;gap:7rpx;margin-top:14rpx;color:$dz-text-secondary;font-size:18rpx}.case-meta>text{padding:4rpx 8rpx;border-radius:7rpx;color:$dz-brand-deep;background:$dz-brand-soft}.case-meta>text.complaint,.case-meta>text.report{color:#de5d22;background:#fff0e9}.case-meta small{margin-left:auto;color:$dz-text-tertiary;font-size:16rpx}.case-subject{margin-top:14rpx;font-size:24rpx}.case-card>p{overflow:hidden;margin:9rpx 0 0;color:$dz-text-secondary;font-size:19rpx;line-height:29rpx;text-overflow:ellipsis;white-space:nowrap}.latest{display:flex;align-items:center;overflow:hidden;margin-top:14rpx;padding:13rpx;border-radius:12rpx;background:#f3fafa;font-size:17rpx;white-space:nowrap}.latest i{flex:0 0 auto;width:11rpx;height:11rpx;margin-right:8rpx;border-radius:50%;background:$dz-brand-primary}.latest text{color:$dz-brand-deep}.latest span{overflow:hidden;color:$dz-text-secondary;text-overflow:ellipsis}.case-foot{display:flex;justify-content:space-between;margin-top:14rpx;padding-top:12rpx;border-top:1rpx solid $dz-border-subtle;color:$dz-text-tertiary;font-size:16rpx}.case-foot text:last-child{color:$dz-brand-deep}.refund-hint{margin:20rpx 0 0;padding:16rpx;border-radius:14rpx;color:$dz-text-secondary;background:#eef4f5;font-size:17rpx;line-height:1.5}.state,.empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:320rpx;color:$dz-text-secondary;font-size:20rpx}.state.error{color:#c6633b}.empty-state view{display:flex;align-items:center;justify-content:center;width:72rpx;height:72rpx;border-radius:50%;color:#fff;background:$dz-brand-primary;font-size:35rpx}.empty-state strong{margin-top:18rpx;color:$dz-text-primary;font-size:24rpx}.empty-state text{margin-top:8rpx;color:$dz-text-tertiary;font-size:18rpx}.support-footer,.detail-footer{position:fixed;z-index:25;right:0;bottom:0;left:0;max-width:750px;margin:auto;padding:12rpx 24rpx calc(12rpx + env(safe-area-inset-bottom));background:#fff;box-shadow:0 -7rpx 24rpx rgba(28,61,68,.08)}.support-footer button{width:100%;height:78rpx;margin:0;border:0;border-radius:18rpx;color:#fff;background:$dz-gradient-brand;font-size:25rpx;font-weight:700;line-height:78rpx}.detail-content{padding-bottom:45rpx}.detail-status{display:flex;align-items:center;justify-content:space-between;padding:25rpx;border-radius:23rpx;background:#eafbfb}.detail-status.pending,.detail-status.reviewing{background:#fff4e6}.detail-status.rejected{background:#f7eeee}.detail-status>view{display:flex;flex-direction:column;gap:7rpx}.detail-status text{color:$dz-brand-deep;font-size:19rpx}.detail-status strong{font-size:28rpx}.detail-status small{color:$dz-text-secondary;font-size:17rpx}.detail-status>i{display:flex;align-items:center;justify-content:center;width:70rpx;height:70rpx;border-radius:50%;color:#fff;background:$dz-brand-primary;font-size:32rpx;font-style:normal}.detail-card{margin-top:18rpx;padding:23rpx;border-radius:21rpx}.detail-card h2{margin:0 0 18rpx;font-size:24rpx}.target-row{display:flex;align-items:center}.target-row>view{display:flex;align-items:center;justify-content:center;width:66rpx;height:66rpx;border-radius:17rpx;color:$dz-brand-deep;background:$dz-brand-soft;font-size:28rpx;font-weight:700}.target-row span{display:flex;flex-direction:column;gap:6rpx;margin-left:16rpx}.target-row strong{font-size:22rpx}.target-row text{color:$dz-text-secondary;font-size:18rpx}.detail-card>p,.result-card p{margin:0;color:$dz-text-secondary;font-size:20rpx;line-height:1.7;white-space:pre-wrap}.attachments{display:grid;grid-template-columns:repeat(3,1fr);gap:10rpx;margin-top:18rpx}.attachments image{width:100%;height:150rpx;border-radius:13rpx}.timeline-item{position:relative;display:grid;grid-template-columns:22rpx 1fr;gap:14rpx;padding-bottom:24rpx}.timeline-item::before{position:absolute;left:9rpx;top:18rpx;bottom:0;width:2rpx;background:#d9ecec;content:''}.timeline-item:last-child::before{display:none}.timeline-item>i{z-index:1;width:18rpx;height:18rpx;margin-top:5rpx;border:4rpx solid #d9f7f7;border-radius:50%;background:$dz-brand-primary;box-sizing:border-box}.timeline-item>view{display:flex;flex-direction:column;gap:6rpx}.timeline-item strong{font-size:20rpx}.timeline-item small{color:$dz-text-tertiary;font-size:16rpx}.timeline-item p{margin:5rpx 0 0;padding:13rpx;border-radius:11rpx;color:$dz-text-secondary;background:$dz-surface-page;font-size:18rpx;line-height:1.55}.result-card{margin-top:18rpx;padding:21rpx;border-radius:19rpx;color:#20765b;background:#eaf8f1}.result-card strong{font-size:21rpx}.result-card p{margin-top:8rpx;color:#3e7665}.detail-footer{display:flex;gap:14rpx}.detail-footer button{height:76rpx;margin:0;border-radius:18rpx;font-size:23rpx;line-height:76rpx}.detail-footer .outline{flex:1;border:1rpx solid $dz-brand-primary;color:$dz-brand-deep;background:#fff}.detail-footer .primary{flex:1.4;border:0;color:#fff;background:$dz-gradient-brand}.sheet-mask{position:fixed;z-index:70;inset:0;background:rgba(14,28,31,.55)}.form-sheet{position:absolute;right:0;bottom:0;left:0;overflow-y:auto;max-width:750px;max-height:90vh;margin:auto;padding:13rpx 24rpx calc(24rpx + env(safe-area-inset-bottom));border-radius:30rpx 30rpx 0 0;background:#fff;box-sizing:border-box}.sheet-handle{width:68rpx;height:7rpx;margin:0 auto 12rpx;border-radius:4rpx;background:#d3d9da}.sheet-title{display:flex;align-items:center;justify-content:space-between}.sheet-title strong{font-size:28rpx}.sheet-title button{width:58rpx;height:58rpx;margin:0;border:0;background:transparent;color:$dz-text-secondary;font-size:38rpx;line-height:58rpx}.type-switch{display:grid;grid-template-columns:repeat(3,1fr);gap:10rpx;margin-top:15rpx;padding:7rpx;border-radius:16rpx;background:$dz-surface-page}.type-switch button{height:58rpx;margin:0;border:0;border-radius:12rpx;color:$dz-text-secondary;background:transparent;font-size:20rpx;line-height:58rpx}.type-switch button.active{color:$dz-brand-deep;background:#fff;font-weight:700;box-shadow:0 4rpx 12rpx rgba(31,73,78,.08)}.target-summary{display:flex;flex-direction:column;gap:5rpx;margin-top:16rpx;padding:16rpx;border:1rpx solid $dz-border-subtle;border-radius:15rpx;background:#fbfdfd}.target-summary small{color:$dz-text-tertiary;font-size:16rpx}.target-summary strong{font-size:21rpx}.target-summary text{color:$dz-text-secondary;font-size:16rpx;line-height:1.5}.field-label{display:block;margin-top:19rpx;font-size:21rpx;font-weight:700}.reason-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:9rpx;margin-top:12rpx}.reason-grid button{height:57rpx;margin:0;padding:0 5rpx;border:1rpx solid $dz-border-subtle;border-radius:11rpx;color:$dz-text-secondary;background:#fff;font-size:17rpx;line-height:57rpx}.reason-grid button.active{border-color:$dz-brand-primary;color:$dz-brand-deep;background:$dz-brand-soft}.form-sheet textarea{width:100%;height:180rpx;margin-top:12rpx;padding:16rpx;border:1rpx solid $dz-border-subtle;border-radius:15rpx;background:#f8fafb;font-size:19rpx;line-height:1.6;box-sizing:border-box}.counter{margin-top:6rpx;color:$dz-text-tertiary;font-size:15rpx;text-align:right}.upload-title{display:flex;align-items:center;justify-content:space-between}.upload-title text{margin-top:19rpx;color:$dz-text-tertiary;font-size:16rpx}.upload-list{display:flex;gap:11rpx;margin-top:11rpx}.upload-list>view{position:relative;width:108rpx;height:108rpx}.upload-list image{width:100%;height:100%;border-radius:13rpx}.upload-list>view button{position:absolute;right:-7rpx;top:-7rpx;width:31rpx;height:31rpx;margin:0;padding:0;border:0;border-radius:50%;color:#fff;background:rgba(24,37,40,.78);font-size:20rpx;line-height:31rpx}.upload-add{display:flex;flex-direction:column;align-items:center;justify-content:center;width:108rpx;height:108rpx;margin:0;border:1rpx dashed #99d8d9;border-radius:13rpx;color:$dz-brand-deep;background:#f3fbfb}.upload-add strong{font-size:31rpx;font-weight:400}.upload-add text{font-size:15rpx}.sheet-submit{width:100%;height:74rpx;margin:22rpx 0 0;border:0;border-radius:17rpx;color:#fff;background:$dz-gradient-brand;font-size:23rpx;font-weight:700;line-height:74rpx}.sheet-submit[disabled]{opacity:.45}.sheet-tip{display:block;margin:12rpx 0 4rpx;padding:14rpx;border-radius:13rpx;color:$dz-text-secondary;background:$dz-surface-page;font-size:18rpx;line-height:1.6}
</style>
