<template>
  <button
    class="dz-btn"
    :class="[`dz-btn--${type}`, `dz-btn--${size}`, { 'dz-btn--block': block, 'dz-btn--disabled': disabled || loading }]"
    :disabled="disabled || loading"
    hover-class="dz-btn--pressed"
    :hover-stay-time="60"
    @tap="$emit('tap')"
  >
    <view v-if="loading" class="dz-btn__spinner" />
    <text class="dz-btn__label"><slot /></text>
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
    size?: 'lg' | 'md' | 'sm'
    block?: boolean
    disabled?: boolean
    loading?: boolean
  }>(),
  { type: 'primary', size: 'lg', block: false, disabled: false, loading: false },
)
defineEmits<{ tap: [] }>()
</script>

<style lang="scss" scoped>
@use '../styles/tokens.scss' as *;

.dz-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: $dz-space-2;
  margin: 0;
  padding: 0 $dz-space-5;
  border: 0;
  border: 1rpx solid transparent;
  border-radius: $dz-radius-lg;
  font-size: $dz-fs-body;
  font-weight: $dz-fw-semibold;
  line-height: 1;
  transition:
    transform $dz-duration-fast $dz-ease-out,
    opacity $dz-duration-fast $dz-ease-standard,
    box-shadow $dz-duration-fast $dz-ease-standard;
}

.dz-btn--block {
  display: flex;
  width: 100%;
}

.dz-btn--lg { height: 88rpx; }
.dz-btn--md { height: 80rpx; }
.dz-btn--sm {
  height: 64rpx;
  padding: 0 $dz-space-4;
  font-size: $dz-fs-caption;
}

.dz-btn--primary {
  color: $dz-text-inverse;
  background: $dz-gradient-brand;
  box-shadow: $dz-shadow-brand;
  border-color: rgba(255, 255, 255, 0.34);
}

.dz-btn--secondary {
  color: $dz-brand-deep;
  background: rgba(221, 248, 247, 0.88);
  box-shadow: inset 0 1rpx 0 $dz-surface-highlight;
}

.dz-btn--outline {
  color: $dz-text-primary;
  background: $dz-surface-card;
  border-color: $dz-border-subtle;
  box-shadow: inset 0 1rpx 0 $dz-surface-highlight;
}

.dz-btn--ghost {
  color: $dz-brand-deep;
  background: transparent;
}

.dz-btn--danger {
  color: $dz-text-inverse;
  background: $dz-status-danger;
}

.dz-btn--pressed {
  transform: scale(0.975);
  opacity: 0.86;
  box-shadow: none;
}

.dz-btn--disabled {
  opacity: 0.45;
  box-shadow: none;
}

.dz-btn__spinner {
  width: 28rpx;
  height: 28rpx;
  border: 3rpx solid rgba(255, 255, 255, 0.35);
  border-top-color: rgba(255, 255, 255, 0.95);
  border-radius: 50%;
  animation: dz-btn-spin 700ms linear infinite;
}

.dz-btn--secondary .dz-btn__spinner,
.dz-btn--outline .dz-btn__spinner,
.dz-btn--ghost .dz-btn__spinner {
  border-color: rgba(8, 174, 180, 0.25);
  border-top-color: $dz-brand-deep;
}

@keyframes dz-btn-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .dz-btn {
    transition: opacity $dz-duration-fast $dz-ease-standard;
  }

  .dz-btn--pressed {
    transform: none;
  }
}
</style>
