<template>
  <view class="dz-page my-activities-page">
    <header class="page-head">
      <button aria-label="返回" @tap="goBack">‹</button>
      <text>我的活动</text>
    </header>

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
        </view>
        <view class="card-foot">
          <text v-if="role === 'joined' && activity.joined_at">{{ activity.participation_status === 'cancelled' ? '已取消报名' : `报名于 ${formatJoinedAt(activity.joined_at)}` }}</text>
          <text v-else>{{ organizerHint(activity) }}</text>
          <button @tap.stop="openActivity(activity.id)">查看详情</button>
        </view>
      </section>
    </main>
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'

import NetworkState from '@/components/NetworkState.vue'
import { getMyActivities } from '@/services/activities'
import type { MyActivityListItem } from '@/types/api'
import { formatAmount, getErrorMessage } from '@/utils/formatters'

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

function goBack() { uni.navigateBack() }
function openActivity(id: number) { uni.navigateTo({ url: `/pages/activities/detail?id=${id}` }) }
function browseActivities() { uni.navigateTo({ url: role.value === 'joined' ? '/pages/activities/list' : '/pages/publish/index' }) }
function setRole(value: Role) { if (role.value !== value) { role.value = value; state.value = 'all'; loadActivities() } }
function setState(value: State) { if (state.value !== value) { state.value = value; loadActivities() } }
function pad(value: number) { return String(value).padStart(2, '0') }
function formatRange(start: string, end: string) { const left = new Date(start); const right = new Date(end); return `${pad(left.getMonth() + 1)}月${pad(left.getDate())}日 ${pad(left.getHours())}:${pad(left.getMinutes())}–${pad(right.getHours())}:${pad(right.getMinutes())}` }
function formatJoinedAt(value: string) { const date = new Date(value); return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}` }
function statusCopy(item: MyActivityListItem) { if (item.participation_status === 'cancelled') return '已取消'; return ({ recruiting: '报名中', formed: '已成局', in_progress: '进行中', completed: '已结束', cancelled: '已取消', failed_to_form: '未成局' } as Record<string, string>)[item.status] || '待发布' }
function statusTone(item: MyActivityListItem) { return ['completed', 'cancelled', 'failed_to_form'].includes(item.status) || item.participation_status === 'cancelled' ? 'muted' : item.status === 'formed' ? 'formed' : '' }
function organizerHint(item: MyActivityListItem) { return item.status === 'recruiting' ? `还需 ${Math.max(0, item.min_participants - item.participant_count)} 人成局` : statusCopy(item) }
async function loadActivities() { loading.value = true; error.value = ''; try { activities.value = (await getMyActivities({ role: role.value, state: state.value })).data.items } catch (reason) { error.value = getErrorMessage(reason, '活动记录加载失败') } finally { loading.value = false } }

onShow(loadActivities)
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;
.my-activities-page{min-height:100vh;background:$dz-surface-page}.page-head{position:sticky;z-index:12;top:0;display:flex;align-items:flex-end;justify-content:center;height:calc(98rpx + env(safe-area-inset-top));padding-bottom:18rpx;background:#fff;box-sizing:border-box}.page-head button{position:absolute;left:20rpx;bottom:7rpx;width:70rpx;height:70rpx;margin:0;padding:0;border:0;background:transparent;font-size:50rpx;line-height:70rpx}.page-head button::after,.role-tabs button::after,.state-tabs button::after,.card-foot button::after,.empty-state button::after{display:none}.page-head text{font-size:31rpx;font-weight:800}.role-tabs{position:sticky;z-index:11;top:calc(98rpx + env(safe-area-inset-top));display:flex;height:86rpx;border-bottom:1rpx solid $dz-border-subtle;background:#fff}.role-tabs button{position:relative;flex:1;height:86rpx;margin:0;border:0;color:$dz-text-secondary;background:#fff;font-size:25rpx;line-height:86rpx}.role-tabs button.active{color:$dz-text-primary;font-weight:800}.role-tabs button.active::after{position:absolute;right:38%;bottom:0;left:38%;height:6rpx;border-radius:4rpx;background:$dz-brand-primary;content:''}.state-tabs{display:flex;gap:16rpx;padding-top:22rpx;padding-bottom:6rpx}.state-tabs button{height:56rpx;margin:0;padding:0 28rpx;border:0;border-radius:28rpx;color:$dz-text-secondary;background:#eaf0f1;font-size:21rpx;line-height:56rpx}.state-tabs button.active{color:$dz-brand-deep;background:$dz-brand-soft;font-weight:700}.list-content{padding-top:14rpx;padding-bottom:50rpx}.activity-card{overflow:hidden;margin-bottom:22rpx;border-radius:25rpx;background:#fff;box-shadow:$dz-shadow-card}.cover{position:relative;overflow:hidden;height:238rpx;color:#fff;background:linear-gradient(135deg,#42d7d2,#0eabb9)}.cover image{width:100%;height:100%}.cover>text:not(.status){display:flex;align-items:center;justify-content:center;height:100%;font-size:36rpx;font-weight:800}.status{position:absolute;left:20rpx;top:18rpx;padding:7rpx 15rpx;border-radius:16rpx;color:#fff;background:$dz-brand-primary;font-size:20rpx}.status.formed{background:#20ae6a}.status.muted{background:rgba(43,53,58,.72)}.card-body{padding:22rpx 24rpx 18rpx}.title-row{display:flex;align-items:center;gap:14rpx}.title-row strong{overflow:hidden;flex:1;color:$dz-text-primary;font-size:29rpx;text-overflow:ellipsis;white-space:nowrap}.title-row>text{padding:6rpx 13rpx;border-radius:10rpx;color:$dz-brand-deep;background:$dz-brand-soft;font-size:18rpx}.meta{display:flex;align-items:center;gap:14rpx;margin-top:15rpx;color:$dz-text-secondary;font-size:21rpx}.meta>text:first-child{width:24rpx;color:$dz-brand-primary}.progress-row{display:flex;align-items:flex-end;justify-content:space-between;margin-top:19rpx}.avatars{display:flex;align-items:center;color:$dz-text-secondary}.avatars>text{display:flex;align-items:center;justify-content:center;width:46rpx;height:46rpx;border:3rpx solid #fff;border-radius:50%;color:$dz-brand-deep;background:$dz-brand-soft;font-size:19rpx}.avatars i{margin-left:10rpx;font-size:19rpx;font-style:normal}.price{display:flex;align-items:baseline;color:$dz-price-primary}.price small{margin-right:5rpx;color:$dz-text-secondary;font-size:17rpx}.price strong{font-size:31rpx}.price text{font-size:17rpx}.card-foot{display:flex;align-items:center;justify-content:space-between;min-height:78rpx;padding:0 24rpx;border-top:1rpx solid $dz-border-subtle;color:$dz-text-tertiary;font-size:18rpx}.card-foot button{height:50rpx;margin:0;padding:0 22rpx;border:1rpx solid $dz-brand-primary;border-radius:25rpx;color:$dz-brand-deep;background:#fff;font-size:19rpx;line-height:48rpx}.empty-state{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:630rpx;color:$dz-text-secondary;text-align:center}.empty-icon{display:flex;align-items:center;justify-content:center;width:116rpx;height:116rpx;border-radius:50%;color:$dz-brand-primary;background:$dz-brand-soft;font-size:60rpx}.empty-state strong{margin-top:25rpx;color:$dz-text-primary;font-size:28rpx}.empty-state>text:not(.empty-icon){margin-top:13rpx;font-size:21rpx}.empty-state button{height:66rpx;margin:30rpx 0 0;padding:0 42rpx;border:0;border-radius:33rpx;color:#fff;background:$dz-gradient-brand;font-size:22rpx;line-height:66rpx}
</style>
