# 余额、充值与反馈控件修正（2026-09-29）

## 显示调整

- 关联订单使用独立选择框，统一字号、行高和右侧箭头；绑定当前选择索引，重新打开表单时回到默认选择。
- “立即充值”和充值页底部按钮用 flex 居中，避免 uni-app 默认按钮行高造成偏上；保留至少 44px 点击高度及键盘操作。
- 快捷选项显示到账面额 `单张面值 × 张数`，不显示折扣后的应付金额。保留横向滑动、折扣说明和张数提交方式。
- 调整加减按钮居中、禁用态可读性，以及添加图片按钮的内边距。

采用 apple-design 的字阶、对齐与最小触控区域原则，沿用已有导航和配色，不重新设计业务页面。

## “充值暂未开放”的诊断

基于本地代码，不代表已核验线上数据库配置或完成真实交易。

1. `dazzy_api/wallets/models.py`：`RechargeCampaign.is_enabled` 默认 `False`。
2. `dazzy_api/wallets/views.py`：登录后获取的充值配置直接返回该开关。
3. `src/pages/wallet/recharge.vue`：开关为 `False` 时按钮显示“充值暂未开放”。与支付通道缺配置时的错误提示不同。

后台入口：**财务管理 → 余额与充值 → 充值配置 → 开放充值 → 保存配置**。需要 `wallet.manage` 权限。修改仅影响新充值订单的规则快照。

微信内 H5 的充值链路已实现：创建充值单 → 公众号授权 → 汇付 JSAPI 支付会话 → 服务端查单 → 钱包入账。当前原生 App 充值页仍提示使用微信服务号；后端支持 `mobile_app` 场景不等于原生充值前端已接入。

支付诊断使用 huifu-pay-integration，范围为既有 Django/Python 聚合支付集成的配置排查。核对参考包括 `copilot-existing-system`、`copilot-go-live-checklist`、`copilot-troubleshooting-playbooks`；未新增或改动支付 API，不触发新接入生产代码的 hard-stop。

支付业务仍需同时满足充值开关、`HUIFU_PAYMENT_ENABLED`、商户/签名/回调配置、公众号授权及商户微信支付权限。实际网关检查见 `dazzy_api/orders/huifu.py` 的 `HuifuPaymentConfig.validate_for_payment`；充值会话调用见 `dazzy_api/wallets/services.py`。支付回跳不视为成功，服务端仍核对查单流水、商户与金额，以成功终态幂等入账。本次不打开业务开关、不修改密钥或通知地址、不进行真实支付或数据库迁移。

## 验证

- `npm run test:wallet-presentation`：金额随后台面值变化、阶梯计算、待支付单快照、禁用与边界、配置开关、关联订单选择与重置。
- `npm run test:payment-recovery`、`npm run test:lists`、`npm run type-check`。
- H5/App 构建使用示例 API 地址，不包含生产凭据。
- 本地浏览器模拟接口检查 320/390/430px：按钮居中、金额选项可滚动、禁用/开放文案、可配置面额；不提交充值或反馈，不访问线上接口。App 构建通过不代表原生支付联调通过。
