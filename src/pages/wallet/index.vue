<template>
  <view class="dz-page wallet-page">
    <view class="wallet-hero">
      <DzNavBar title="我的余额" :back-action="goBack" surface="integrated" :sticky="false" />
      <view class="dz-container">
        <section class="balance-card">
          <view class="balance-label"><text>可用余额</text><i>收支明细实时可查</i></view>
          <view class="balance-value"><text>¥</text><strong>{{ money(wallet?.available_balance || 0) }}</strong></view>
          <view v-if="wallet?.frozen_balance" class="frozen">支付冻结 ¥{{ money(wallet.frozen_balance) }}</view>
          <button class="recharge-button dz-tappable" role="button" tabindex="0" hover-class="recharge-button--pressed" @tap="openRecharge" @keydown.enter.prevent="openRecharge" @keydown.space.prevent="openRecharge">立即充值</button>
        </section>
      </view>
    </view>

    <main class="wallet-content dz-container">
      <view class="section-head"><strong>余额明细</strong><text>最近 {{ wallet?.ledger_entries.length || 0 }} 条</text></view>
      <view v-if="loading" class="ledger-card"><view v-for="i in 3" :key="i" class="ledger-skeleton dz-skeleton" /></view>
      <NetworkState v-else-if="error" :message="error" error @retry="load" />
      <view v-else-if="!wallet?.ledger_entries.length" class="empty-state"><text class="empty-icon">¥</text><strong>暂无余额明细</strong><text>充值或使用余额后，资金变化会记录在这里</text></view>
      <section v-else class="ledger-card">
        <view v-for="entry in wallet.ledger_entries" :key="entry.public_id" class="ledger-row">
          <view class="ledger-icon" :class="entry.available_delta >= 0 ? 'income' : 'expense'">{{ entry.available_delta >= 0 ? '+' : '−' }}</view>
          <view class="ledger-copy"><strong>{{ entry.description || entry.entry_type_label }}</strong><text>{{ dateTime(entry.created_at) }} · {{ entry.reference_no }}</text></view>
          <view class="ledger-amount" :class="entry.available_delta >= 0 ? 'income' : ''"><strong>{{ signedMoney(entry.available_delta) }}</strong><text>余额 ¥{{ money(entry.available_balance_after) }}</text></view>
        </view>
      </section>
      <section class="wallet-note"><strong>余额使用说明</strong><text>余额仅用于平台内消费，不支持提现；订单退款会按照余额与外部支付的原支付构成分别退回。</text></section>
    </main>
  </view>
</template>

<script setup lang="ts">
import { navigateBackOr } from '@/utils/navigation'
import DzNavBar from '@/components/DzNavBar.vue'
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import NetworkState from '@/components/NetworkState.vue'
import { getMyWallet } from '@/services/wallet'
import { guardCurrentPage } from '@/services/session'
import type { UserWallet } from '@/types/api'
import { formatAmount, getErrorMessage } from '@/utils/formatters'

const wallet = ref<UserWallet | null>(null)
const loading = ref(true)
const error = ref('')
const money = formatAmount
function goBack() { navigateBackOr(() => uni.redirectTo({ url: '/pages/profile/index' })) }
function openRecharge() { uni.navigateTo({ url: '/pages/wallet/recharge' }) }
function signedMoney(value: number) { return `${value >= 0 ? '+' : '-'}¥${money(Math.abs(value))}` }
function dateTime(value: string) { return new Date(value).toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-') }
async function load() { loading.value = true; error.value = ''; try { wallet.value = (await getMyWallet()).data } catch (reason) { error.value = getErrorMessage(reason, '余额加载失败') } finally { loading.value = false } }
onShow(() => { if (guardCurrentPage()) void load() })
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;
.wallet-page{background:$dz-surface-page}.wallet-hero{padding-bottom:42rpx;background:linear-gradient(155deg,#e9ffff 0%,#d8f7f7 45%,#f3f6f7 100%)}.dz-page-head text{font-size:$dz-fs-title;font-weight:$dz-fw-bold}.head-space{width:72rpx}.balance-card{position:relative;overflow:hidden;margin-top:18rpx;padding:38rpx;border:1rpx solid rgba(255,255,255,.8);border-radius:36rpx;color:#fff;background:linear-gradient(140deg,#10343a,#0b777c 58%,#11b8bb);box-shadow:0 28rpx 60rpx rgba(7,90,95,.22)}.balance-card::after{position:absolute;right:-80rpx;bottom:-110rpx;width:320rpx;height:320rpx;border:46rpx solid rgba(255,255,255,.08);border-radius:50%;content:''}.balance-label{display:flex;align-items:center;justify-content:space-between}.balance-label>text{font-size:27rpx;font-weight:700}.balance-label i{font-size:22rpx;font-style:normal;opacity:.76}.balance-value{display:flex;align-items:baseline;margin:28rpx 0 26rpx}.balance-value text{margin-right:8rpx;font-size:34rpx}.balance-value strong{font-size:72rpx;line-height:1;letter-spacing:-3rpx}.frozen{margin-top:-10rpx;margin-bottom:22rpx;font-size:23rpx;opacity:.78}
.recharge-button {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: max(44px, 88rpx);
  margin: 0;
  padding: $dz-space-2 $dz-space-4;
  border: 0;
  border-radius: 24rpx;
  color: #0b5c61;
  background: rgba(255,255,255,.94);
  font-size: max(14px, #{$dz-fs-body-strong});
  font-weight: $dz-fw-bold;
  line-height: 1.4;
  box-sizing: border-box;
  transition: transform 100ms ease-out, opacity 100ms ease-out;
}
.recharge-button--pressed{transform:scale(.98);opacity:.9}.wallet-content{padding-top:30rpx;padding-bottom:calc(44rpx + env(safe-area-inset-bottom))}.section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:18rpx}.section-head strong{font-size:30rpx}.section-head text{color:$dz-text-tertiary;font-size:23rpx}.ledger-card{overflow:hidden;border:1rpx solid $dz-border-subtle;border-radius:28rpx;background:#fff;box-shadow:$dz-shadow-card}.ledger-row{display:flex;min-height:132rpx;align-items:center;gap:20rpx;padding:20rpx 24rpx;border-bottom:1rpx solid $dz-border-subtle}.ledger-row:last-child{border-bottom:0}.ledger-icon{display:flex;width:62rpx;height:62rpx;flex:none;align-items:center;justify-content:center;border-radius:20rpx;color:#7d8a8f;background:#eff2f3;font-size:34rpx;font-weight:500}.ledger-icon.income{color:#078e72;background:#e5f8f1}.ledger-copy{display:flex;min-width:0;flex:1;flex-direction:column;gap:8rpx}.ledger-copy strong{font-size:27rpx}.ledger-copy text,.ledger-amount text{overflow:hidden;color:$dz-text-tertiary;font-size:21rpx;text-overflow:ellipsis;white-space:nowrap}.ledger-amount{display:flex;align-items:flex-end;flex-direction:column;gap:8rpx}.ledger-amount strong{font-size:27rpx}.ledger-amount.income strong{color:#078e72}.wallet-note{display:flex;flex-direction:column;gap:10rpx;margin-top:24rpx;padding:24rpx;border-radius:22rpx;color:#526b70;background:#eaf6f6}.wallet-note strong{font-size:25rpx}.wallet-note text{font-size:23rpx;line-height:1.65}.empty-state{display:flex;min-height:340rpx;align-items:center;justify-content:center;flex-direction:column;gap:14rpx;color:$dz-text-tertiary}.empty-state strong{color:$dz-text-primary}.empty-icon{display:flex;width:80rpx;height:80rpx;align-items:center;justify-content:center;border-radius:28rpx;color:#0baeb4;background:#ddf7f7;font-size:38rpx}.ledger-skeleton{height:90rpx;margin:20rpx;border-radius:18rpx}@media(prefers-reduced-motion:reduce){.recharge-button{transition:none}}
.recharge-button:focus-visible {
  outline: 2px solid $dz-text-primary;
  outline-offset: 3px;
}
.recharge-button::after { border: 0; }
</style>
