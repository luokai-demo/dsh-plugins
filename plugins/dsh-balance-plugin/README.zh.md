# dsh-balance-plugin

侧边栏底部的 DeepSeek 钱包余额——一个 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 插件。

[English](README.md) | 中文

在侧边栏底部（设置按钮旁）以**信用卡图标 + 金额**显示你的 DeepSeek 账户余额，并按剩余额度着色。在对话结束时、点击时与挂载时刷新——无轮询。

![截图占位：侧边栏底部显示绿色的 `💳 ¥12.34`](docs/screenshot.png)

## 功能

- **状态着色**：只有金额带颜色，图标保持中性——
  - ≥ `lowBalanceThreshold`（默认 **2**）：绿色
  - 大于零：黄色
  - 零或以下：红色
- **对话结束自动刷新**：宿主在任何对话轮次结束时推送 SSE `refresh` 事件——消耗随轮次结算。
- **点击刷新**；在途刷新去重（查询进行中时点击或轮次结束触发均为 no-op）。
- **失败静默**：凭证未配置或抓取失败时不渲染任何内容——读数仅供参考，绝不显示错误。
- **原始币种**：余额按提供方报告显示；不换算、不加总。

## 安装

需要一个 DeepSeek 账户凭证。插件通过 harness 凭证接缝（`~/.dsh/.credentials.yaml` 或环境变量）解析 `DEEPSEEK_API_KEY`，与官方 DeepSeek 适配器一致。

### 从 npm 安装（推荐）

```sh
dsh plugin --profile <名字> add dsh-balance-plugin
```

### 从 GitHub 安装

```sh
dsh plugin --profile <名字> add github:<你>/dsh-balance-plugin#<commit-sha>
```

Git 安装取到的是源码，pnpm ≥ 10 会拒绝安装时的构建，直到你允许：把 pnpm 打印的包键复制进 profile 的 `pnpm-workspace.yaml`：

```yaml
allowBuilds:
  dsh-balance-plugin: true
```

然后重跑 `add`。只安装你信任源码的包，并钉住 commit。

## 配置

插件带合理默认值；可通过 bundle 的插件行覆盖：

```yaml
# profile 的 cordis.patch.yml（或 home 级）
- id: balance
  name: dsh-balance-plugin
  config:
    apiKeyEnv: DEEPSEEK_API_KEY      # 凭证引用，随后回退环境变量
    baseURL: https://api.deepseek.com # 提供方基础 URL
    timeoutMs: 12000                 # 每次请求超时；中止映射为 balance-timeout
    lowBalanceThreshold: 2           # 读数视为健康的最低金额
```

## 工作原理

| 半面 | 做什么 |
|---|---|
| **宿主**（Node） | 注册 `GET /dsh-balance`（钱包读数 JSON）与 `GET /dsh-balance/events`（SSE 流）。监听 harness 的 `session/event` 广播，每个 `turn/end` 推送 `refresh` 事件。**每次请求**经 `ctx.credentials` 解析凭证并回退环境变量——改 key 无需重启。 |
| **客户端**（浏览器） | 注册 `sidebar.footer.action` 插槽条目（shell 预留的设置旁座位；收起 rail 时堆叠在设置图标上方）。在挂载时、`refresh` SSE 事件与点击时抓取读数，带 in-flight 守卫。信用卡图标自包含（不依赖 shell 的图标库）。 |

位置与交互遵循 shell 自身设计：`sidebar.footer.action` 是"设置旁可选操作"的官方扩展点。

## 常见问题

**对话刚结束余额看起来是旧的。** 提供方结算滞后于轮次数十秒。轮次结束的刷新可能短暂显示结算前金额；稍后点击显示结算后数值。这与官方 DeepSeek 客户端行为一致——读数仅供参考。

**什么都不显示。** 凭证未解析（`unconfigured`）或抓取失败——这是设计。用 `dsh --profile <名字> --dump-config` 检查插件行，确认 `DEEPSEEK_API_KEY` 能通过凭证接缝或环境变量解析。

**如何卸载？**

```sh
dsh plugin --profile <名字> remove dsh-balance-plugin
```

该命令同时移除依赖与层。

## 开发

```
src/
  balance-core.ts   # 纯查询逻辑（凭证解析、HTTP、归一化）
  index.ts          # 宿主插件：路由 + SSE + 轮次结束监听
  client.tsx        # 浏览器插件：侧边栏底部操作
scripts/build.mjs   # esbuild：宿主 ESM + 浏览器 __ModuleLoader__ bundle
tests/              # balance-core 的 node:test 单元测试
```

```sh
pnpm install
pnpm run build    # 生成 lib/index.js + lib/client.js
pnpm test         # balance-core 单元测试
```

本地安装检查（官方检验点）：

```sh
dsh plugin --profile demo add ./
dsh --profile demo --dump-config   # 应出现 "# == dsh-balance-plugin" 层
```

## 发布检查清单

发布新版本前：

1. `pnpm run build` 与 `pnpm test` 通过。
2. 上述本地安装检查通过（`--dump-config` 显示层；web profile 用真实凭证渲染读数）。
3. 版本已提升（`npm version patch/minor/major`）；git tag 对应。
4. `pnpm pack`——检查 tarball：必须包含 `lib/`、`cordis.patch.yml`、`README.md`（别无其他大文件）。
5. `npm publish`——发布预构建代码，用户零摩擦安装。
6. 推送 tag；GitHub release 说明与 npm 版本保持一致。

## 许可

[MIT](LICENSE)
