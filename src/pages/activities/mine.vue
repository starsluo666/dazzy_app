<template>
  <view class="dz-page my-activities-page">
    <DzNavBar title="我的活动" :back-action="goBack" />

    <view class="role-tabs">
      <button v-for="item in roles" :key="item.value" :class="{ active: role === item.value }" @tap="setRole(item.value)">
        {{ item.label }}
      </button>
    </view>
    <view class="state-tabs dz-container">
      <button v-for="item in states" :key="item.value" :class="{ active: state === item.value }" @tap="setState(item.value)">
        {{ item.label }}
      </button>
    </view>

    <main class="list-content dz-container">
      <NetworkState v-if="loading" message="正在加载我的活动…" />
      <NetworkState v-else-if="error" :message="error" action-text="重新加载" @action="loadActivities" />
      <view v-else-if="!activities.length" class="empty-state">
        <text class="empty-icon">◇</text>
        <strong>{{ role === 'joined' ? '还没有参与过活动' : '还没有发起过活动' }}</strong>
        <text>{{ role === 'joined' ? '去发现同城有趣的人和新玩法吧' : '发起一个活动，召集志趣相投的新朋友' }}</text>
        <button @tap="browseActivities">{{ role === 'joined' ? '发现活动' : '发布活动' }}</button>
      </view>

      <section v-for="activity in activities" :key="activity.id" class="activity-card" @tap="openActivity(activity.id)">
        <view class="cover">
          <image v-if="activity.cover_url" :src="activity.cover_url" mode="aspectFill" />
          <text v-else>{{ activity.category }}</text>
          <text class="status" :class="statusTone(activity)">{{ statusCopy(activity) }}</text>
        </view>
        <view class="card-body">
          <view class="title-row"><strong>{{ activity.title }}</strong><text>{{ activity.category }}</text></view>
          <view class="meta"><text>◷</text><text>{{ formatRange(activity.starts_at, activity.ends_at) }}</text></view>
          <view class="meta"><text>⌖</text><text>{{ activity.meeting_place_name }}</text></view>
          <view class="progress-row">
            <view class="avatars"><text>{{ activity.organizer_nickname.slice(0, 1) }}</text><i>{{ activity.participant_count }}/{{ activity.capacity }}人</i></view>
            <view class="price"><small>AA</small><strong>¥{{ money(activity.aa_principal_amount) }}</strong><text>/人</text></view>
          </view>
          <view v-if="role === 'organized' && activity.status === 'rejected'" class="rejection"><strong>审核未通过</strong><text>{{ activity.rejection_reason || '请完善活动资料后重新发布。' }}</text></view>
          <view v-if="role === 'organized' && activity.status === 'cancelled' && activity.cancellation_reason" class="rejection cancelled"><strong>活动已取消</strong><text>{{ activity.cancellation_reason }}</text></view>
        </view>
        <view class="card-foot">
          <text v-if="role === 'joined'">{{ participationHint(activity) }}</text>
          <text v-else>{{ organizerHint(activity) }}</text>
          <view class="foot-actions">
            <button v-if="role === 'organized' && ['recruiting','formed'].includes(activity.status)" class="danger" @tap.stop="cancelActivity(activity)">取消活动</button>
            <button v-if="role === 'organized' && activity.status === 'rejected'" class="copy" @tap.stop="copyActivity(activity.id)">复制修改</button>
            <button v-else @tap.stop="openActivity(activity.id)">查看详情</button>
          </view>
        </view>
      </section>
    </main>
  </view>
</template>

<script setup lang="ts">
import { navigateBackOr } from '@/utils/navigation'
import DzNavBar from '@/components/DzNavBar.vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'

import NetworkState from '@/components/NetworkState.vue'
import { DIALOG_DANGER } from '@/utils/brand'
import { cancelOrganizedActivity, getMyActivities } from '@/services/activities'
import { isAuthenticated } from '@/services/session'
import type { MyActivityListItem } from '@/types/api'
import { formatActivityRange, formatActivityTime, formatAmount, getErrorMessage } from '@/utils/formatters'

type Role = 'joined' | 'organized'
type State = 'all' | 'upcoming' | 'history'

const roles: Array<{ label: string; value: Role }> = [{ label: '我参与的', value: 'joined' }, { label: '我发起的', value: 'organized' }]
const states: Array<{ label: string; value: State }> = [{ label: '全部', value: 'all' }, { label: '进行中', value: 'upcoming' }, { label: '已结束', value: 'history' }]
const role = ref<Role>('joined')
const state = ref<State>('all')
const activities = ref<MyActivityListItem[]>([])
const loading = ref(true)
const error = ref('')
const money = formatAmount

function goBack() { navigateBackOr(() => uni.reLaunch({ url: '/pages/activities/index' })) }
function openActivity(id: number) { uni.navigateTo({ url: `/pages/activities/detail?id=${id}` }) }
function copyActivity(id: number) { uni.navigateTo({ url: `/pages/publish/index?copyFrom=${id}` }) }
function browseActivities() { uni.navigateTo({ url: role.value === 'joined' ? '/pages/activities/list' : '/pages/publish/index' }) }
function setRole(value: Role) { if (role.value !== value) { role.value = value; state.value = 'all'; loadActivities() } }
function setState(value: State) { if (state.value !== value) { state.value = value; loadActivities() } }
const formatRange = formatActivityRange
const formatJoinedAt = formatActivityTime
function statusCopy(item: MyActivityListItem) { if (item.participation_status === 'pending_payment') return '待支付'; if (item.participation_status === 'cancelled') return '已取消'; if (item.participation_status === 'expired') return '支付超时'; return ({ draft: '待支付', pending_review: '待审核', rejected: '已驳回', recruiting: '报名中', formed: '已成局', in_progress: '进行中', completed: '已结束', cancelled: '已取消', failed_to_form: '未成局' } as Record<string, string>)[item.status] || '待发布' }
function statusTone(item: MyActivityListItem) { return ['rejected', 'completed', 'cancelled', 'failed_to_form'].includes(item.status) || ['cancelled', 'expired'].includes(item.participation_status || '') ? 'muted' : item.status === 'formed' ? 'formed' : '' }
function organizerHint(item: MyActivityListItem) { if (item.status === 'recruiting') return `还需 ${Math.max(0, item.min_participants - item.participant_count)} 人成局`; if (item.settlement) { if (item.settlement.status === 'settled') return `平台账务已结算 ¥${money(item.settlement.settlement_amount || 0)}`; return item.settlement.status_label }; return statusCopy(item) }
function participationHint(item: MyActivityListItem) { if (item.participation_after_sales_status) return `售后：${({ pending: '待处理', processing: '处理中', approved: '已同意', rejected: '已驳回' } as Record<string, string>)[item.participation_after_sales_status]}`; if (item.participation_refund_status) return `退款：${item.participation_refund_status === 'succeeded' ? '已完成' : '处理中'}`; if (item.participation_status === 'pending_payment') return '名额锁定中，请尽快完成支付'; if (item.participation_status === 'expired') return '支付超时，名额已释放'; if (item.participation_status === 'cancelled') return '已取消报名'; return item.joined_at ? `报名于 ${formatJoinedAt(item.joined_at)}` : statusCopy(item) }
function cancelActivity(item: MyActivityListItem) {
  uni.showModal({
    title: '取消活动', content: '', editable: true, placeholderText: '请填写取消原因',
    confirmText: '确认取消', confirmColor: DIALOG_DANGER,
    success: async (result) => {
      if (!result.confirm) return
      const reason = (result.content || '').trim()
      if (reason.length < 2) { uni.showToast({ title: '请填写明确的取消原因', icon: 'none' }); return }
      try {
        const response = (await cancelOrganizedActivity(item.id, reason)).data
        uni.showModal({ title: '活动已取消', content: `相关退款已提交处理；你的发布支付预计退款为 ¥${money(response.refund_amount)}，最终以退款记录为准。`, showCancel: false })
        await loadActivities()
      } catch (errorValue) { uni.showToast({ title: getErrorMessage(errorValue, '取消活动失败'), icon: 'none' }) }
    },
  })
}
async function loadActivities() { loading.value = true; error.value = ''; try { activities.value = (await getMyActivities({ role: role.value, state: state.value })).data.items } catch (reason) { error.value = getErrorMessage(reason, '活动记录加载失败') } finally { loading.value = false } }

onShow(() => { if (isAuthenticated()) loadActivities() })
onLoad((query) => {
  if (query?.role === 'organized') role.value = 'organized'
})
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;
.my-activities-page{min-height:100vh;background:$dz-surface-page}.page-head{position:sticky;z-index:12;top:0;display:flex;align-items:flex-end;justify-content:center;height:calc(98rpx + env(safe-area-inset-top));padding-bottom:18rpx;background:$dz-surface-card;box-sizing:border-box}.page-head button{position:absolute;left:20rpx;bottom:7rpx;width:70rpx;height:70rpx;margin:0;padding:0;border:0;background:transparent;font-size:$dz-fs-price-lg;line-height:70rpx}.page-head button::after,.role-tabs button::after,.state-tabs button::after,.card-foot button::after,.empty-state button::after{display:none}.page-head text{font-size:$dz-fs-body-strong;font-weight:$dz-fw-bold}.role-tabs{position:sticky;z-index:11;top:var(--dz-navbar-total-height);display:flex;height:86rpx;border-bottom:1rpx solid $dz-border-subtle;background:$dz-surface-card}.role-tabs button{position:relative;flex:1;height:86rpx;margin:0;border:0;color:$dz-text-secondary;background:$dz-surface-card;font-size:$dz-fs-caption;line-height:86rpx}.role-tabs button.active{color:$dz-text-primary;font-weight:$dz-fw-bold}.role-tabs button.active::after{position:absolute;right:38%;bottom:0;left:38%;height:6rpx;border-radius:4rpx;background:$dz-brand-primary;content:''}.state-tabs{display:flex;gap:16rpx;padding-top:22rpx;padding-bottom:6rpx}.state-tabs button{height:56rpx;margin:0;padding:0 28rpx;border:0;border-radius:$dz-radius-lg;color:$dz-text-secondary;background:#eaf0f1;font-size:$dz-fs-caption;line-height:56rpx}.state-tabs button.active{color:$dz-brand-deep;background:$dz-brand-soft;font-weight:$dz-fw-bold}.list-content{padding-top:14rpx;padding-bottom:50rpx}.activity-card{overflow:hidden;margin-bottom:22rpx;border-radius:$dz-radius-md;background:$dz-surface-card;box-shadow:$dz-shadow-card}.cover{position:relative;overflow:hidden;height:238rpx;color:$dz-text-inverse;background:linear-gradient(135deg,#42d7d2,#0eabb9)}.cover image{width:100%;height:100%}.cover>text:not(.status){display:flex;align-items:center;justify-content:center;height:100%;font-size:$dz-fs-heading;font-weight:$dz-fw-bold}.status{position:absolute;left:20rpx;top:18rpx;padding:7rpx 15rpx;border-radius:$dz-radius-sm;color:$dz-text-inverse;background:$dz-brand-primary;font-size:$dz-fs-caption}.status.formed{background:#20ae6a}.status.muted{background:rgba(43,53,58,.72)}.card-body{padding:22rpx 24rpx 18rpx}.title-row{display:flex;align-items:center;gap:14rpx}.title-row strong{overflow:hidden;flex:1;color:$dz-text-primary;font-size:$dz-fs-body-strong;text-overflow:ellipsis;white-space:nowrap}.title-row>text{padding:6rpx 13rpx;border-radius:$dz-radius-sm;color:$dz-brand-deep;background:$dz-brand-soft;font-size:$dz-fs-micro}.meta{display:flex;align-items:center;gap:14rpx;margin-top:15rpx;color:$dz-text-secondary;font-size:$dz-fs-caption}.meta>text:first-child{width:24rpx;color:$dz-brand-primary}.progress-row{display:flex;align-items:flex-end;justify-content:space-between;margin-top:19rpx}.avatars{display:flex;align-items:center;color:$dz-text-secondary}.avatars>text{display:flex;align-items:center;justify-content:center;width:46rpx;height:46rpx;border:3rpx solid #fff;border-radius:50%;color:$dz-brand-deep;background:$dz-brand-soft;font-size:$dz-fs-caption}.avatars i{margin-left:10rpx;font-size:$dz-fs-caption;font-style:normal}.price{display:flex;align-items:baseline;color:$dz-price-primary}.price small{margin-right:5rpx;color:$dz-text-secondary;font-size:$dz-fs-micro}.price strong{font-size:$dz-fs-body-strong}.price text{font-size:$dz-fs-micro}.rejection{display:flex;flex-direction:column;gap:7rpx;margin-top:18rpx;padding:16rpx 18rpx;border-radius:$dz-radius-sm;color:#a64a24;background:$dz-price-soft}.rejection strong{font-size:$dz-fs-caption}.rejection text{font-size:$dz-fs-micro;line-height:1.5}.rejection.cancelled{color:$dz-text-secondary;background:#f1f3f4}.card-foot{display:flex;align-items:center;justify-content:space-between;min-height:78rpx;padding:0 24rpx;border-top:1rpx solid $dz-border-subtle;color:$dz-text-tertiary;font-size:$dz-fs-micro}.foot-actions{display:flex;gap:10rpx}.card-foot button{height:50rpx;margin:0;padding:0 22rpx;border:1rpx solid $dz-brand-primary;border-radius:$dz-radius-md;color:$dz-brand-deep;background:$dz-surface-card;font-size:$dz-fs-caption;line-height:48rpx}.card-foot button.copy{border-color:$dz-price-primary;color:$dz-price-primary}.card-foot button.danger{border-color:#ef7350;color:#dd552f}.empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:630rpx;color:$dz-text-secondary;text-align:center}.empty-icon{display:flex;align-items:center;justify-content:center;width:116rpx;height:116rpx;border-radius:50%;color:$dz-brand-primary;background:$dz-brand-soft;font-size:60rpx}.empty-state strong{margin-top:25rpx;color:$dz-text-primary;font-size:$dz-fs-body}.empty-state>text:not(.empty-icon){margin-top:13rpx;font-size:$dz-fs-caption}.empty-state button{height:66rpx;margin:30rpx 0 0;padding:0 42rpx;border:0;border-radius:$dz-radius-lg;color:$dz-text-inverse;background:$dz-gradient-brand;font-size:$dz-fs-caption;line-height:66rpx}
</style>
