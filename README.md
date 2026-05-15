# HK Intelligent Bistro（港式智能 Bistro）

面向 **香港茶餐厅 / Bistro** 场景的 **演示型智能点单** 全栈应用：用户 **注册 / 登录** 后浏览菜单，通过 **AI Concierge（自然语言）** 辅助加购，在购物车中调整数量并进入 **模拟结账**（不落真实支付）。  
客户端为 **Expo（React Native + Web，Expo Router）**，服务端为 **Fastify + SQLite**，共享契约与购物车纯逻辑在 **`@hk/shared`**（Zod + `applyCartActions` 等）。

**应用内与种子菜单文案为英文**；Concierge 系统提示要求模型用 **英文** 回复。

---

## 目录

- [功能概览](#功能概览)
- [技术栈](#技术栈)
- [仓库结构](#仓库结构)
- [环境要求](#环境要求)
- [快速开始（本地开发）](#快速开始本地开发)
- [Docker（仅 API）](#docker仅-api)
- [环境变量参考](#环境变量参考)
- [测试与 CI](#测试与-ci)
- [API 摘要](#api-摘要)
- [移动端说明（Web / 模拟器 / 真机）](#移动端说明web--模拟器--真机)
- [UI 与主题](#ui-与主题)
- [常见问题（FAQ）](#常见问题faq)
- [路线图](#路线图非承诺)
- [GitHub 仓库简介（About 描述，可复制）](#github-仓库简介about-描述可复制)
- [许可与贡献](#许可与贡献)

---

## 功能概览

| 模块 | 说明 |
|------|------|
| **认证** | 邮箱 + 密码注册 / 登录；JWT；Web 使用 `localStorage`，原生使用 `expo-secure-store`；`GET /auth/me` 用于恢复会话。 |
| **菜单** | 需登录后 `GET /catalog`；分类、搜索、菜品详情与必选小料（`catalog.json`）。 |
| **购物车** | 客户端与服务端共用 **`applyCartActions`**；撤销、清空、数量调整；Concierge 返回的 `cart_actions` 在服务端 **`validateCartActions`** 后再下发。 |
| **Concierge** | `POST /assistant/intent`：通过 **OpenAI 兼容 SDK** 调用 **DeepSeek**（可换 `DEEPSEEK_BASE_URL`）；返回结构化 JSON；**未配置 `DEEPSEEK_API_KEY` 时返回 HTTP 200 与说明文案**，不抛 500、不改购物车。 |
| **结账** | 前端 **模拟支付**（卡号仅在本机表单中校验样式，不上传服务器）。 |

---

## 技术栈

| 层级 | 技术 |
|------|------|
| **客户端** | Expo 54、React 19、React Native、**Expo Router**、**NativeWind v4** + Tailwind、Zustand |
| **服务端** | Fastify 5、**better-sqlite3**（Node SQLite）、**jose**（JWT）、**bcryptjs**、Zod、OpenAI SDK（兼容 DeepSeek） |
| **共享包** | Zod schemas、`CartAction` 判别联合、`applyCartActions`、`formatCartActionSummary` |
| **容器** | Docker 多阶段构建；Compose 仅编排 **API** 服务 |
| **测试** | Vitest（`@hk/shared`、`@hk/server`）；Node 脚本 `scripts/smoke-e2e.mjs` 对运行中 API 冒烟 |

---

## 仓库结构

```
e:\rest\  （或克隆后的根目录）
├── apps/
│   ├── mobile/                 # Expo Router 应用
│   │   ├── app/                # 路由：login、register、(tabs)、dish/[id]、checkout、global.css
│   │   ├── src/
│   │   │   ├── components/   # UI 与背景组件
│   │   │   ├── lib/            # api、authFetch、scrollStyles、responsive、pricing 等
│   │   │   ├── store/          # authStore、bistroStore
│   │   │   └── theme/tokens.ts # 设计 token（与 tailwind 对齐）
│   │   ├── app.config.ts       # extra.apiBaseUrl ← EXPO_PUBLIC_API_BASE_URL
│   │   ├── metro.config.js     # NativeWind + monorepo node_modules
│   │   └── tailwind.config.ts
│   └── server/
│       ├── src/                # build-app、auth-routes、assistant、catalog、db…
│       ├── data/               # catalog.json、SQLite 默认路径挂载点（Docker 卷）
│       └── package.json        # dev: tsx watch；build: tsup
├── packages/shared/            # 契约与购物车纯函数
├── scripts/smoke-e2e.mjs       # 需已启动 API：健康检查、匿名 401、注册、Bearer 菜单、assistant 边界用例
├── docker-compose.yml          # api 服务 + 环境变量 + healthcheck
├── Dockerfile                  # 构建 @hk/shared + @hk/server 生产镜像
├── pnpm-workspace.yaml
└── package.json                # dev:server / dev:mobile / test / typecheck / smoke:e2e / test:journey
```

---

## 环境要求

- **Node.js** 20+（CI 使用 22）
- **pnpm** 9.x（与根目录 `packageManager` 字段一致）
- **Docker Desktop**（可选，用于本地容器化 API）
- 使用 **Concierge 真机推理** 时需可用的 **DeepSeek API Key**（或兼容 OpenAI Chat Completions 的其它服务）

---

## 快速开始（本地开发）

### 1. 安装依赖并构建 shared

```bash
pnpm install
pnpm --filter @hk/shared build
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 **`.env`**：**切勿**将含真实密钥的 `.env` 提交到 Git（已在 `.gitignore` 中忽略）。变量说明见下节 [环境变量参考](#环境变量参考)。

### 3. 启动 API

```bash
pnpm dev:server
```

默认 **`http://127.0.0.1:8787`**（日志中也会打印 LAN 地址，便于真机填 `EXPO_PUBLIC_API_BASE_URL`）。

### 4. 启动客户端（Expo）

```bash
pnpm dev:mobile
```

- **Web**：在终端按 `w`，或：

  ```bash
  cd apps/mobile
  set EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8787
  pnpm exec expo start --web
  ```

  （PowerShell 使用 `$env:EXPO_PUBLIC_API_BASE_URL="http://127.0.0.1:8787"`。）

- **Android 模拟器**：未设置 `EXPO_PUBLIC_API_BASE_URL` 时，代码默认 **`http://10.0.2.2:8787`** 指向宿主机。
- **真机**：将 `EXPO_PUBLIC_API_BASE_URL` 设为你的电脑 **局域网 IP + 端口**（与电脑防火墙放行一致）。

---

## Docker（仅 API）

客户端建议在本地用 **Expo** 调试；**仅将 Fastify API** 打进镜像并由 Compose 拉起。

1. 在 **`docker-compose.yml` 所在目录**（仓库根）放置 **`.env`**，至少包含 **`JWT_SECRET`**（≥16 字符）；需要 Concierge 时再填 **`DEEPSEEK_API_KEY`**。
2. 构建并后台启动：

   ```bash
   docker compose up --build -d
   ```

3. 健康检查：**`GET http://localhost:8787/health`** → `{"ok":true}`。
4. 修改映射到主机的端口：例如 **`API_PORT=9888 docker compose up -d`**（容器内仍为 `8787`）。

**数据**：`./apps/server/data` 挂载到容器内，便于保留 **SQLite** 与 **`catalog.json`**。

**修改代码后**：需 **`docker compose up --build -d`** 重新构建镜像后才会在容器内生效。

---

## 环境变量参考

| 变量 | 必填 | 说明 |
|------|------|------|
| **`JWT_SECRET`** | **是**（API 启动） | 至少 **16** 字符；签发与校验 JWT。Docker / 本地缺省会导致进程退出。 |
| **`DEEPSEEK_API_KEY`** | 否（Concierge） | 为空时 `/assistant/intent` 返回 **200** + 配置说明文案，`cart_actions` 为空。 |
| `DEEPSEEK_BASE_URL` | 否 | 默认 `https://api.deepseek.com` |
| `DEEPSEEK_MODEL` | 否 | 默认 `deepseek-chat` |
| `SERVER_PORT` | 否 | 进程监听端口，默认 `8787` |
| `API_PORT` | 否 | **仅 Compose**：主机映射端口，默认 `8787` |
| `JWT_EXPIRES_DAYS` | 否 | JWT 过期天数，服务端有上限裁剪 |
| `DATABASE_PATH` | 否 | SQLite 路径（见服务端 `db` 模块） |

---

## 测试与 CI

```bash
pnpm test              # @hk/shared + @hk/server（Vitest）
pnpm test:journey      # 仅跑 API 旅程：注册 → 登录 → catalog → stub assistant → applyCartActions（无外网 LLM）
pnpm typecheck         # 先 build shared，再对 server + mobile 执行 tsc --noEmit
pnpm smoke:e2e         # 需已有运行中的 API；默认 http://127.0.0.1:8787（可用 `SMOKE_API_BASE` 覆盖）
```

- **`apps/server/src/user-journey.test.ts`**：`buildApp({ assistantE2eStub: true })` 下走完整 HTTP，**不调真实模型**。
- **`apps/server/src/build-app.http.test.ts`**：含无 `DEEPSEEK_API_KEY` 时 assistant 仍 **200** 的回归。
- **`scripts/smoke-e2e.mjs`**：断言注册响应含 **`token` 与 `user`**。

GitHub Actions（`.github/workflows/ci.yml`）在推送到 **`main`**、**`cursor/**`** 等分支及 PR 上执行安装、构建 shared、测试与类型检查。

---

## API 摘要

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| `GET` | `/health` | 否 | 存活探测 |
| `POST` | `/auth/register` | 否 | 注册，返回 `{ token, user }` |
| `POST` | `/auth/login` | 否 | 登录 |
| `GET` | `/auth/me` | Bearer | 当前用户 |
| `GET` | `/catalog` | Bearer | 菜单 JSON（Zod 校验） |
| `POST` | `/assistant/intent` | Bearer | Body：`userText`、`messages`、`cart`、`catalogVersion`；与 `catalog.version` 不一致时先返回刷新提示 |

---

## 移动端说明（Web / 模拟器 / 真机）

| 场景 | API 地址建议 |
|------|----------------|
| **Expo Web（本机）** | `http://127.0.0.1:8787` 或 `http://localhost:8787` |
| **Android 模拟器** | 默认 `10.0.2.2:8787`（未设 `EXPO_PUBLIC_API_BASE_URL` 时） |
| **iOS 模拟器** | 通常 `http://127.0.0.1:8787` |
| **物理机** | `http://<电脑局域网IP>:8787` |

**pnpm + NativeWind**：`apps/mobile` 已声明 **`react-native-css-interop`**，避免 Web 打包找不到 `jsx-runtime`。若 Metro 报 **`EBUSY`**（Windows 监听），可先关闭对仓库目录的实时杀毒扫描，或设置 **`CHOKIDAR_USEPOLLING=1`** 后再 `expo start`。

**Expo 依赖版本提示**：若 CLI 提示 `expo-image` / `expo-linear-gradient` 与 SDK 不一致，可在 `apps/mobile` 执行：

```bash
pnpm exec expo install expo-image expo-linear-gradient
```

---

## UI 与主题

- **NativeWind v4** + Tailwind；颜色与圆角与 **`apps/mobile/src/theme/tokens.ts`**、**`tailwind.config.ts`** 对齐。
- **购物车**：结账主按钮为短文案 **「Checkout」**，窄屏内边距与 **`shell.pagePadding`** 一致；宽屏最大宽度约 **420px** 居中。
- **Concierge**：消息列表带水平内边距；气泡最大宽度在 Web 上按 **`innerWidth`** 与内边距计算，减少贴边与横向滚动条。

---

## 常见问题（FAQ）

**Q：Docker 容器一直重启 / 日志里 `JWT_SECRET is required`？**  
A：在仓库根 **`.env`** 中设置 **`JWT_SECRET`**（≥16 字符），再 **`docker compose up -d`**（必要时 `--force-recreate`）。

**Q：Concierge 提示未配置 API Key？**  
A：在 **`.env`** 中填写 **`DEEPSEEK_API_KEY`** 并重启 API；未配置时设计为 **不 500**，仅提示配置方式。

**Q：Web 白屏但标题有「Intelligent Bistro」？**  
A：多为 Metro **Web 打包失败**；看终端是否仍有 `react-native-css-interop` 解析错误；确认已 **`pnpm install`** 且 **`apps/mobile/package.json`** 含 **`react-native-css-interop`**。

**Q：`pnpm smoke:e2e` 失败？**  
A：先确保 API 已监听（本地 `pnpm dev:server` 或 Docker），且 **`JWT_SECRET`** 已设置。

---

## 路线图（非承诺）

语音输入、订单历史、真实支付对接、Playwright / Detox E2E、Expo Web 静态导出与一体化镜像等。

---

## GitHub 仓库简介（About 描述，可复制）

**中文（建议放在 GitHub 仓库 Description 或 About）：**

> Monorepo 港式智能 Bistro 点单演示：Expo（React Native + Web）+ Fastify + SQLite；JWT 注册登录；DeepSeek Concierge 自然语言加购，服务端校验购物车动作；共享 Zod 契约与纯函数购物车；Docker 编排 API；Vitest + HTTP 冒烟脚本。

**English:**

> HK-style intelligent bistro demo monorepo: Expo (React Native + Web) client, Fastify + SQLite API, JWT auth, DeepSeek-powered NL concierge with server-side cart validation, shared Zod contracts, Dockerized API, Vitest and smoke tests.

在 GitHub 网页：**Settings**（或仓库首页 **About** 右侧齿轮）→ **Description** 粘贴其一；Topics 可添加：`expo`、`react-native`、`fastify`、`sqlite`、`deepseek`、`monorepo`、`zod` 等。

若已安装 [GitHub CLI](https://cli.github.com/) 且已登录，可在仓库根执行（将 `OWNER/REPO` 换成你的路径，例如 `lordrance/HK-Intelligent-Bistro`）：

```bash
gh repo edit OWNER/REPO --description "Monorepo 港式智能 Bistro 点单演示：Expo + Fastify + SQLite，JWT，DeepSeek Concierge，Zod 共享契约，Docker API，Vitest。"
```

---

## 许可与贡献

本仓库在 `package.json` 中标记为 **private**；若后续开源请补充 **LICENSE** 与 **CONTRIBUTING.md**。

欢迎通过 **GitHub Issues** 反馈问题或改进建议；合并请求前请确保 **`pnpm test`** 与 **`pnpm typecheck`** 通过。

---

## 将当前代码推送到 `main`（本机网络正常时）

当前开发分支可能为 **`cursor/*`**。若远程已有 **`main`**，可先拉再合并；若希望 **`main` 与当前分支指向同一提交**：

```bash
git checkout cursor/vitest-order-flow-eb93   # 或你的开发分支
git pull origin cursor/vitest-order-flow-eb93 --rebase
git push origin HEAD:main
```

若远程尚无 **`main`**，上述 **`git push origin HEAD:main`** 会创建 **`main`** 并推送。

> **说明**：若自动化环境无法连接 `github.com:443`，需在您本机终端执行上述命令完成推送。
