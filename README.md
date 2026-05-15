# HK Intelligent Bistro（港式智能 Bistro）

面向 **香港茶餐厅 / Bistro** 场景的演示型智能点单应用：用户 **注册登录** 后浏览菜单、用 **AI Concierge（自然语言）** 辅助加购、在购物车中调整并进入 **模拟结账**。客户端为 **Expo（React Native + Web）**，服务端为 **Fastify + SQLite**，共享契约在 **`@hk/shared`**（Zod + 纯函数购物车逻辑）。

---

## 功能概览

| 模块 | 说明 |
|------|------|
| **认证** | 邮箱 + 密码注册 / 登录；JWT；Web 使用 `localStorage`，原生使用 `expo-secure-store`。 |
| **菜单** | 需登录后拉取 `GET /catalog`；分类、搜索、菜品详情与必选小料。 |
| **购物车** | 客户端与服务端共用 `applyCartActions`；支持撤销、清空、数量调整。 |
| **Concierge** | `POST /assistant/intent`：DeepSeek（OpenAI 兼容接口）返回结构化 `cart_actions`，服务端 **校验后再下发**；未配置 `DEEPSEEK_API_KEY` 时返回 **友好提示（HTTP 200）**，不抛 500。 |
| **结账** | 前端 **模拟支付**（卡号不落库）；用于演示完整动线。 |

应用内与种子菜单文案为 **英文**；Concierge 系统提示要求模型用 **英文** 回复。

---

## 仓库结构

```
apps/mobile/          # Expo Router 客户端（NativeWind、tabs、login/register、checkout）
apps/server/          # Fastify API（auth、catalog、assistant、SQLite）
packages/shared/      # Zod schemas、applyCartActions、formatCartActionSummary 等
scripts/smoke-e2e.mjs # 对「已启动 API」的 HTTP 冒烟（健康检查、注册、Bearer 菜单等）
docker-compose.yml    # 仅编排 API 镜像
Dockerfile              # 多阶段构建 @hk/shared + @hk/server
```

---

## 环境要求

- **Node.js** 20+（CI 使用 22）
- **pnpm** 9.x（见 `packageManager`）
- **Docker Desktop**（可选，用于本地跑容器化 API）
- 使用 **Concierge** 时需可用的 **DeepSeek API Key**（或其它兼容 OpenAI SDK 的端点）

---

## 快速开始（本地开发）

### 1. 安装依赖并构建 shared

```bash
pnpm install
pnpm --filter @hk/shared build
```

### 2. 配置环境变量

复制模板并编辑（**切勿将含真实密钥的 `.env` 提交到 Git**）：

```bash
cp .env.example .env
```

| 变量 | 说明 |
|------|------|
| **`JWT_SECRET`** | **必填**，至少 **16 字符**；用于签发 / 校验 JWT。未设置时 API 无法启动。 |
| **`DEEPSEEK_API_KEY`** | Concierge 调模型用；留空时 `/assistant/intent` 仍返回 **200** 与说明文案，购物车不会被误改。 |
| `DEEPSEEK_BASE_URL` | 默认 `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | 默认 `deepseek-chat` |
| `SERVER_PORT` | 本地/容器内监听端口，默认 `8787` |
| `API_PORT` | Docker 映射到主机的端口（见 `docker-compose.yml`），默认 `8787` |

### 3. 启动 API

```bash
pnpm dev:server
```

默认监听 **`http://127.0.0.1:8787`**（日志中也会打印 LAN 地址便于真机调试）。

### 4. 启动客户端（Expo）

```bash
pnpm dev:mobile
```

- **浏览器 Web**：在 Expo 终端按 `w` 或执行  
  `pnpm --filter @hk/mobile exec expo start --web`  
  建议设置 **`EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8787`**（与 `apps/mobile/app.config.ts` 中 `extra.apiBaseUrl` 一致）。
- **Android 模拟器**：默认 `getApiBaseUrl()` 使用 `http://10.0.2.2:8787` 指向宿主机 API。
- **真机**：请将 `EXPO_PUBLIC_API_BASE_URL` 设为你电脑的 **局域网 IP + 端口**。

### 5. Windows / Metro 说明

若在安装依赖的同时运行 Metro，可能出现监听异常；可尝试 **`expo start --web -c`** 清缓存。若出现 **`EBUSY`** 类文件监听错误，可先关闭杀毒对仓库目录的实时扫描，或设置 **`CHOKIDAR_USEPOLLING=1`** 后再启动。

---

## Docker（仅 API）

客户端建议仍在本地用 Expo 调试；**仅将 Fastify API 容器化**。

1. 在 **`docker-compose.yml` 同目录**（仓库根）准备好 **`.env`**，至少包含 **`JWT_SECRET`**（及按需的 `DEEPSEEK_API_KEY`）。
2. 构建并后台启动：

```bash
docker compose up --build -d
```

3. 健康检查：**`GET http://localhost:8787/health`** → `{"ok":true}`。  
4. 修改主机映射端口：`API_PORT=9888 docker compose up -d`。

数据目录通过卷挂载 **`./apps/server/data`**，便于保留 SQLite 与 `catalog.json`。

---

## 测试与质量

```bash
pnpm test              # @hk/shared + @hk/server 单元 / HTTP 测试
pnpm test:journey      # 仅跑「注册 → 登录 → 菜单 → Stub Concierge → applyCartActions」API 旅程测试
pnpm typecheck         # 构建 shared 后对 server + mobile 做 tsc
pnpm smoke:e2e         # 需已有运行中的 API（默认 http://127.0.0.1:8787）
```

- **`apps/server/src/user-journey.test.ts`**：在 **`assistantE2eStub`** 下走完整 HTTP 链路，**不调用外网 LLM**。
- **`scripts/smoke-e2e.mjs`**：对运行中 API 做冒烟；注册响应需包含 **`user`** 字段。

GitHub Actions（`.github/workflows/ci.yml`）在推送到 **`main`** 与 **`cursor/**`** 分支及 PR 上执行安装、构建 shared、测试与类型检查。

---

## API 摘要

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/health` | 存活探测 |
| `POST` | `/auth/register` | 注册，返回 `{ token, user }` |
| `POST` | `/auth/login` | 登录 |
| `GET` | `/auth/me` | Bearer 校验当前用户 |
| `GET` | `/catalog` | **需 Bearer**；读取 `apps/server/data/catalog.json` |
| `POST` | `/assistant/intent` | **需 Bearer**；Body 含 `userText`、`messages`、`cart`、`catalogVersion` |

---

## UI 与主题

- **NativeWind v4** + **Tailwind**；设计 token 见 `apps/mobile/src/theme/tokens.ts`。
- Web 端内容区最大宽度约 **960px**；菜品详情底部 Sheet 在宽屏约 **560px**。
- 依赖版本若与 Expo 插件提示不一致，可在 `apps/mobile` 下执行：  
  `pnpm exec expo install expo-image expo-linear-gradient` 对齐官方推荐版本。

---

## 路线图（非承诺）

语音输入、订单历史、更严格的支付对接、Playwright / Detox E2E、可选 Expo Web 静态导出镜像等。

---

## GitHub 仓库简介（可复制到仓库 About 描述）

> **Monorepo 智能 Bistro 点单演示：Expo（RN+Web）+ Fastify + SQLite，JWT 登录，DeepSeek Concierge 自然语言加购，共享 Zod 购物车逻辑；含 Docker API、Vitest 与冒烟脚本。**

（英文版可写为：*HK-style intelligent bistro demo: Expo client, Fastify API, JWT auth, DeepSeek-powered concierge with server-side cart validation, shared Zod contracts, Dockerized API, Vitest + smoke tests.*）

---

## 许可与贡献

本仓库在 `package.json` 中标记为 **private**；若后续开源请补充 LICENSE 与贡献指南。

如有问题或改进建议，欢迎通过 **GitHub Issues** 反馈。
