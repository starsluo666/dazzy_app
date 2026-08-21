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

page {
  min-height: 100%;
  color: $dz-text-primary;
  background: $dz-surface-page;
  font-family: 'PingFang SC', 'HarmonyOS Sans SC', 'Microsoft YaHei', sans-serif;
}

button::after { border: 0; }
</style>
