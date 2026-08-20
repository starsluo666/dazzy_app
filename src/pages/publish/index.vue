<template>
  <view class="dz-page publish-page">
    <header class="page-head"><button aria-label="返回" @tap="goBack">‹</button><text>发布活动</text><text class="draft-mark">草稿</text></header>
    <main class="form-content dz-container">
      <section class="cover-card" @tap="chooseCover">
        <image v-if="coverPath" :src="coverPath" mode="aspectFill" />
        <view v-else><text>＋</text><strong>添加活动封面</strong><small>建议上传 4:3 横图</small></view>
        <text v-if="coverPath" class="replace">更换封面</text>
      </section>
      <text class="cover-tip">封面会在正式提交审核前上传，本阶段先保存本地预览。</text>

      <section class="panel">
        <text class="section-title">基本信息</text>
        <view class="categories">
          <button v-for="item in categories" :key="item.slug" :class="{ active: form.categorySlug === item.slug }" @tap="form.categorySlug = item.slug">{{ item.name }}</button>
        </view>
        <label class="field"><text>活动标题</text><input v-model="form.title" maxlength="80" placeholder="一句话介绍你的活动" /><small>{{ form.title.length }}/80</small></label>
        <label class="field textarea-field"><text>活动介绍</text><textarea v-model="form.description" maxlength="2000" placeholder="介绍活动内容、适合人群和流程" /></label>
        <label class="field textarea-field"><text>参与规则</text><textarea v-model="form.rules" maxlength="2000" placeholder="例如：准时到场、文明参与、费用范围" /></label>
      </section>

      <section class="panel">
        <text class="section-title">时间与地点</text>
        <view class="field-row"><text>活动日期</text><picker mode="date" :value="form.date" :start="minDate" :end="maxDate" @change="setDate"><text>{{ form.date }}</text></picker><b>›</b></view>
        <view class="field-row"><text>开始时间</text><picker mode="time" :value="form.startTime" @change="setStartTime"><text>{{ form.startTime }}</text></picker><b>›</b></view>
        <view class="field-row"><text>结束时间</text><picker mode="time" :value="form.endTime" @change="setEndTime"><text>{{ form.endTime }}</text></picker><b>›</b></view>
        <view class="field-row"><text>成局截止</text><picker mode="date" :value="form.deadlineDate" :end="form.date" @change="setDeadlineDate"><text>{{ form.deadlineDate }} {{ form.deadlineTime }}</text></picker><b>›</b></view>
        <view class="field-row" @tap="openAddressSheet"><text>集合地点</text><text :class="{ placeholder: !location }">{{ location?.name || '请选择地图地点' }}</text><b>›</b></view>
        <text class="rule-tip">活动开始时间须在未来48小时至30天内。</text>
      </section>

      <section class="panel">
        <text class="section-title">人数与费用</text>
        <label class="number-row"><text>人数上限</text><view><button @tap.prevent="changeCapacity(-1)">−</button><strong>{{ form.capacity }}人</strong><button @tap.prevent="changeCapacity(1)">＋</button></view></label>
        <label class="number-row"><text>最少成局人数</text><view><button @tap.prevent="changeMinimum(-1)">−</button><strong>{{ form.minimum }}人</strong><button @tap.prevent="changeMinimum(1)">＋</button></view></label>
        <label class="field price-field"><text>单人AA本金</text><view><i>¥</i><input v-model="form.price" type="digit" placeholder="0.00" /></view></label>
        <view class="fee-preview"><text>平台组局服务费（10%）</text><strong>¥{{ serviceFee }}</strong></view>
        <view class="fee-preview total"><text>发起人预计支付</text><strong>¥{{ totalFee }}</strong></view>
      </section>

      <section class="panel refund"><view><text class="section-title">退款规则</text><text class="locked">发布后不可修改</text></view><strong>标准退款模板</strong><text>≥12小时全退；6–12小时退AA本金；2–6小时退70% AA本金；不足2小时不退款。</text></section>
      <label class="agreement" @tap="agreed = !agreed"><text :class="{ active: agreed }">{{ agreed ? '✓' : '' }}</text>我已阅读并同意<em>活动发布规则</em>和<em>退款规则</em></label>
    </main>
    <footer class="publish-footer"><view><text>预计支付</text><strong>¥{{ totalFee }}</strong></view><button :disabled="!canSubmit || submitting" @tap="submit">{{ submitting ? '保存中…' : '保存并进入支付' }}</button></footer>

    <view v-if="addressSheet" class="sheet-mask" @tap="addressSheet = false"><section class="bottom-sheet" @tap.stop><view class="handle"/><view class="sheet-head"><strong>选择集合地点</strong><button @tap="addressSheet = false">×</button></view><label class="search"><text>⌕</text><input v-model="keyword" placeholder="搜索邯郸市地点" confirm-type="search" @confirm="searchAddress"/></label><view v-if="searching" class="sheet-state">正在搜索…</view><view v-else-if="!locations.length" class="sheet-state">输入场馆或地点名称进行搜索</view><scroll-view v-else scroll-y class="location-list"><button v-for="item in locations" :key="`${item.name}-${item.longitude}`" @tap="selectLocation(item)"><strong>{{ item.name }}</strong><text>{{ item.address }}</text></button></scroll-view></section></view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { createActivityDraft, getActivityCategories } from '@/services/activities'
import { searchLocations } from '@/services/locations'
import type { ActivityCategoryItem, LocationItem } from '@/types/api'
import { getErrorMessage } from '@/utils/formatters'

const pad=(value:number)=>String(value).padStart(2,'0'),dateValue=(date:Date)=>`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`
const now=new Date(),start=new Date(now);start.setDate(start.getDate()+3);const deadline=new Date(start);deadline.setDate(deadline.getDate()-1)
const min=new Date(now);min.setDate(min.getDate()+2);const max=new Date(now);max.setDate(max.getDate()+30)
const minDate=dateValue(min),maxDate=dateValue(max)
const form=reactive({categorySlug:'',title:'',description:'',rules:'',date:dateValue(start),startTime:'14:00',endTime:'17:00',deadlineDate:dateValue(deadline),deadlineTime:'20:00',capacity:8,minimum:4,price:'68'})
const categories=ref<ActivityCategoryItem[]>([]),location=ref<LocationItem|null>(null),coverPath=ref(''),agreed=ref(false),submitting=ref(false),addressSheet=ref(false),keyword=ref(''),locations=ref<LocationItem[]>([]),searching=ref(false)
const principalCents=computed(()=>Math.round((Number(form.price)||0)*100)),serviceFeeCents=computed(()=>Math.round(principalCents.value*.1)),serviceFee=computed(()=>(serviceFeeCents.value/100).toFixed(2)),totalFee=computed(()=>((principalCents.value+serviceFeeCents.value)/100).toFixed(2))
const canSubmit=computed(()=>!!form.categorySlug&&form.title.trim().length>=4&&!!form.description.trim()&&!!form.rules.trim()&&!!location.value&&principalCents.value>0&&agreed.value)
function goBack(){uni.navigateBack()}function setDate(event:any){form.date=event.detail.value;if(form.deadlineDate>=form.date){const value=new Date(`${form.date}T00:00:00`);value.setDate(value.getDate()-1);form.deadlineDate=dateValue(value)}}function setStartTime(event:any){form.startTime=event.detail.value}function setEndTime(event:any){form.endTime=event.detail.value}function setDeadlineDate(event:any){form.deadlineDate=event.detail.value}
function changeCapacity(step:number){form.capacity=Math.max(2,Math.min(100,form.capacity+step));form.minimum=Math.min(form.minimum,form.capacity)}function changeMinimum(step:number){form.minimum=Math.max(2,Math.min(form.capacity,form.minimum+step))}
function chooseCover(){uni.chooseImage({count:1,sizeType:['compressed'],success:result=>{coverPath.value=result.tempFilePaths[0]||''}})}function openAddressSheet(){addressSheet.value=true}
async function searchAddress(){if(keyword.value.trim().length<2)return;searching.value=true;try{locations.value=(await searchLocations(keyword.value.trim())).data.items}catch(reason){uni.showToast({title:getErrorMessage(reason,'地点搜索失败'),icon:'none'})}finally{searching.value=false}}
function selectLocation(item:LocationItem){location.value=item;addressSheet.value=false}
function localIso(date:string,time:string){return new Date(`${date}T${time}:00`).toISOString()}
async function submit(){if(!canSubmit.value||!location.value||submitting.value)return;submitting.value=true;try{await createActivityDraft({category_slug:form.categorySlug,title:form.title.trim(),starts_at:localIso(form.date,form.startTime),ends_at:localIso(form.date,form.endTime),formation_deadline:localIso(form.deadlineDate,form.deadlineTime),meeting_place_name:location.value.name,meeting_address:location.value.address||location.value.name,longitude:Number(location.value.longitude),latitude:Number(location.value.latitude),capacity:form.capacity,min_participants:form.minimum,description:form.description.trim(),participation_rules:form.rules.trim(),aa_principal_amount:principalCents.value,refund_template_version:'standard-v1'});uni.showModal({title:'活动草稿已保存',content:'活动支付功能接入后，可支付本人AA费用并提交平台审核。',showCancel:false,success:()=>uni.redirectTo({url:'/pages/activities/mine'})})}catch(reason){uni.showToast({title:getErrorMessage(reason,'保存活动失败'),icon:'none'})}finally{submitting.value=false}}
onLoad(async()=>{try{categories.value=(await getActivityCategories()).data.items;form.categorySlug=categories.value[0]?.slug||''}catch(reason){uni.showToast({title:getErrorMessage(reason,'分类加载失败'),icon:'none'})}})
</script>

<style lang="scss" scoped>
@use '../../styles/tokens.scss' as *;
.publish-page{min-height:100vh;padding-bottom:calc(126rpx + env(safe-area-inset-bottom));background:$dz-surface-page}.page-head{display:flex;align-items:flex-end;justify-content:center;height:calc(98rpx + env(safe-area-inset-top));padding-bottom:18rpx;background:#fff;box-sizing:border-box;position:relative}.page-head>button{position:absolute;left:20rpx;bottom:7rpx;width:70rpx;height:70rpx;margin:0;padding:0;border:0;background:transparent;font-size:50rpx;line-height:70rpx}.page-head>text:not(.draft-mark){font-size:31rpx;font-weight:800}.draft-mark{position:absolute;right:25rpx;bottom:25rpx;color:$dz-text-tertiary;font-size:20rpx}.page-head button::after,.categories button::after,.number-row button::after,.publish-footer button::after,.sheet-head button::after,.location-list button::after{display:none}.form-content{padding-top:20rpx;padding-bottom:30rpx}.cover-card{position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center;height:310rpx;border-radius:25rpx;color:#fff;background:linear-gradient(135deg,#69dfda,#0db4c1)}.cover-card image{width:100%;height:100%}.cover-card>view{display:flex;flex-direction:column;align-items:center}.cover-card>view>text{font-size:64rpx;font-weight:200}.cover-card strong{font-size:27rpx}.cover-card small{margin-top:10rpx;opacity:.78;font-size:19rpx}.replace{position:absolute;right:18rpx;bottom:18rpx;padding:8rpx 16rpx;border-radius:20rpx;background:rgba(20,30,34,.65);font-size:19rpx}.cover-tip{display:block;margin:10rpx 4rpx 0;color:$dz-text-tertiary;font-size:17rpx}.panel{margin-top:20rpx;padding:24rpx;border-radius:24rpx;background:#fff;box-shadow:$dz-shadow-card}.section-title{display:block;margin-bottom:20rpx;font-size:27rpx;font-weight:800}.categories{display:flex;flex-wrap:wrap;gap:12rpx;margin-bottom:8rpx}.categories button{height:54rpx;margin:0;padding:0 23rpx;border:0;border-radius:27rpx;color:$dz-text-secondary;background:#f0f3f4;font-size:20rpx;line-height:54rpx}.categories button.active{color:$dz-brand-deep;background:$dz-brand-soft;font-weight:700}.field,.field-row,.number-row{position:relative;display:flex;align-items:center;min-height:88rpx;border-bottom:1rpx solid $dz-border-subtle;font-size:22rpx}.field>text,.field-row>text:first-child,.number-row>text{flex:0 0 160rpx;font-weight:650}.field input{flex:1;font-size:22rpx}.field>small{color:$dz-text-tertiary;font-size:17rpx}.textarea-field{display:block;padding:20rpx 0}.textarea-field>text{display:block}.textarea-field textarea{width:100%;height:130rpx;margin-top:16rpx;padding:16rpx;border-radius:14rpx;background:$dz-surface-page;box-sizing:border-box;font-size:21rpx}.field-row>picker,.field-row>text:nth-child(2){flex:1;color:$dz-text-secondary;text-align:right}.field-row .placeholder{color:$dz-text-tertiary}.field-row>b{margin-left:12rpx;color:$dz-text-tertiary;font-size:30rpx}.rule-tip{display:block;margin-top:18rpx;color:$dz-brand-deep;font-size:18rpx}.number-row{justify-content:space-between}.number-row>view{display:flex;align-items:center;gap:20rpx}.number-row button{width:50rpx;height:50rpx;margin:0;padding:0;border:0;border-radius:50%;color:$dz-brand-deep;background:$dz-brand-soft;font-size:28rpx;line-height:50rpx}.number-row strong{min-width:70rpx;text-align:center}.price-field>view{display:flex;align-items:center;flex:1}.price-field i{color:$dz-price-primary;font-size:28rpx;font-style:normal}.price-field input{text-align:right;color:$dz-price-primary;font-size:30rpx}.fee-preview{display:flex;justify-content:space-between;padding-top:18rpx;color:$dz-text-secondary;font-size:20rpx}.fee-preview strong{color:$dz-text-primary}.fee-preview.total{margin-top:17rpx;border-top:1rpx dashed $dz-border-subtle;color:$dz-text-primary;font-size:23rpx}.fee-preview.total strong{color:$dz-price-primary;font-size:31rpx}.refund>view{display:flex;align-items:center;justify-content:space-between}.refund .section-title{margin:0}.locked{color:$dz-text-tertiary;font-size:18rpx}.refund>strong{display:block;margin-top:22rpx;color:$dz-brand-deep;font-size:23rpx}.refund>text{display:block;margin-top:12rpx;color:$dz-text-secondary;font-size:19rpx;line-height:1.65}.agreement{display:flex;align-items:center;margin:24rpx 4rpx;color:$dz-text-secondary;font-size:18rpx}.agreement>text{display:flex;align-items:center;justify-content:center;width:30rpx;height:30rpx;margin-right:10rpx;border:2rpx solid #bbc4c7;border-radius:50%;color:#fff}.agreement>text.active{border-color:$dz-brand-primary;background:$dz-brand-primary}.agreement em{color:$dz-brand-deep;font-style:normal}.publish-footer{position:fixed;z-index:30;right:0;bottom:0;left:0;display:flex;align-items:center;gap:20rpx;max-width:750px;height:calc(112rpx + env(safe-area-inset-bottom));margin:auto;padding:12rpx 24rpx env(safe-area-inset-bottom);background:#fff;box-shadow:0 -6rpx 24rpx rgba(31,65,72,.1);box-sizing:border-box}.publish-footer>view{display:flex;flex-direction:column;min-width:210rpx;color:$dz-text-secondary;font-size:18rpx}.publish-footer strong{color:$dz-price-primary;font-size:34rpx}.publish-footer button{flex:1;height:76rpx;margin:0;border:0;border-radius:38rpx;color:#fff;background:$dz-gradient-brand;font-size:24rpx;font-weight:700;line-height:76rpx}.publish-footer button[disabled]{opacity:.42}.sheet-mask{position:fixed;z-index:50;inset:0;background:rgba(16,28,32,.46)}.bottom-sheet{position:absolute;right:0;bottom:0;left:0;max-width:750px;min-height:620rpx;margin:auto;padding:14rpx 26rpx calc(28rpx + env(safe-area-inset-bottom));border-radius:32rpx 32rpx 0 0;background:#fff;box-sizing:border-box}.handle{width:70rpx;height:7rpx;margin:0 auto 12rpx;border-radius:4rpx;background:#dce2e4}.sheet-head{display:flex;align-items:center;justify-content:space-between;height:72rpx}.sheet-head strong{font-size:27rpx}.sheet-head button{width:58rpx;height:58rpx;margin:0;padding:0;border:0;background:transparent;font-size:36rpx;line-height:58rpx}.search{display:flex;align-items:center;gap:12rpx;height:66rpx;padding:0 20rpx;border-radius:33rpx;background:$dz-surface-page}.search input{flex:1;font-size:21rpx}.sheet-state{display:flex;align-items:center;justify-content:center;min-height:300rpx;color:$dz-text-tertiary;font-size:21rpx}.location-list{max-height:430rpx;margin-top:16rpx}.location-list button{display:flex;flex-direction:column;width:100%;min-height:94rpx;margin:0;padding:18rpx 6rpx;border:0;border-bottom:1rpx solid $dz-border-subtle;background:#fff;text-align:left}.location-list strong{font-size:22rpx}.location-list text{margin-top:8rpx;color:$dz-text-secondary;font-size:18rpx}
</style>
