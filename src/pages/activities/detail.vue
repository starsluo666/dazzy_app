<template>
  <view class="dz-page detail-page">
    <NetworkState v-if="loading" class="dz-container detail-state" message="正在加载活动详情…" />
    <NetworkState v-else-if="error" class="dz-container detail-state" :message="error" error @retry="loadDetail" />
    <template v-else-if="activity">
      <view class="hero dz-container">
        <image v-if="activity.cover_url" :src="activity.cover_url" mode="aspectFill" />
        <view v-else class="cover-fallback">{{ activity.category }}</view>
        <view class="hero-shade" />
        <button class="round back" aria-label="返回" hover-class="round--pressed" @tap="goBack"><text>‹</text></button>
        <view class="hero-actions">
          <button class="round" aria-label="分享" hover-class="round--pressed" @tap="showPending('分享')"><text>↥</text></button>
          <button class="round" aria-label="更多操作" hover-class="round--pressed" @tap="showMoreActions"><text class="dots">•••</text></button>
        </view>
        <text class="status">{{ statusLabel(activity.status) }}</text>
        <text class="photo-count">1/1</text>
      </view>

      <main class="content dz-container">
        <section class="title-card">
          <text class="title">{{ activity.title }}</text>
          <view class="tags"><text>{{ activity.category }}</text><text>交友</text><text>户外</text></view>
        </section>

        <section class="panel activity-info">
          <view class="info-row"><text class="line-icon">◷</text><strong>时间</strong><text>{{ formatRange(activity.starts_at, activity.ends_at) }}</text></view>
          <view class="divider" />
          <view class="info-row location-row"><text class="line-icon">⌖</text><strong>地点</strong><text>{{ activity.meeting_place_name }}</text><view class="mini-map" /><button hover-class="button--pressed" @tap="showMapPending">导航 ›</button></view>
          <view class="divider" />
          <view class="info-row people-row"><text class="line-icon">♙</text><strong>人数</strong><view class="people-copy"><text>{{ activity.participant_count }}/{{ activity.capacity }}人（至少{{ activity.min_participants }}人成行）</text><text class="participant-note">{{ activity.participant_count ? '查看已报名成员' : '等待首位成员加入' }}</text></view></view>
        </section>

        <section class="panel organizer">
          <text class="organizer-label">组织者</text>
          <image v-if="activity.organizer_avatar_url" :src="activity.organizer_avatar_url" mode="aspectFill" />
          <view v-else class="avatar-fallback">{{ activity.organizer_nickname.slice(0,1) }}</view>
          <view class="organizer-copy"><strong>{{ activity.organizer_nickname }}</strong></view>
          <view v-if="activity.organizer_rating" class="organizer-rating"><text>★</text><strong>{{ activity.organizer_rating }}分</strong><i>›</i></view>
        </section>

        <section class="panel fee-panel">
          <text class="section-title">费用明细</text>
          <view class="fee"><text>AA本金</text><strong>¥{{ money(activity.aa_principal_amount) }}/人</strong></view>
          <view class="fee" hover-class="button--pressed" @tap="showFeeNote"><text>平台服务费　?</text><strong>¥{{ money(activity.platform_service_fee_amount) }}/人</strong></view>
          <view class="fee total"><text>合计</text><strong>¥{{ money(activity.payable_amount) }}/人</strong></view>
        </section>

        <section class="panel refund" hover-class="panel--pressed" @tap="showRefundRules">
          <view><text class="section-title">退款规则</text><text>活动开始前12小时可全额退款</text></view>
          <text class="refund-link">查看详情 ›</text>
        </section>

        <section v-if="activity.settlement" class="panel settlement-panel">
          <view class="settlement-head">
            <view><text class="section-title">履约与结算</text><text>资金按平台规则流转，全程可追溯</text></view>
            <text class="settlement-status" :class="activity.settlement.status">{{ activity.settlement.status_label }}</text>
          </view>
          <view class="settlement-progress">
            <i :class="{ active: true }" />
            <span :class="{ active: activity.settlement.status !== 'confirming' }" />
            <i :class="{ active: activity.settlement.status !== 'confirming' }" />
            <span :class="{ active: activity.settlement.status === 'settled' }" />
            <i :class="{ active: activity.settlement.status === 'settled' }" />
          </view>
          <view class="settlement-steps"><text>履约确认</text><text>风险冻结</text><text>结算入账</text></view>
          <text class="settlement-hint">{{ settlementHint }}</text>
          <view v-if="activity.settlement.settlement_amount !== null" class="settlement-amount"><text>预计入账</text><strong>¥{{ money(activity.settlement.settlement_amount) }}</strong></view>
        </section>

        <section class="panel description">
          <text class="section-title">活动说明</text><text>{{ activity.description }}</text>
          <text class="section-title rules-title">参与规则</text><text>{{ activity.participation_rules }}</text>
        </section>
      </main>

      <view class="action-bar dz-container">
        <button class="secondary" hover-class="button--pressed" @tap="showPending('分享')"><text class="action-icon">↗</text><text>分享</text></button>
        <button
          class="primary"
          :class="{ 'primary--joined': activity.is_joined }"
          :disabled="participationDisabled"
          hover-class="button--pressed"
          @tap="handleParticipation"
        ><strong>{{ participationTitle }}</strong><text>{{ participationSubtitle }}</text></button>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'

import NetworkState from '@/components/NetworkState.vue'
import { DIALOG_DANGER } from '@/utils/brand'
import { cancelActivityParticipation } from '@/services/activities'
import { getActivityDetail } from '@/services/discovery'
import { recordActivityView } from '@/services/engagements'
import { isAuthenticated, requireAuthentication } from '@/services/session'
import type { ActivityDetail } from '@/types/api'
import { formatActivityRange, formatActivityTime, formatAmount, getErrorMessage } from '@/utils/formatters'

const activity = ref<ActivityDetail | null>(null)
const activityId = ref(0)
const loading = ref(true)
const error = ref('')
const participationSubmitting = ref(false)
const remainingPlaces = computed(() =>
  activity.value ? activity.value.remaining_capacity : 0,
)
const participationAllowed = computed(() =>
  !!activity.value && ['recruiting', 'formed'].includes(activity.value.status) && remainingPlaces.value > 0,
)
const participationDisabled = computed(() =>
  participationSubmitting.value || !!activity.value?.is_organizer || (
    !activity.value?.is_joined
    && activity.value?.participation_status !== 'pending_payment'
    && !participationAllowed.value
  ),
)
const participationTitle = computed(() => {
  if (participationSubmitting.value) return '正在处理…'
  if (activity.value?.is_organizer) return '我是组织者'
  if (activity.value?.is_joined) return '已加入活动'
  if (activity.value?.participation_status === 'pending_payment') return '继续支付'
  return participationAllowed.value ? '加入活动' : '暂不可报名'
})
const participationSubtitle = computed(() => {
  if (activity.value?.is_organizer) return '无需重复报名'
  if (activity.value?.is_joined) return activity.value.participation_after_sales ? activity.value.participation_after_sales.status_label : '取消报名或申请售后'
  if (activity.value?.participation_status === 'pending_payment') return '名额锁定中，完成支付后正式报名'
  return remainingPlaces.value ? `还剩${remainingPlaces.value}个名额` : '名额已满'
})
const settlementHint = computed(() => {
  const settlement = activity.value?.settlement
  if (!settlement) return ''
  if (settlement.status === 'confirming') return `履约确认期至 ${formatDeadline(settlement.confirmation_deadline)}，有异常请及时申请售后。`
  if (settlement.status === 'risk_frozen') return `确认期已结束，资金预计于 ${formatDeadline(settlement.freeze_until)} 入账。`
  if (settlement.status === 'dispute_frozen') return settlement.dispute_reason || '存在待处理争议，结算已暂停。'
  return `已于 ${formatDeadline(settlement.settled_at || settlement.freeze_until)} 完成入账。`
})

function money(amount: number) {
  return formatAmount(amount, 2)
}

function statusLabel(status: string) {
  return ({
    recruiting: '报名中',
    formed: '已成局',
    in_progress: '进行中',
    completed: '已结束',
  } as Record<string, string>)[status] || '活动已关闭'
}

const formatRange = formatActivityRange
function formatDeadline(value: string) {
  return formatActivityTime(value)
}

function goBack() {
  uni.navigateBack()
}

function showPending(feature: string) {
  uni.showToast({ title: `${feature}功能即将接入`, icon: 'none' })
}

function showMoreActions() {
  if (!activity.value || activity.value.is_organizer) {
    uni.showToast({ title: '这是你发起的活动', icon: 'none' })
    return
  }
  const reasons = [
    { label: '信息不实', value: 'false_information' },
    { label: '内容不当', value: 'inappropriate_content' },
    { label: '诱导私下交易', value: 'private_transaction' },
    { label: '存在安全风险', value: 'safety_risk' },
    { label: '其他问题', value: 'other' },
  ]
  uni.showActionSheet({
    itemList: reasons.map((item) => item.label),
    success: ({ tapIndex }) => {
      const selected = reasons[tapIndex]
      if (!selected || !activity.value) return
      const route = `/pages/support/index?mode=new&caseType=report&targetType=activity&targetId=${activity.value.id}&targetTitle=${encodeURIComponent(activity.value.title)}&reason=${selected.value}`
      if (requireAuthentication(route)) uni.navigateTo({ url: route })
    },
  })
}

function showMapPending() {
  uni.showToast({ title: '地图服务接入后开放导航', icon: 'none' })
}

function showFeeNote() {
  uni.showToast({ title: '平台组局服务费按 AA 本金的 10% 收取，用于担保交易与售后', icon: 'none' })
}

function showRefundRules() {
  uni.showModal({
    title: '标准退款规则',
    content: '距开始≥12小时全退；6–12小时退AA本金；2–6小时退70% AA本金；不足2小时不退款。具体以活动规则快照为准。',
    showCancel: false,
  })
}

async function cancelParticipation() {
  if (!activity.value) return
  participationSubmitting.value = true
  try {
    const result = (await cancelActivityParticipation(activity.value.id)).data
    const refund = result.refund
    await loadDetail(false)
    uni.showModal({
      title: refund ? '退款申请已提交' : '报名已取消',
      content: refund
        ? `预计原路退回 ¥${money(refund.refund_amount)}（AA本金 ¥${money(refund.principal_refund_amount)}，服务费 ¥${money(refund.service_fee_refund_amount)}）。${refund.retained_principal_amount ? `按规则扣除AA本金 ¥${money(refund.retained_principal_amount)}。` : ''}退款结果会通过消息通知。`
        : '待支付报名单已关闭，名额已经释放。',
      showCancel: false,
    })
  } catch (reason) { uni.showToast({ title: getErrorMessage(reason, '取消报名失败'), icon: 'none' }) } finally { participationSubmitting.value = false }
}

function handleParticipation() {
  if (!activity.value || participationDisabled.value) return
  if (!isAuthenticated()) { uni.navigateTo({ url: '/pages/auth/login' }); return }
  if (!activity.value.is_joined) {
    uni.navigateTo({ url: `/pages/activities/participation-payment?id=${activity.value.id}` })
    return
  }
  if (activity.value.participation_after_sales && ['pending', 'processing'].includes(activity.value.participation_after_sales.status)) {
    uni.navigateTo({ url: `/pages/activities/after-sales?id=${activity.value.id}` })
    return
  }
  uni.showActionSheet({
    itemList: ['按活动规则取消并退款', '申请特殊情况售后'],
    success: ({ tapIndex }) => {
      if (!activity.value) return
      if (tapIndex === 1) { uni.navigateTo({ url: `/pages/activities/after-sales?id=${activity.value.id}` }); return }
      uni.showModal({
        title: '按规则取消报名',
        content: '系统将按报名时确认的退款规则和当前服务器时间计算退款，扣除金额提交后不可撤销。',
        cancelText: '再想想', confirmText: '确认取消', confirmColor: DIALOG_DANGER,
        success: (result) => { if (result.confirm) cancelParticipation() },
      })
    },
  })
}

async function loadDetail(showLoading = true) {
  if (!activityId.value) return
  if (showLoading) loading.value = true
  error.value = ''
  try {
    activity.value = (await getActivityDetail(activityId.value)).data
    if (isAuthenticated()) recordActivityView(activityId.value).catch(() => {})
  } catch (reason) {
    error.value = getErrorMessage(reason)
  } finally {
    if (showLoading) loading.value = false
  }
}

onLoad((query) => {
  activityId.value = Number(query?.id || 0)
  if (!activityId.value) {
    error.value = '缺少活动编号'
    loading.value = false
  } else {
    loadDetail()
  }
})
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;
.detail-page{min-height:100vh;padding-bottom:calc(138rpx + env(safe-area-inset-bottom));background:$dz-surface-page}
.hero{position:relative;overflow:hidden;height:480rpx;padding:0;background:$dz-status-success-deep}
.hero>image,.cover-fallback,.hero-shade{position:absolute;width:100%;height:100%;inset:0}
.cover-fallback{display:flex;align-items:center;justify-content:center;color:$dz-text-inverse;font-size:$dz-fs-price-lg}
.hero-shade{background:linear-gradient(180deg,rgba(0,0,0,.12),transparent 26%,transparent 72%,rgba(0,0,0,.15));pointer-events:none}
.round{display:flex;align-items:center;justify-content:center;width:72rpx;height:72rpx;margin:0;padding:0;border:0;border-radius:50%;color:$dz-text-inverse;background:rgba(255,255,255,.88);line-height:1}
.round::after,.action-bar button::after,.info-row button::after{display:none}
.round text{color:$dz-text-primary;font-size:$dz-fs-price-lg}
.round .dots{font-size:$dz-fs-caption;letter-spacing:2rpx}
.round--pressed,.button--pressed,.panel--pressed{opacity:.7}
.back{position:absolute;left:24rpx;top:calc(24rpx + env(safe-area-inset-top))}
.hero-actions{position:absolute;right:24rpx;top:calc(24rpx + env(safe-area-inset-top));display:flex;gap:18rpx}
.hero-actions .round:first-child text{font-size:$dz-fs-heading}
.status{position:absolute;left:24rpx;top:calc(108rpx + env(safe-area-inset-top));padding:8rpx 16rpx;border-radius:$dz-radius-sm;color:$dz-text-inverse;background:$dz-brand-primary;font-size:$dz-fs-caption}
.photo-count{position:absolute;right:24rpx;bottom:20rpx;padding:7rpx 15rpx;border-radius:$dz-radius-md;color:$dz-text-inverse;background:rgba(23,33,38,.66);font-size:$dz-fs-caption}
.content{position:relative;margin-top:-48rpx;padding:0 16rpx 32rpx}
.title-card,.panel{border:1rpx solid $dz-border-subtle;background:$dz-surface-card}
.title-card{padding:24rpx 28rpx;border-radius:$dz-radius-lg;box-shadow:$dz-shadow-card,inset 0 1rpx 0 $dz-surface-highlight}
.title{display:block;font-size:$dz-fs-title;font-weight:$dz-fw-bold}
.tags{display:flex;gap:14rpx;margin-top:16rpx}
.tags text{padding:6rpx 18rpx;border-radius:$dz-radius-full;color:$dz-brand-deep;background:$dz-brand-soft;font-size:$dz-fs-caption}
.panel{margin-top:16rpx;padding:24rpx 28rpx;border-radius:$dz-radius-md}
.activity-info{padding-top:12rpx;padding-bottom:12rpx}
.info-row{display:grid;grid-template-columns:36rpx 94rpx minmax(0,1fr);align-items:center;min-height:78rpx;color:$dz-text-primary;font-size:$dz-fs-caption}
.line-icon{color:$dz-brand-primary;font-size:$dz-fs-body-strong}
.info-row strong{font-size:$dz-fs-caption}
.info-row>text:last-child{line-height:31rpx}
.divider{height:1rpx;margin-left:130rpx;background:$dz-border-subtle}
.location-row{grid-template-columns:36rpx 94rpx minmax(0,1fr) 80rpx 82rpx}
.location-row .mini-map{width:74rpx;height:58rpx;border-radius:$dz-radius-sm;background:linear-gradient(135deg,#dcf2d8,#c9e7c4)}
.location-row button{height:56rpx;margin:0;padding:0;border:0;color:$dz-brand-deep;background:transparent;font-size:$dz-fs-caption;line-height:56rpx}
.people-row{align-items:start;padding:15rpx 0}
.people-row .line-icon,.people-row strong{padding-top:6rpx}
.people-copy{display:flex;flex-direction:column;gap:10rpx}
.participant-note{color:$dz-text-tertiary;font-size:$dz-fs-caption}
.organizer{display:grid;grid-template-columns:104rpx 72rpx minmax(0,1fr) auto;align-items:center}
.organizer-label{font-size:$dz-fs-body;font-weight:$dz-fw-bold}
.organizer image,.avatar-fallback{width:66rpx;height:66rpx;border-radius:50%}
.avatar-fallback{display:flex;align-items:center;justify-content:center;color:$dz-text-inverse;background:$dz-brand-primary}
.organizer-copy{display:flex;flex-direction:column;gap:7rpx}
.organizer-copy strong{font-size:$dz-fs-caption}
.organizer-copy text{align-self:flex-start;padding:4rpx 9rpx;border-radius:$dz-radius-sm;color:$dz-brand-deep;background:$dz-brand-soft;font-size:$dz-fs-micro}
.organizer-rating{display:flex;align-items:center;gap:7rpx}
.organizer-rating>text{color:#ff9c39;font-size:$dz-fs-body}
.organizer-rating strong{font-size:$dz-fs-caption}
.organizer-rating i{margin-left:5rpx;color:$dz-text-tertiary;font-size:$dz-fs-body-strong;font-style:normal}
.section-title{font-size:$dz-fs-body;font-weight:$dz-fw-bold}
.fee-panel{padding-top:18rpx;padding-bottom:18rpx}
.fee{display:flex;align-items:center;justify-content:space-between;padding-top:12rpx;color:$dz-text-primary;font-size:$dz-fs-caption}
.fee strong{color:$dz-price-primary;font-size:$dz-fs-body;font-weight:$dz-fw-medium}
.fee.total{margin-top:12rpx;padding-top:12rpx;border-top:1rpx dashed $dz-border-subtle}
.fee.total text{font-size:$dz-fs-body;font-weight:$dz-fw-bold}
.fee.total strong{font-size:$dz-fs-heading}
.refund{display:flex;align-items:center;justify-content:space-between}
.refund>view{display:flex;flex-direction:column;gap:10rpx}
.refund view>text:last-child,.description>text:not(.section-title){color:$dz-text-secondary;font-size:$dz-fs-caption;line-height:32rpx}
.refund-link{color:$dz-brand-deep;font-size:$dz-fs-caption}
.settlement-panel{padding:26rpx 28rpx}.settlement-head{display:flex;align-items:flex-start;justify-content:space-between}.settlement-head>view{display:flex;flex-direction:column;gap:8rpx}.settlement-head>view>text:last-child{color:$dz-text-tertiary;font-size:$dz-fs-micro}.settlement-status{padding:7rpx 13rpx;border-radius:$dz-radius-sm;color:$dz-brand-deep;background:$dz-brand-soft;font-size:$dz-fs-micro}.settlement-status.dispute_frozen{color:#a45625;background:#fff0e3}.settlement-status.settled{color:$dz-status-success-deep;background:$dz-status-success-soft}.settlement-progress{display:grid;grid-template-columns:20rpx 1fr 20rpx 1fr 20rpx;align-items:center;margin:27rpx 12rpx 10rpx}.settlement-progress i{width:18rpx;height:18rpx;border:4rpx solid $dz-border-subtle;border-radius:50%;background:$dz-surface-card;box-sizing:border-box}.settlement-progress span{height:4rpx;background:$dz-border-subtle}.settlement-progress .active{border-color:$dz-brand-primary;background:$dz-brand-primary}.settlement-steps{display:flex;justify-content:space-between;color:$dz-text-secondary;font-size:$dz-fs-micro}.settlement-hint{display:block;margin-top:20rpx;padding:15rpx 17rpx;border-radius:$dz-radius-sm;color:$dz-text-secondary;background:$dz-surface-page;font-size:$dz-fs-caption;line-height:1.55}.settlement-amount{display:flex;align-items:center;justify-content:space-between;margin-top:18rpx;padding-top:17rpx;border-top:1rpx dashed $dz-border-subtle;font-size:$dz-fs-caption}.settlement-amount strong{color:$dz-price-primary;font-size:$dz-fs-body-strong}
.description .section-title{display:block}
.description>text:not(.section-title){display:block;margin-top:10rpx}
.rules-title{margin-top:22rpx}
.action-bar{position:fixed;z-index:20;right:0;bottom:0;left:0;display:flex;align-items:center;gap:18rpx;height:calc(118rpx + env(safe-area-inset-bottom));padding:10rpx 24rpx calc(10rpx + env(safe-area-inset-bottom));border:1rpx solid $dz-border-material;border-bottom:0;border-radius:$dz-radius-lg 28rpx 0 0;background:$dz-surface-glass-strong;box-shadow:0 -1rpx 0 rgba(255,255,255,.7),0 -14rpx 40rpx rgba(31,65,72,.08);box-sizing:border-box}
.action-bar button{margin:0;border:0}
.secondary{display:flex;flex-direction:column;align-items:center;justify-content:center;width:104rpx;height:86rpx;padding:0;color:$dz-text-primary;background:$dz-surface-card;font-size:$dz-fs-micro;line-height:25rpx}
.action-icon{font-size:$dz-fs-heading}
.primary{display:flex;flex:1;flex-direction:column;align-items:center;justify-content:center;height:86rpx;border-radius:$dz-radius-full;color:$dz-text-inverse;background:$dz-gradient-brand}
.primary strong{font-size:$dz-fs-body;line-height:34rpx}
.primary text{font-size:$dz-fs-caption;line-height:24rpx}
.primary[disabled]{opacity:.45}
.primary--joined{background:linear-gradient(135deg,#5d6b70,#34454b)}
.detail-state{min-height:500rpx}
@media screen and (orientation:landscape) and (max-height:600px){.detail-page{padding-bottom:84px}
.hero{height:220px}
.action-bar{height:68px;padding-top:8px}
.action-bar .secondary,.action-bar .primary{height:48px}
.action-bar .primary{border-radius:24px}
}

</style>
