<template>
  <scroll-view
    class="dz-list-filters"
    :class="`dz-list-filters--${mode}`"
    scroll-x
    :show-scrollbar="false"
    :scroll-into-view="activeId"
    :scroll-with-animation="false"
    role="group"
    :aria-label="label"
  >
    <view class="dz-list-filters__row">
      <button
        v-for="(option, index) in options"
        :id="`${filterId}-${index}`"
        :key="option.value"
        class="dz-list-filter"
        role="button"
        tabindex="0"
        :class="{ 'dz-list-filter--selected': value === option.value }"
        :aria-pressed="value === option.value"
        hover-class="dz-list-filter--pressed"
        :hover-stay-time="60"
        @tap="$emit('change', option.value)"
        @keydown.enter.prevent="$emit('change', option.value)"
        @keydown.space.prevent="$emit('change', option.value)"
      >
        <view class="dz-list-filter__face">
          <text>{{ option.label }}</text>
          <text v-if="option.count !== undefined" class="dz-list-filter__count">{{ option.count }}</text>
          <view v-if="option.dot" class="dz-list-filter__dot" aria-hidden="true" />
        </view>
      </button>
    </view>
  </scroll-view>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onMounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  value: string
  options: readonly { value: string; label: string; count?: number; dot?: boolean }[]
  label: string
  mode?: 'chips' | 'tabs' | 'compact'
}>(), { mode: 'chips' })
defineEmits<{ change: [value: string] }>()

const filterId = `dz-list-filter-${getCurrentInstance()?.uid}`
const selectedId = computed(() => `${filterId}-${Math.max(0, props.options.findIndex(option => option.value === props.value))}`)
const activeId = ref('')
// scroll-view 首次挂载时还不能定位子项；挂载后再设置，保证带筛选参数进入也能看到选中按钮。
function revealSelection() { void nextTick(() => { activeId.value = selectedId.value }) }
onMounted(revealSelection)
watch(selectedId, revealSelection)
</script>

<style lang="scss" scoped>
@use '../styles/tokens.scss' as *;

.dz-list-filters { width: 100%; white-space: nowrap; }
.dz-list-filters__row { display: flex; width: max-content; min-width: 100%; align-items: center; gap: $dz-space-2; }
.dz-list-filter {
  display: flex;
  min-width: 44px;
  min-height: 44px;
  height: max(44px, #{$dz-touch-min});
  flex: none;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: $dz-radius-full;
  color: $dz-list-text;
  background: transparent;
  font-size: max(14px, #{$dz-fs-body});
  font-weight: $dz-fw-regular;
  line-height: 1.5;
  white-space: nowrap;
}
.dz-list-filter::after { display: none; }
.dz-list-filter__face {
  position: relative;
  display: flex;
  min-width: 56px;
  height: 36px;
  align-items: center;
  justify-content: center;
  gap: $dz-space-2;
  padding: 0 $dz-space-3;
  border-radius: $dz-radius-full;
  background: $dz-surface-page;
  box-sizing: border-box;
}
.dz-list-filter--selected { font-weight: $dz-fw-semibold; }
.dz-list-filter--selected .dz-list-filter__face { color: $dz-text-inverse; background: $dz-list-accent; }
.dz-list-filter__count {
  display: flex;
  min-width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  padding: 0 $dz-space-1;
  border-radius: 6px;
  color: $dz-list-text;
  background: $dz-surface-page;
  font-size: max(12px, #{$dz-fs-caption});
  font-weight: $dz-fw-medium;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.dz-list-filter__dot { width: 6px; height: 6px; flex: none; border-radius: $dz-radius-full; background: $dz-price-primary; }
.dz-list-filters--tabs .dz-list-filters__row { width: 100%; border-bottom: 1px solid $dz-border-subtle; }
.dz-list-filters--tabs .dz-list-filter { position: relative; height: 48px; flex: 1; border-radius: 0; font-size: max(15px, #{$dz-fs-body-strong}); }
.dz-list-filters--tabs .dz-list-filter__face { height: 100%; padding: 0; background: transparent; }
.dz-list-filters--tabs .dz-list-filter--selected .dz-list-filter__face { color: $dz-list-accent; background: transparent; }
.dz-list-filters--tabs .dz-list-filter--selected::before { position: absolute; right: 22px; bottom: -1px; left: 22px; height: 2px; border-radius: 1px; background: $dz-list-accent; content: ''; }
.dz-list-filters--tabs .dz-list-filter--selected .dz-list-filter__count { color: $dz-list-accent; background: $dz-brand-soft; }
.dz-list-filters--compact .dz-list-filter__face { height: 30px; }
.dz-list-filters--compact .dz-list-filter--selected .dz-list-filter__face { color: $dz-list-accent; background: $dz-brand-soft; }
.dz-list-filter--pressed, .dz-list-filter:active { transform: scale(.97); opacity: .86; }
.dz-list-filter:focus-visible { outline: 2px solid $dz-list-accent; outline-offset: -2px; }
@media (prefers-reduced-motion: reduce) { .dz-list-filter--pressed, .dz-list-filter:active { transform: none; } }
@media (prefers-contrast: more) { .dz-list-filter__face { outline: 1px solid currentColor; outline-offset: -1px; } }
</style>
