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
          <button class="round" aria-label="更多操作" hover-class="round--pressed" @tap="showPending('更多')"><text class="dots">•••</text></button>
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
          <view class="info-row location-row"><text class="line-icon">⌖</text><strong>地点</strong><text>{{ activity.meeting_place_name }}</text><view class="mini-map" /><button @tap="showMapPending">导航 ›</button></view>
          <view class="divider" />
          <view class="info-row people-row"><text class="line-icon">♙</text><strong>人数</strong><view class="people-copy"><text>{{ activity.participant_count }}/{{ activity.capacity }}人（至少{{ activity.min_participants }}人成行）</text><text class="participant-note">{{ activity.participant_count ? '查看已报名成员' : '等待首位成员加入' }}</text></view></view>
        </section>

        <section class="panel organizer">
          <text class="organizer-label">组织者</text>
          <image v-if="activity.organizer_avatar_url" :src="activity.organizer_avatar_url" mode="aspectFill" />
          <view v-else class="avatar-fallback">{{ activity.organizer_nickname.slice(0,1) }}</view>
          <view class="organizer-copy"><strong>{{ activity.organizer_nickname }}</strong><text v-if="activity.organizer_verified">◆ 实名认证</text></view>
          <view v-if="activity.organizer_rating" class="organizer-rating"><text>★</text><strong>{{ activity.organizer_rating }}分</strong><i>›</i></view>
        </section>

        <section class="panel fee-panel">
          <text class="section-title">费用明细</text>
          <view class="fee"><text>AA本金</text><strong>¥{{ money(activity.aa_principal_amount) }}/人</strong></view>
          <view class="fee"><text>平台服务费　?</text><strong>¥{{ money(activity.platform_service_fee_amount) }}/人</strong></view>
          <view class="fee total"><text>合计</text><strong>¥{{ money(activity.payable_amount) }}/人</strong></view>
        </section>

        <section class="panel refund" hover-class="panel--pressed" @tap="showRefundRules">
          <view><text class="section-title">退款规则</text><text>活动开始前12小时可全额退款</text></view>
          <text class="refund-link">查看详情 ›</text>
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
import { cancelActivityParticipation, joinActivity } from '@/services/activities'
import { getActivityDetail } from '@/services/discovery'
import { recordActivityView } from '@/services/engagements'
import { isAuthenticated } from '@/services/session'
import type { ActivityDetail } from '@/types/api'
import { formatActivityRange, formatAmount, getErrorMessage } from '@/utils/formatters'

const activity = ref<ActivityDetail | null>(null)
const activityId = ref(0)
const loading = ref(true)
const error = ref('')
const participationSubmitting = ref(false)
const remainingPlaces = computed(() =>
  activity.value ? Math.max(0, activity.value.capacity - activity.value.participant_count) : 0,
)
const participationAllowed = computed(() =>
  !!activity.value && ['recruiting', 'formed'].includes(activity.value.status) && remainingPlaces.value > 0,
)
const participationDisabled = computed(() =>
  participationSubmitting.value || !!activity.value?.is_organizer || (!activity.value?.is_joined && !participationAllowed.value),
)
const participationTitle = computed(() => {
  if (participationSubmitting.value) return '正在处理…'
  if (activity.value?.is_organizer) return '我是组织者'
  if (activity.value?.is_joined) return '已加入活动'
  return participationAllowed.value ? '加入活动' : '暂不可报名'
})
const participationSubtitle = computed(() => {
  if (activity.value?.is_organizer) return '无需重复报名'
  if (activity.value?.is_joined) return '点击取消报名'
  return remainingPlaces.value ? `还剩${remainingPlaces.value}个名额` : '名额已满'
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

function goBack() {
  uni.navigateBack()
}

function showPending(feature: string) {
  uni.showToast({ title: `${feature}功能即将接入`, icon: 'none' })
}

function showMapPending() {
  uni.showToast({ title: '地图服务接入后开放导航', icon: 'none' })
}

function showRefundRules() {
  uni.showModal({
    title: '标准退款规则',
    content: '距开始≥12小时全退；6–12小时退AA本金；2–6小时退70% AA本金；不足2小时不退款。具体以活动规则快照为准。',
    showCancel: false,
  })
}

function handleParticipation() {
  if (!activity.value || participationDisabled.value) return
  const cancelling = activity.value.is_joined
  uni.showModal({
    title: cancelling ? '取消报名' : '确认加入活动',
    content: cancelling
      ? '确认取消本次活动报名吗？'
      : `确认后将占用1个活动名额。活动费用为 ¥${money(activity.value.payable_amount)}/人，请按活动说明与组织者结算。`,
    cancelText: '再想想',
    confirmText: cancelling ? '确认取消' : '确认加入',
    confirmColor: cancelling ? '#ff6433' : '#08aeb4',
    success: async (result) => {
      if (!result.confirm || !activity.value) return
      participationSubmitting.value = true
      try {
        if (cancelling) {
          await cancelActivityParticipation(activity.value.id)
          uni.showToast({ title: '已取消报名', icon: 'success' })
        } else {
          await joinActivity(activity.value.id)
          uni.showToast({ title: '报名成功', icon: 'success' })
        }
        await loadDetail(false)
      } catch (reason) {
        uni.showToast({ title: getErrorMessage(reason, '操作失败'), icon: 'none' })
      } finally {
        participationSubmitting.value = false
      }
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
.hero{position:relative;overflow:hidden;height:480rpx;padding:0;background:#12402e}
.hero>image,.cover-fallback,.hero-shade{position:absolute;width:100%;height:100%;inset:0}
.cover-fallback{display:flex;align-items:center;justify-content:center;color:#fff;font-size:48rpx}
.hero-shade{background:linear-gradient(180deg,rgba(0,0,0,.12),transparent 26%,transparent 72%,rgba(0,0,0,.15));pointer-events:none}
.round{display:flex;align-items:center;justify-content:center;width:72rpx;height:72rpx;margin:0;padding:0;border:0;border-radius:50%;color:#fff;background:rgba(255,255,255,.88);line-height:1}
.round::after,.action-bar button::after,.info-row button::after{display:none}
.round text{color:$dz-text-primary;font-size:46rpx}
.round .dots{font-size:22rpx;letter-spacing:2rpx}
.round--pressed,.button--pressed,.panel--pressed{opacity:.7}
.back{position:absolute;left:24rpx;top:calc(24rpx + env(safe-area-inset-top))}
.hero-actions{position:absolute;right:24rpx;top:calc(24rpx + env(safe-area-inset-top));display:flex;gap:18rpx}
.hero-actions .round:first-child text{font-size:35rpx}
.status{position:absolute;left:24rpx;top:calc(108rpx + env(safe-area-inset-top));padding:8rpx 16rpx;border-radius:15rpx;color:#fff;background:$dz-brand-primary;font-size:23rpx}
.photo-count{position:absolute;right:24rpx;bottom:20rpx;padding:7rpx 15rpx;border-radius:20rpx;color:#fff;background:rgba(23,33,38,.66);font-size:20rpx}
.content{position:relative;margin-top:-4rpx;padding:0 16rpx 32rpx}
.title-card,.panel{border:1rpx solid $dz-border-subtle;background:#fff}
.title-card{padding:20rpx 28rpx;border-radius:28rpx}
.title{display:block;font-size:38rpx;font-weight:700}
.tags{display:flex;gap:14rpx;margin-top:16rpx}
.tags text{padding:8rpx 18rpx;border-radius:12rpx;color:$dz-brand-deep;background:$dz-brand-soft;font-size:21rpx}
.panel{margin-top:16rpx;padding:24rpx 28rpx;border-radius:24rpx}
.activity-info{padding-top:12rpx;padding-bottom:12rpx}
.info-row{display:grid;grid-template-columns:36rpx 94rpx minmax(0,1fr);align-items:center;min-height:78rpx;color:$dz-text-primary;font-size:22rpx}
.line-icon{color:$dz-brand-primary;font-size:29rpx}
.info-row strong{font-size:23rpx}
.info-row>text:last-child{line-height:31rpx}
.divider{height:1rpx;margin-left:130rpx;background:$dz-border-subtle}
.location-row{grid-template-columns:36rpx 94rpx minmax(0,1fr) 80rpx 82rpx}
.location-row .mini-map{width:74rpx;height:58rpx;border-radius:10rpx;background:linear-gradient(135deg,#dcf2d8,#c9e7c4)}
.location-row button{height:56rpx;margin:0;padding:0;border:0;color:$dz-brand-deep;background:transparent;font-size:22rpx;line-height:56rpx}
.people-row{align-items:start;padding:15rpx 0}
.people-row .line-icon,.people-row strong{padding-top:6rpx}
.people-copy{display:flex;flex-direction:column;gap:10rpx}
.participant-note{color:$dz-text-tertiary;font-size:19rpx}
.organizer{display:grid;grid-template-columns:104rpx 72rpx minmax(0,1fr) auto;align-items:center}
.organizer-label{font-size:27rpx;font-weight:700}
.organizer image,.avatar-fallback{width:66rpx;height:66rpx;border-radius:50%}
.avatar-fallback{display:flex;align-items:center;justify-content:center;color:#fff;background:$dz-brand-primary}
.organizer-copy{display:flex;flex-direction:column;gap:7rpx}
.organizer-copy strong{font-size:23rpx}
.organizer-copy text{align-self:flex-start;padding:4rpx 9rpx;border-radius:8rpx;color:$dz-brand-deep;background:$dz-brand-soft;font-size:17rpx}
.organizer-rating{display:flex;align-items:center;gap:7rpx}
.organizer-rating>text{color:#ff9c39;font-size:26rpx}
.organizer-rating strong{font-size:23rpx}
.organizer-rating i{margin-left:5rpx;color:$dz-text-tertiary;font-size:31rpx;font-style:normal}
.section-title{font-size:28rpx;font-weight:700}
.fee-panel{padding-top:18rpx;padding-bottom:18rpx}
.fee{display:flex;align-items:center;justify-content:space-between;padding-top:12rpx;color:$dz-text-primary;font-size:22rpx}
.fee strong{color:$dz-price-primary;font-size:26rpx;font-weight:500}
.fee.total{margin-top:12rpx;padding-top:12rpx;border-top:1rpx dashed $dz-border-subtle}
.fee.total text{font-size:28rpx;font-weight:700}
.fee.total strong{font-size:34rpx}
.refund{display:flex;align-items:center;justify-content:space-between}
.refund>view{display:flex;flex-direction:column;gap:10rpx}
.refund view>text:last-child,.description>text:not(.section-title){color:$dz-text-secondary;font-size:21rpx;line-height:32rpx}
.refund-link{color:$dz-brand-deep;font-size:22rpx}
.description .section-title{display:block}
.description>text:not(.section-title){display:block;margin-top:10rpx}
.rules-title{margin-top:22rpx}
.action-bar{position:fixed;z-index:20;right:0;bottom:0;left:0;display:flex;align-items:center;gap:18rpx;height:calc(118rpx + env(safe-area-inset-bottom));padding:10rpx 24rpx env(safe-area-inset-bottom);border-radius:28rpx 28rpx 0 0;background:rgba(255,255,255,.98);box-shadow:0 -6rpx 24rpx rgba(23,33,38,.08);box-sizing:border-box}
.action-bar button{margin:0;border:0}
.secondary{display:flex;flex-direction:column;align-items:center;justify-content:center;width:104rpx;height:86rpx;padding:0;color:$dz-text-primary;background:#fff;font-size:18rpx;line-height:25rpx}
.action-icon{font-size:35rpx}
.primary{display:flex;flex:1;flex-direction:column;align-items:center;justify-content:center;height:86rpx;border-radius:43rpx;color:#fff;background:$dz-gradient-brand}
.primary strong{font-size:28rpx;line-height:34rpx}
.primary text{font-size:19rpx;line-height:24rpx}
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
