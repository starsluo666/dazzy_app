<template>
  <view class="cancellation-card">
    <view class="cancellation-card__head"><text class="cancellation-card__title">取消与退款</text><button class="cancellation-card__link" @tap="rulesVisible = true">本单规则 ›</button></view>
    <text v-if="info?.transport_mode_label" class="cancellation-card__note">出行方式 · {{ info.transport_mode_label }}</text>
    <template v-if="info?.wait_state === 'waiting'">
      <text class="cancellation-card__warning">达人报告暂时联系不上你。请在 {{ formatDateTime(info.wait_deadline_at!) }} 前联系；到期可能按规则扣除路费和空单费。</text>
      <button class="cancellation-card__action" :disabled="busy" @tap="respond">我已联系上达人</button>
      <button class="cancellation-card__link" @tap="$emit('support')">到场或联系情况有异议，联系客服</button>
    </template>
    <template v-if="info?.decision?.rule">
      <text class="cancellation-card__note">{{ info.decision.label }}</text>
      <view class="cancellation-card__row"><text>保留费用</text><text>¥{{ money(info.decision.retained_amount || 0) }}</text></view>
      <view class="cancellation-card__row"><text>应退金额（进度见退款记录）</text><text>¥{{ money(info.decision.refund_amount || 0) }}</text></view>
    </template>
    <button v-else-if="info?.can_preview" class="cancellation-card__action" :disabled="busy" @tap="preview">个人原因取消 · 查看退款金额</button>
    <text v-else class="cancellation-card__note">如需取消或对费用有异议，请联系客服。</text>
    <DzBottomSheet :visible="rulesVisible" title="本单取消规则" @close="rulesVisible = false"><OrderCancellationRules :policy="info?.policy || {}" /></DzBottomSheet>
    <DzBottomSheet :visible="!!quote" title="确认取消费用" @close="closeQuote">
      <view v-if="quote" class="cancellation-card__preview">
        <text class="cancellation-card__title">{{ quote.label }}</text>
        <text class="cancellation-card__warning">{{ quote.notice }}</text>
        <view class="cancellation-card__row"><text>本单实付</text><text>¥{{ money(quote.paid_amount) }}</text></view>
        <view class="cancellation-card__row"><text>保留往返交通费</text><text>¥{{ money(quote.retained_travel_amount) }}</text></view>
        <view class="cancellation-card__row"><text>空单补偿／违约金</text><text>¥{{ money(quote.compensation_amount) }}</text></view>
        <view class="cancellation-card__row"><text>保留服务费</text><text>¥{{ money(quote.retained_service_amount) }}</text></view>
        <view class="cancellation-card__row cancellation-card__total"><text>预计原路退回</text><text>¥{{ money(quote.refund_amount) }}</text></view>
        <text class="cancellation-card__note">规则互斥、不额外扣款；退款以到账为准。订单阶段或费用变化时需要重新确认。</text>
        <button class="cancellation-card__action" :disabled="busy" @tap="confirm">{{ busy ? '处理中…' : '确认个人原因取消并接受以上费用' }}</button>
        <button class="cancellation-card__link" :disabled="busy" @tap="quote = null; $emit('support')">不是个人原因，联系平台核查</button>
      </view>
    </DzBottomSheet>
  </view>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import DzBottomSheet from './DzBottomSheet.vue'
import OrderCancellationRules from './OrderCancellationRules.vue'
import { request } from '@/services/http'
import { getErrorMessage, formatBusinessDateTime as formatDateTime } from '@/utils/formatters'
import type { CancellationSummary, CancellationQuote } from '@/types/cancellation'
const props = defineProps<{ orderNo: string; info?: CancellationSummary }>()
const emit = defineEmits<{ changed: []; support: [] }>()
const rulesVisible = ref(false), busy = ref(false)
const quote = ref<CancellationQuote | null>(null)
const money = (value: number) => (value / 100).toFixed(2)
const url = () => `/provider-orders/${encodeURIComponent(props.orderNo)}`
function closeQuote() { if (!busy.value) quote.value = null }
async function preview() {
  if (busy.value) return
  busy.value = true
  try { quote.value = (await request<{ data: CancellationQuote }>(`${url()}/cancellation/`)).data }
  catch (e) { uni.showToast({ title: getErrorMessage(e, '暂时无法预览，请联系客服'), icon: 'none' }); emit('changed') }
  finally { busy.value = false }
}
async function confirm() {
  if (busy.value || !quote.value) return
  busy.value = true
  try { await request(`${url()}/cancellation/`, { method: 'POST', data: { token: quote.value.token, personal_reason_confirmed: true } }); quote.value = null; emit('changed') }
  catch (e) { quote.value = null; uni.showToast({ title: getErrorMessage(e, '取消失败，请重新预览'), icon: 'none' }); emit('changed') }
  finally { busy.value = false }
}
async function respond() {
  if (busy.value) return
  busy.value = true
  try { await request(`${url()}/customer-wait/`, { method: 'POST', data: { action: 'respond' } }); emit('changed') }
  catch (e) { uni.showToast({ title: getErrorMessage(e, '反馈失败，请联系客服'), icon: 'none' }) }
  finally { busy.value = false }
}
</script>
<style scoped>
.cancellation-card { background: #fff; padding: 28rpx; border: 1rpx solid #e4eded; border-radius: 26rpx; margin-bottom: 24rpx; }
.cancellation-card__head, .cancellation-card__row { display: flex; justify-content: space-between; align-items: center; gap: 20rpx; }
.cancellation-card__title { font-size: 30rpx; font-weight: 600; color: #182230; }
.cancellation-card__row { padding: 18rpx 0; font-size: 27rpx; color: #344054; font-variant-numeric: tabular-nums; }
.cancellation-card__note { display: block; font-size: 24rpx; color: #667085; line-height: 1.7; margin: 16rpx 0; }
.cancellation-card__warning { display: block; padding: 22rpx; background: #fff7ed; color: #9a5825; border-radius: 18rpx; font-size: 26rpx; line-height: 1.7; margin: 20rpx 0; }
.cancellation-card__action { margin: 22rpx 0 0; background: #e7f7f7; color: #007e86; padding: 22rpx 16rpx; border-radius: 18rpx; font-size: 27rpx; font-weight: 600; line-height: 1.5; }
.cancellation-card__link { background: transparent; color: #007e86; font-size: 25rpx; margin: 0; padding: 16rpx 0; line-height: 1.5; }
.cancellation-card__action::after, .cancellation-card__link::after { border: 0; }
.cancellation-card__total { border-top: 1rpx solid #e4eded; color: #007e86; font-weight: 600; }
.cancellation-card__preview { padding-bottom: 32rpx; }
</style>
