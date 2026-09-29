<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { guardCurrentPage, installAuthenticationGuards } from '@/services/session'

onLaunch(() => {
  installAuthenticationGuards()
  console.info('[DAZZY] app launched')
})
onShow(() => setTimeout(guardCurrentPage, 0))
</script>

<style lang="scss">
@use './styles/tokens.scss' as *;
@use './styles/layout.scss';
@use './styles/motion.scss';
@use './styles/lists.scss';

page {
  min-height: 100%;
  color: $dz-text-primary;
  background: $dz-surface-page;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'PingFang SC', 'HarmonyOS Sans SC', 'Microsoft YaHei', sans-serif;
  -webkit-font-smoothing: antialiased;
  font-optical-sizing: auto;
  text-rendering: optimizeLegibility;
}

button {
  font: inherit;
  -webkit-tap-highlight-color: transparent;
}

button::after { border: 0; }
</style>
