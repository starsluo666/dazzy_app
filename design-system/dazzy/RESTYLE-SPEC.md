# dazzy_app 页面视觉重构执行规范（Phase 3/4）

> 目的：在不改任何业务逻辑的前提下，把页面样式对齐设计系统。
> 样板参照：`src/pages/index/index.vue`（首页，已完成）。
> 令牌定义：`src/styles/tokens.scss`；全局动效工具类：`src/styles/motion.scss`（已在 App.vue 全局引入）。

## 铁律（违反即返工）

1. `<script>` 区只允许新增组件/常量 import，禁止改动任何业务逻辑、数据流、事件处理。
2. 模板只允许：增删纯视觉 class、替换空态/弹层/骨架的展示结构、绑定新组件的 props/事件（同名语义）。
3. 禁止新增任何 npm 依赖；禁止修改 tokens.scss / uni.scss / pages.json。
4. 颜色一律用 `$dz-*` 令牌；允许的字面例外：第三方支付品牌色（微信绿/支付宝蓝）、`confirmColor` 等运行时字符串（用 `@/utils/brand` 常量）、英雄图上的深青文字 `#075b67`、装饰性多段渐变的中间色标。
5. 每完成一批页面必须跑 `npm run type-check` 且通过。

## 令牌映射表（逐页替换规则）

### 字号（rpx → 令牌）
- ≥44 → `$dz-fs-price-lg`(48)（仅英雄标题/大价格）
- 38–41 → `$dz-fs-title`(40)
- 32–36 → `$dz-fs-heading`(34)（模块标题）或价格用 `$dz-fs-price-md`(36)
- 29–31 → `$dz-fs-body-strong`(30)（卡片标题/页面头）
- 26–28 → `$dz-fs-body`(28)
- 22–25 → `$dz-fs-caption`(24)
- ≤21 → `$dz-fs-micro`(20)
- 字重：800/900 → `$dz-fw-bold`(700，仅价格/英雄)；650/700 标题 → `$dz-fw-semibold`(600)；500 → `$dz-fw-medium`；400 → `$dz-fw-regular`

### 颜色
- 深灰文字 #111b20/#121c21/#20272a/#394147 → `$dz-text-primary`
- 中灰 #6d767c/#707980/#7b848a/#7c878c/#858e94 → `$dz-text-secondary`
- 浅灰 #aeb5ba/#b3bdc1/#bbc4c7 → `$dz-text-tertiary`
- 近白灰面 #f8fafb/#fafafa/#f7f8f9/#f1f5f5/#f8fbfb/#f7fbfb → `$dz-surface-page`
- 边框灰 #dfe4e6/#edf0f1/#e3eaeb/#dfe7e8/#edf2f3 → `$dz-border-subtle`
- 青色系饱和值（#62d5ef/#42b8e8 等）→ `$dz-brand-primary`；深青文字 → `$dz-brand-deep`；浅青底（#f3fdfe/#f3fbfb/#e9fbfa/#effdfc/#ecfcfc/#defafa）→ `$dz-brand-soft`
- 橙色系：正文橙 → `$dz-price-primary`；深橙文字（#a34f25 类错误/警示文）→ `$dz-status-warning-deep`；浅橙底（#fff0e4/#fff3eb/#ffe9d7）→ `$dz-price-soft`
- 玻璃白 rgba(255,255,255,.88–.98) → `$dz-surface-glass`；遮罩 rgba(0,0,0,.4x)/rgba(23,33,38,.45) → `$dz-surface-dim`
- 装饰性多段渐变（卡片渐变底、图片占位渐变）的色标可保留字面值，但渐变主色若为蓝 → 换青色系等值

### 圆角
- 10–20rpx → `$dz-radius-sm`(16)；21–27 → `$dz-radius-md`(24)；28–40 → `$dz-radius-lg`(32)；胶囊按钮/标签 → `$dz-radius-full`；50% 保留

### 阴影
- 卡片 `0 x 24–40rpx rgba(31,65,72,.06–.1)` → `$dz-shadow-card`
- 吸顶头/小浮层 → `$dz-shadow-raised`；底部固定栏/弹层 → `$dz-shadow-floating`
- 青色光晕 rgba(8,174,180,x)/rgba(8,181,194,x) → `$dz-shadow-brand`
- 底部固定栏建议改用 `border-top: 1rpx solid $dz-border-subtle` 替代向上阴影（参照 booking.scss）

### 按压反馈（统一标准）
- 基础元素加：`transition: transform $dz-duration-fast $dz-ease-out, opacity $dz-duration-fast $dz-ease-standard;`
- hover-class 目标类改为：`transform: scale(0.97); opacity: 0.92;`（删除 box-shadow 过渡）
- 每处动效在文件尾部补 `@media (prefers-reduced-motion: reduce)` 降级（transition:none + pressed 只留 opacity:0.85）
- tabBar 等高频操作不加 transform 动画（保持现状的即时变色）

### 入场动效
- 首屏列表容器加全局类 `dz-anim-stagger`，列表项模板加 `dz-anim-fade-up`（参照首页 provider-rail/scene-grid）
- 仅首屏数据列表加；筛选/翻页重渲染的列表不加

### 空态/加载态
- 页面自绘的空态块 → 替换为 `DzEmptyState`（props: title/description/actionText，事件 @action）
- 首屏列表加载中的文字块 → 替换为 `DzSkeleton`（variant="rows"/"cards"）
- `NetworkState` 保留不动（14 页在用的行内加载/错误条）
- 错误色统一 `$dz-status-danger`（不是 price-primary）

### 底部弹层
- 页面自绘的 fixed 弹层（遮罩+面板）→ 替换为 `DzBottomSheet`：`<DzBottomSheet :visible="xxx" title="标题" @close="xxx = false">` 包住原面板内容；删除旧遮罩/面板/开关动画 CSS；显隐绑定与业务变量保持同名同逻辑

### 导航头
- 标准型「返回+标题」自绘头 → `DzNavBar`（transparent 场景用于英雄图上方）；头部含搜索/筛选等自定义内容的保留原结构、只做令牌化
- 替换后原页面若依赖头部占位，注意用 `fixed` prop（默认吸顶）或在内容区补占位，避免遮挡
