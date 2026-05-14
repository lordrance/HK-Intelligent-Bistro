# HK Intelligent Bistro

Monorepo：Expo（React Native + Web）客户端 + Node（Fastify）后端 + 共享 Zod 契约（`@hk/shared`）。

## 本地运行

1. 复制环境变量模板并填写 **DeepSeek** 密钥（仅本地，勿提交）：

```bash
cp .env.example .env
```

2. 安装依赖并构建共享包：

```bash
pnpm install
pnpm --filter @hk/shared build
```

3. 启动 API（默认 `http://0.0.0.0:8787`）：

```bash
pnpm dev:server
```

4. 启动移动端（另开终端；真机请设置 `EXPO_PUBLIC_API_BASE_URL` 指向你电脑的局域网地址）：

```bash
pnpm dev:mobile
```

## 说明

- **AI**：`/assistant/intent` 使用 DeepSeek（OpenAI 兼容 `baseURL`）+ `json_object` 输出，再由服务端做 **动作校验**。
- **购物车**：客户端与后端共用 `applyCartActions`（`packages/shared`）。
- **UI**：当前阶段使用 **React Native + StyleSheet + 渐变** 实现高质感暗色餐吧风界面；原计划 Tamagui 2 RC 与当前 TypeScript 存在 `children`/`filter` 样式键冲突，故暂用 RN 原生组件以保证可维护构建；后续可换稳定版 Tamagui 或 NativeWind。

## 阶段规划（后续）

- 语音输入、订单历史、支付前校验、E2E 测试、Docker Compose 等。
