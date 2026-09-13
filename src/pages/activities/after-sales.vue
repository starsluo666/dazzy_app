<template>
  <view class="dz-page after-sales-page">
    <header class="page-head"><button aria-label="返回" @tap="goBack">‹</button><text>活动退款 / 售后</text></header>
    <view v-if="loading" class="state">正在加载售后信息…</view>
    <view v-else-if="error" class="state"><text>{{ error }}</text><button @tap="load">重新加载</button></view>
    <main v-else-if="activity" class="content">
      <section class="activity-summary panel"><strong>{{ activity.title }}</strong><text>{{ formatRange(activity.starts_at, activity.ends_at) }}</text><text>{{ activity.meeting_place_name }}</text><view><span>已支付金额</span><b>¥{{ money(activity.payable_amount) }}</b></view></section>

      <section v-if="latestCase" class="case-card panel">
        <view class="case-head"><div><small>售后单 {{ latestCase.case_no }}</small><strong>{{ latestCase.reason_label }}</strong></div><text :class="latestCase.status">{{ latestCase.status_label }}</text></view>
        <p>{{ latestCase.description }}</p>
        <view class="amount-row"><span>申请退款</span><b>¥{{ money(latestCase.requested_amount) }}</b></view>
        <view v-if="latestCase.refund_order" class="refund-result"><strong>{{ latestCase.refund_order.status_label }}</strong><text>退款 ¥{{ money(latestCase.refund_order.refund_amount) }} · {{ latestCase.refund_order.refund_no }}</text></view>
        <view v-if="latestCase.result_note" class="result-note"><small>客服处理结论</small><text>{{ latestCase.result_note }}</text></view>
      </section>

      <template v-else>
        <section class="form-card panel"><text class="section-title">选择售后原因</text><view class="reasons"><button v-for="item in reasons" :key="item.value" :class="{ active: reason === item.value }" @tap="reason = item.value"><strong>{{ item.label }}</strong><text>{{ item.hint }}</text></button></view></section>
        <section class="form-card panel"><text class="section-title">问题说明</text><textarea v-model="description" maxlength="1000" placeholder="请描述实际情况、发生时间和退款诉求，客服将结合活动规则审核。" /><text class="counter">{{ description.length }}/1000</text></section>
        <section class="notice"><strong>提交前请确认</strong><text>普通主动退出建议先在活动详情选择“按规则取消”；不可抗力、疾病事故、活动信息不符或未履约等情况可提交售后审核。</text></section>
      </template>
    </main>
    <footer v-if="activity && !latestCase" class="submit-footer"><button :disabled="submitting || description.trim().length < 5" @tap="submit">{{ submitting ? '正在提交…' : '提交售后申请' }}</button></footer>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

import { createActivityAfterSales, getActivityAfterSales } from '@/services/activities'
import { getActivityDetail } from '@/services/discovery'
import type { ActivityAfterSalesCase, ActivityDetail } from '@/types/api'
import { formatActivityRange, formatAmount, getErrorMessage } from '@/utils/formatters'

const reasons = [
  { label: '不可抗力', hint: '天气、公共事件等', value: 'force_majeure' },
  { label: '疾病或事故', hint: '突发疾病、交通事故', value: 'illness_or_accident' },
  { label: '信息不实', hint: '页面描述与实际不符', value: 'false_information' },
  { label: '内容不符', hint: '活动内容临时改变', value: 'content_mismatch' },
  { label: '场地变更', hint: '未经同意变更地点', value: 'venue_change' },
  { label: '活动未履约', hint: '活动未正常开展', value: 'not_fulfilled' },
  { label: '其他问题', hint: '补充说明具体情况', value: 'other' },
]
const activityId = ref(0)
const activity = ref<ActivityDetail | null>(null)
const latestCase = ref<ActivityAfterSalesCase | null>(null)
const reason = ref('illness_or_accident')
const description = ref('')
const loading = ref(true)
const submitting = ref(false)
const error = ref('')
const money = formatAmount
const formatRange = formatActivityRange
function goBack() { uni.navigateBack() }
async function load() { loading.value = true; error.value = ''; try { const [detail, cases] = await Promise.all([getActivityDetail(activityId.value), getActivityAfterSales(activityId.value)]); activity.value = detail.data; latestCase.value = cases.data.items[0] || null } catch (reasonValue) { error.value = getErrorMessage(reasonValue, '售后信息加载失败') } finally { loading.value = false } }
async function submit() { if (submitting.value || description.value.trim().length < 5) return; submitting.value = true; try { latestCase.value = (await createActivityAfterSales(activityId.value, reason.value, description.value.trim())).data; uni.showToast({ title: '售后申请已提交', icon: 'success' }) } catch (reasonValue) { uni.showToast({ title: getErrorMessage(reasonValue, '提交失败'), icon: 'none' }) } finally { submitting.value = false } }
onLoad((query) => { activityId.value = Number(query?.id) || 0; if (activityId.value) load(); else { loading.value = false; error.value = '缺少活动编号' } })
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;
.after-sales-page{min-height:100vh;padding-bottom:calc(128rpx + env(safe-area-inset-bottom));background:$dz-surface-page}.page-head{position:sticky;z-index:12;top:0;display:flex;align-items:flex-end;justify-content:center;height:calc(98rpx + env(safe-area-inset-top));padding-bottom:18rpx;background:$dz-surface-card;box-sizing:border-box}.page-head button{position:absolute;left:20rpx;bottom:7rpx;width:70rpx;height:70rpx;margin:0;padding:0;border:0;background:transparent;font-size:$dz-fs-price-lg;line-height:70rpx}.page-head button::after,.reasons button::after,.submit-footer button::after,.state button::after{display:none}.page-head text{font-size:$dz-fs-body-strong;font-weight:$dz-fw-bold}.content{padding:22rpx 24rpx}.panel{padding:24rpx;border-radius:$dz-radius-md;background:$dz-surface-card;box-shadow:$dz-shadow-card}.activity-summary{display:flex;flex-direction:column;gap:10rpx}.activity-summary>strong{font-size:$dz-fs-body-strong}.activity-summary>text{color:$dz-text-secondary;font-size:$dz-fs-caption}.activity-summary>view,.amount-row{display:flex;align-items:center;justify-content:space-between;margin-top:8rpx;padding-top:18rpx;border-top:1rpx dashed $dz-border-subtle}.activity-summary span,.amount-row span{color:$dz-text-secondary;font-size:$dz-fs-caption}.activity-summary b,.amount-row b{color:$dz-price-primary;font-size:$dz-fs-body-strong}.form-card,.case-card{margin-top:20rpx}.section-title{display:block;margin-bottom:18rpx;font-size:$dz-fs-body;font-weight:$dz-fw-bold}.reasons{display:grid;grid-template-columns:1fr 1fr;gap:14rpx}.reasons button{display:flex;flex-direction:column;gap:6rpx;min-height:92rpx;margin:0;padding:15rpx 17rpx;border:1rpx solid $dz-border-subtle;border-radius:$dz-radius-sm;background:$dz-surface-card;text-align:left}.reasons button.active{border-color:$dz-brand-primary;background:$dz-brand-soft}.reasons strong{font-size:$dz-fs-caption}.reasons text{color:$dz-text-tertiary;font-size:$dz-fs-micro}.form-card textarea{width:100%;height:220rpx;padding:18rpx;border:1rpx solid $dz-border-subtle;border-radius:$dz-radius-sm;background:$dz-surface-page;font-size:$dz-fs-caption;line-height:1.6;box-sizing:border-box}.counter{display:block;margin-top:8rpx;color:$dz-text-tertiary;font-size:$dz-fs-micro;text-align:right}.notice{display:flex;flex-direction:column;gap:8rpx;margin-top:20rpx;padding:20rpx;border-radius:$dz-radius-sm;color:#9b531e;background:#fff2e8}.notice strong{font-size:$dz-fs-caption}.notice text{font-size:$dz-fs-micro;line-height:1.6}.case-head{display:flex;align-items:flex-start;justify-content:space-between}.case-head>div{display:flex;flex-direction:column;gap:7rpx}.case-head small{color:$dz-text-tertiary;font-size:$dz-fs-micro}.case-head strong{font-size:$dz-fs-body}.case-head>text{padding:7rpx 13rpx;border-radius:$dz-radius-sm;color:#b36a1f;background:$dz-status-warning-soft;font-size:$dz-fs-micro}.case-head>text.approved{color:$dz-status-success-deep;background:$dz-status-success-soft}.case-head>text.rejected{color:#9a4e45;background:#fff0ed}.case-card p{margin:20rpx 0;color:$dz-text-secondary;font-size:$dz-fs-caption;line-height:1.65}.refund-result,.result-note{display:flex;flex-direction:column;gap:7rpx;margin-top:18rpx;padding:17rpx;border-radius:$dz-radius-sm;background:$dz-brand-soft}.refund-result strong,.result-note small{color:$dz-brand-deep;font-size:$dz-fs-caption}.refund-result text,.result-note text{color:$dz-text-secondary;font-size:$dz-fs-micro}.submit-footer{position:fixed;z-index:20;right:0;bottom:0;left:0;max-width:750px;height:calc(112rpx + env(safe-area-inset-bottom));margin:auto;padding:12rpx 24rpx env(safe-area-inset-bottom);background:$dz-surface-card;box-shadow:$dz-shadow-floating;box-sizing:border-box}.submit-footer button{width:100%;height:76rpx;margin:0;border:0;border-radius:$dz-radius-lg;color:$dz-text-inverse;background:$dz-gradient-brand;font-size:$dz-fs-caption;font-weight:$dz-fw-bold;line-height:76rpx}.submit-footer button[disabled]{opacity:.45}.state{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:600rpx;color:$dz-text-secondary}.state button{margin-top:24rpx;border:0;color:$dz-text-inverse;background:$dz-brand-primary}
</style>
