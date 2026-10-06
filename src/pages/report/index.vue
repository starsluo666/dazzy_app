<template>
  <view class="dz-page report-page">
    <DzNavBar title="举报有奖" :back-action="goBack" />
    <scroll-view scroll-y class="report-content">
      <main class="report-main dz-container">
        <section class="reward-card">
          <image class="reward-rays" src="/static/report/reward-rays.svg" mode="aspectFill" aria-hidden="true" />
          <view class="reward-envelope" aria-hidden="true"><view class="reward-medal"><text>奖</text></view></view>
          <view class="reward-eyebrow"><i class="eyebrow-line" /><text>举报有奖</text><i class="eyebrow-line" /></view>
        </section>


        <section class="form-card panel order-card">
          <view class="field-title-row">
            <strong class="field-heading">关联订单</strong>
            <text class="required-badge">必选</text>
          </view>
          <text class="field-hint">仅可关联待评价期限内的本人订单</text>
          <view v-if="loading" class="empty-state"><view class="state-icon">…</view><text class="state-title">正在加载可举报订单</text></view>
          <view v-else-if="!rules?.eligible_orders.length" class="empty-state"><view class="state-icon">!</view><text class="state-title">暂无可关联订单</text><small class="state-detail">订单过期、已评价或已举报后将无法关联</small></view>
          <button
            v-for="order in rules?.eligible_orders || []"
            :key="order.order_no"
            class="order-option dz-tappable"
            :class="{ active: orderNo === order.order_no, invalid: attempted && !orderNo }"
            hover-class="dz-pressed"
            @tap="orderNo = order.order_no"
          >
            <view class="order-copy">
              <b class="order-title">{{ order.service_name }} · {{ order.provider_name }}</b>
              <text class="order-number">{{ order.order_no }}</text>
              <small class="order-deadline">评价截止：{{ order.review_expires_at.slice(0, 16).replace('T', ' ') }}</small>
            </view>
            <i aria-hidden="true">{{ orderNo === order.order_no ? '✓' : '' }}</i>
          </button>
          <text v-if="attempted && !orderNo" class="field-error">请选择一个仍在待评价期内的订单</text>
        </section>

        <section class="form-card panel issue-card">
          <view class="field-title-row">
            <strong class="field-heading">举报问题</strong>
            <text class="required-badge">必选</text>
          </view>
          <view class="reason-options">
            <button v-for="item in reasons" :key="item.value" class="dz-tappable" :class="{ active: reason === item.value }" hover-class="dz-pressed" @tap="reason = item.value">{{ item.label }}</button>
          </view>

          <view class="field-title-row field-section">
            <strong class="field-heading">问题描述</strong>
            <text class="required-badge">必填</text>
          </view>
          <view class="textarea-shell" :class="{ invalid: attempted && description.trim().length < 5 }">
            <textarea v-model="description" maxlength="1000" placeholder="请说明发生时间、地点、具体经过和希望平台核查的事项" />
            <text class="counter">{{ description.length }} / 1000</text>
          </view>
          <text v-if="attempted && description.trim().length < 5" class="field-error">问题描述至少填写 5 个字，还差 {{ 5 - description.trim().length }} 字</text>

          <view class="field-title-row field-section">
            <view class="field-heading-group"><strong class="field-heading">证据图片</strong><text class="required-badge">至少 1 张</text></view>
            <text class="upload-count">{{ uploads.length }} / 3</text>
          </view>
          <text class="field-hint">请上传能清晰说明问题的聊天、现场或服务凭证</text>
          <view class="uploads" :class="{ invalid: attempted && !uploads.length }">
            <view v-for="(item, index) in uploads" :key="item.id" class="upload-item">
              <image :src="item.url" mode="aspectFill" />
              <button class="dz-tappable" hover-class="dz-pressed" aria-label="删除图片" @tap="uploads.splice(index, 1)">×</button>
            </view>
            <button v-if="uploads.length < 3" class="upload-add dz-tappable" hover-class="dz-pressed" :disabled="uploading" @tap="chooseImages">
              <b class="upload-symbol">{{ uploading ? '…' : '+' }}</b>
              <text class="upload-label">{{ uploading ? '上传中' : '添加图片' }}</text>
            </button>
          </view>
          <text v-if="attempted && !uploads.length" class="field-error">至少上传一张证据图片</text>
        </section>
        <view class="privacy-note"><text class="privacy-icon" aria-hidden="true">◉</text><span class="privacy-copy">举报材料仅用于平台核查，我们会妥善保护你的隐私。</span></view>
      </main>
    </scroll-view>
    <footer class="action-bar">
      <button
        class="submit-button dz-tappable"
        :class="{ blocked: attempted && (!orderNo || description.trim().length < 5 || !uploads.length) }"
        hover-class="dz-pressed"
        :disabled="submitting || uploading || loading"
        @tap="submit"
      ><text class="submit-icon" aria-hidden="true">➤</text><strong class="submit-label">{{ submitting ? '提交中…' : '提交举报' }}</strong></button>
    </footer>
  </view>
</template>

<script setup lang="ts">
import { navigateBackOr } from '@/utils/navigation'
import DzNavBar from '@/components/DzNavBar.vue'
import { onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { createSupportCase, getRewardReportRules, uploadSupportAttachment } from '@/services/support'
import type { RewardReportRules } from '@/services/support'
import type { SupportCaseReason } from '@/types/api'
import { getErrorMessage } from '@/utils/formatters'

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
function goBack() { navigateBackOr(() => uni.reLaunch({ url: '/pages/profile/index' })) }

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
@use '../../styles/tokens.scss' as *;

.report-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  min-height: 0;
  overflow: hidden;
  padding-bottom: calc(112rpx + env(safe-area-inset-bottom));
  background: $dz-surface-page;
}

.page-head {
  position: sticky;
  top: 0;
  z-index: 20;
  display: grid;
  grid-template-columns: 72rpx 1fr 72rpx;
  height: calc(96rpx + env(safe-area-inset-top));
  flex: none;
  align-items: end;
  padding: env(safe-area-inset-top) 20rpx 12rpx;
  border-bottom: 1rpx solid transparent;
  background: $dz-surface-glass-strong;
  box-sizing: border-box;
}

.page-head::after {
  position: absolute;
  right: 0;
  bottom: -16rpx;
  left: 0;
  height: 16rpx;
  background: linear-gradient(180deg, rgba(31, 65, 72, .05), transparent);
  content: '';
  pointer-events: none;
}

.page-head button {
  display: flex;
  width: 64rpx;
  height: 64rpx;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: $dz-radius-full;
  color: $dz-text-primary;
  background: transparent;
  font-size: $dz-fs-price-lg;
  font-weight: $dz-fw-regular;
  line-height: 1;
}

.page-head button::after,
.order-option::after,
.reason-options button::after,
.upload-item button::after,
.upload-add::after,
.submit-button::after {
  display: none;
}

.page-title {
  padding-bottom: 13rpx;
  font-size: $dz-fs-heading;
  font-weight: $dz-fw-bold;
  line-height: $dz-lh-heading;
  text-align: center;
  letter-spacing: -.02em;
}

.report-content {
  flex: 1;
  height: 0;
  min-height: 0;
}

.report-main {
  padding-top: $dz-space-3;
  padding-bottom: $dz-space-5;
}

.field-title-row,
.field-heading-group,
.privacy-note {
  display: flex;
  align-items: center;
}

.reward-card {
  position: relative;
  overflow: hidden;
  height: 248rpx;
  border: 1rpx solid rgba(255, 255, 255, .55);
  border-radius: $dz-radius-lg;
  color: $dz-text-inverse;
  background: $dz-price-primary;
  box-shadow: 0 18rpx 42rpx rgba(232, 80, 31, .18);
  box-sizing: border-box;
}

.reward-rays {
  position: absolute;
  z-index: 0;
  inset: 0;
  width: 100%;
  height: 100%;
}

.reward-envelope { position: relative; width: 112rpx; height: 134rpx; margin: 22rpx auto 0; border: 2rpx solid #ffd68b; border-radius: 14rpx; background: #d94524; box-shadow: 0 8rpx 24rpx rgba(120,40,10,.18); }
.reward-envelope::before { position: absolute; top: 0; left: 0; right: 0; height: 64rpx; border-bottom: 2rpx solid #ffd68b; border-radius: 10rpx 10rpx 50% 50%; background: #f35f38; content: ''; }
.reward-medal {
  position: absolute;
  z-index: 2;
  top: 40rpx;
  left: 25rpx;
  display: flex;
  width: 62rpx;
  height: 62rpx;
  align-items: center;
  justify-content: center;
  border: 6rpx solid rgba(255, 245, 198, .82);
  border-radius: $dz-radius-full;
  color: #9b5200;
  background: linear-gradient(145deg, #ffe79a, #ffc13e);
  box-shadow: 0 8rpx 20rpx rgba(140, 55, 0, .18), inset 0 0 0 2rpx rgba(255, 255, 255, .55);
  box-sizing: border-box;
}

.reward-medal text { font-size: $dz-fs-body-strong; font-weight: $dz-fw-bold; line-height: 1; }

.reward-eyebrow {
  position: relative;
  z-index: 2;
  display: flex;
  gap: $dz-space-2;
  align-items: center;
  justify-content: center;
  padding-top: 18rpx;
}

.reward-eyebrow text { font-size: $dz-fs-caption; font-weight: $dz-fw-bold; letter-spacing: .16em; }
.eyebrow-line { width: 58rpx; height: 2rpx; background: rgba(255, 255, 255, .72); }


.form-card {
  margin-top: $dz-space-3;
  padding: $dz-space-4;
  border-radius: $dz-radius-lg;
  background: $dz-surface-card;
}

.field-title-row { justify-content: space-between; }
.field-heading-group { gap: $dz-space-2; }
.field-heading { font-size: $dz-fs-body; font-weight: $dz-fw-bold; line-height: $dz-lh-body; }
.required-badge { padding: 4rpx 12rpx; border-radius: $dz-radius-full; color: $dz-status-danger-deep; background: $dz-status-danger-soft; font-size: $dz-fs-micro; line-height: $dz-lh-micro; }
.field-title-row > .required-badge { margin-left: $dz-space-2; margin-right: auto; }
.field-heading-group .required-badge { margin: 0; }
.field-hint { display: block; margin-top: $dz-space-1; color: $dz-text-tertiary; font-size: $dz-fs-micro; line-height: $dz-lh-micro; }
.field-section { margin-top: $dz-space-4; }

.empty-state {
  display: flex;
  min-height: 180rpx;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: $dz-space-1;
  margin-top: $dz-space-3;
  border: 1rpx dashed $dz-border-subtle;
  border-radius: $dz-radius-md;
  color: $dz-text-secondary;
  background: $dz-surface-page;
}

.state-icon { display: flex; width: 50rpx; height: 50rpx; align-items: center; justify-content: center; border-radius: 50%; color: $dz-brand-deep; background: $dz-brand-soft; font-size: $dz-fs-body-strong; font-weight: $dz-fw-bold; }
.state-title { font-size: $dz-fs-caption; }
.state-detail { color: $dz-text-tertiary; font-size: $dz-fs-micro; }

.order-option {
  display: flex;
  width: 100%;
  min-height: 126rpx;
  align-items: center;
  justify-content: space-between;
  margin: $dz-space-3 0 0;
  padding: $dz-space-3;
  border: 2rpx solid $dz-border-subtle;
  border-radius: $dz-radius-md;
  color: $dz-text-primary;
  background: $dz-surface-page;
  text-align: left;
  box-sizing: border-box;
}

.order-option.active { border-color: $dz-brand-primary; background: $dz-brand-soft; box-shadow: 0 0 0 6rpx rgba(24, 199, 198, .1); }
.order-option.invalid { border-color: $dz-status-danger; background: $dz-status-danger-soft; }
.order-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: $dz-space-1; }
.order-title { overflow: hidden; font-size: $dz-fs-caption; line-height: $dz-lh-caption; text-overflow: ellipsis; white-space: nowrap; }
.order-number { color: $dz-text-tertiary; font-size: $dz-fs-micro; line-height: $dz-lh-micro; }
.order-deadline { color: $dz-price-primary; font-size: $dz-fs-micro; line-height: $dz-lh-micro; }
.order-option i { display: flex; width: 48rpx; height: 48rpx; flex: none; align-items: center; justify-content: center; margin-left: $dz-space-2; border: 2rpx solid $dz-border-subtle; border-radius: 50%; color: transparent; background: $dz-surface-card; font-size: $dz-fs-caption; font-style: normal; }
.order-option.active i { border-color: $dz-brand-primary; color: $dz-text-inverse; background: $dz-brand-primary; }

.reason-options { display: flex; flex-wrap: wrap; gap: $dz-space-2; margin-top: $dz-space-3; }
.reason-options button { min-width: 0; height: 64rpx; margin: 0; padding: 0 $dz-space-3; border: 1rpx solid transparent; border-radius: $dz-radius-full; color: $dz-text-secondary; background: $dz-surface-page; font-size: $dz-fs-caption; line-height: 64rpx; }
.reason-options button.active { border-color: $dz-brand-primary; color: $dz-brand-deep; background: $dz-brand-soft; font-weight: $dz-fw-semibold; }

.textarea-shell {
  overflow: hidden;
  margin-top: $dz-space-2;
  border: 2rpx solid transparent;
  border-radius: $dz-radius-md;
  background: $dz-surface-page;
}

.textarea-shell.invalid { border-color: $dz-status-danger; background: $dz-status-danger-soft; }
.textarea-shell textarea { width: 100%; height: 220rpx; padding: $dz-space-3 $dz-space-3 0; color: $dz-text-primary; background: transparent; font-size: $dz-fs-caption; line-height: 1.65; box-sizing: border-box; }
.counter { display: block; padding: 0 $dz-space-3 $dz-space-2; color: $dz-text-tertiary; font-size: $dz-fs-micro; line-height: $dz-lh-micro; text-align: right; }
.field-error { display: block; margin-top: $dz-space-1; color: $dz-status-danger; font-size: $dz-fs-micro; line-height: $dz-lh-micro; }
.upload-count { color: $dz-text-tertiary; font-size: $dz-fs-micro; }

.uploads { display: flex; flex-wrap: wrap; gap: $dz-space-2; margin-top: $dz-space-2; padding: 2rpx; border-radius: $dz-radius-md; }
.uploads.invalid { padding: $dz-space-2; border: 2rpx solid $dz-status-danger; background: $dz-status-danger-soft; }
.upload-item { position: relative; width: 132rpx; height: 132rpx; }
.upload-item image { width: 100%; height: 100%; border-radius: $dz-radius-md; background: $dz-surface-page; }
.upload-item button { position: absolute; right: -6rpx; top: -6rpx; display: flex; width: 40rpx; height: 40rpx; align-items: center; justify-content: center; margin: 0; padding: 0; border: 3rpx solid $dz-surface-card; border-radius: 50%; color: $dz-text-inverse; background: $dz-text-secondary; font-size: $dz-fs-caption; line-height: 1; }
.upload-add { display: flex; width: 132rpx; height: 132rpx; flex-direction: column; align-items: center; justify-content: center; gap: $dz-space-1; margin: 0; padding: 0; border: 2rpx dashed rgba(8, 174, 180, .35); border-radius: $dz-radius-md; color: $dz-brand-deep; background: $dz-brand-soft; }
.upload-symbol { font-size: $dz-fs-heading; font-weight: $dz-fw-regular; line-height: 1; }
.upload-label { font-size: $dz-fs-micro; }
.upload-add[disabled] { opacity: .55; }

.privacy-note { justify-content: center; gap: $dz-space-1; padding: $dz-space-3 $dz-space-2 0; color: $dz-text-tertiary; }
.privacy-icon { color: $dz-brand-deep; font-size: $dz-fs-micro; }
.privacy-copy { font-size: $dz-fs-micro; line-height: $dz-lh-micro; }

.action-bar {
  position: fixed;
  z-index: 30;
  right: 0;
  bottom: 0;
  left: 0;
  max-width: 750px;
  margin: auto;
  padding: 12rpx 28rpx calc(12rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid $dz-border-material;
  background: $dz-surface-glass-strong;
  box-sizing: border-box;
}

.submit-button {
  display: flex;
  width: 100%;
  height: 80rpx;
  align-items: center;
  justify-content: center;
  gap: $dz-space-2;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: $dz-radius-full;
  color: $dz-text-inverse;
  background: $dz-gradient-brand;
  box-shadow: $dz-shadow-brand;
  line-height: 80rpx;
}

.submit-icon { font-size: $dz-fs-body; transform: rotate(-18deg); }
.submit-label { font-size: $dz-fs-body; font-weight: $dz-fw-bold; }
.submit-button.blocked { background: $dz-status-danger; box-shadow: none; }
.submit-button[disabled] { opacity: .5; }

/* #ifdef H5 */
.page-head,
.action-bar { -webkit-backdrop-filter: saturate(180%) blur(22px); backdrop-filter: saturate(180%) blur(22px); }
/* #endif */

@media (prefers-reduced-motion: reduce) {
  .dz-tappable { transform: none; transition: opacity $dz-duration-fast $dz-ease-standard; }
}

@media (prefers-reduced-transparency: reduce) {
  .page-head,
  .action-bar { background: $dz-surface-card; -webkit-backdrop-filter: none; backdrop-filter: none; }
}
</style>
