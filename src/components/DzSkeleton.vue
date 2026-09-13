<template>
  <view v-if="variant === 'cards'" class="dz-skel-cards">
    <view v-for="i in count" :key="i" class="dz-skel-cards__item">
      <view class="dz-skeleton dz-skel-cards__photo" />
      <view class="dz-skeleton dz-skel-cards__line dz-skel-cards__line--title" />
      <view class="dz-skeleton dz-skel-cards__line dz-skel-cards__line--meta" />
    </view>
  </view>

  <view v-else class="dz-skel-rows">
    <view
      v-for="i in rows"
      :key="i"
      class="dz-skeleton dz-skel-rows__line"
      :style="{ width: widthFor(i) }"
    />
  </view>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'rows' | 'cards'
    rows?: number
    count?: number
  }>(),
  { variant: 'rows', rows: 3, count: 4 },
)

function widthFor(index: number): string {
  const widths = ['100%', '88%', '62%']
  return widths[(index - 1) % widths.length]
}
</script>

<style lang="scss" scoped>
@use '../styles/tokens.scss' as *;

.dz-skel-rows {
  display: flex;
  flex-direction: column;
  gap: $dz-space-3;
  padding: $dz-space-4 0;
}

.dz-skel-rows__line {
  height: 32rpx;
}

.dz-skel-cards {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: $dz-space-3;
  padding: $dz-space-4 0;
}

.dz-skel-cards__item {
  display: flex;
  flex-direction: column;
  gap: $dz-space-2;
  overflow: hidden;
  border-radius: $dz-radius-md;
  background: $dz-surface-card;
  padding-bottom: $dz-space-3;
}

.dz-skel-cards__photo {
  height: 194rpx;
  border-radius: 0;
}

.dz-skel-cards__line {
  height: 24rpx;
  margin: 0 $dz-space-3;
}

.dz-skel-cards__line--meta { width: 62%; }
</style>
