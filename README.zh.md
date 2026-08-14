# dsh-plugins

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 社区插件集合。

这里的每个插件都是独立 bundle：可用 `dsh plugin add` 安装，独立发布到 npm，并可通过 [`dsh-plugin`](https://github.com/topics/dsh-plugin) topic 发现。每个插件位于 `plugins/` 下自己的目录，拥有独立的版本与发布周期。

## 插件列表

| 插件 | 功能 | 安装 |
|---|---|---|
| [dsh-balance-plugin](plugins/dsh-balance-plugin/README.zh.md) | 侧边栏底部的 DeepSeek 钱包余额：信用卡图标 + 状态着色金额，对话结束时刷新 | `dsh plugin --profile <名字> add dsh-balance-plugin` |

## 安装插件

```sh
dsh plugin --profile <名字> add <插件名>            # 从 npm（推荐）
# 或：从 Releases 页面下载 <插件名>-<版本>.tgz，然后
dsh plugin --profile <名字> add ./<插件名>-<版本>.tgz
```

每个插件的 README 里有它的凭证要求与配置说明。

## 开发插件

```
plugins/
  <插件名>/
    package.json       # dsh.bundle manifest + dsh.client（UI 插件）
    cordis.patch.yml   # 该 bundle 贡献的配置层
    src/               # 宿主半面（index.ts）+ 浏览器半面（client.tsx）
    scripts/build.mjs  # esbuild：宿主 ESM + 浏览器 __ModuleLoader__ bundle
    tests/             # node:test 单元测试（无测试框架）
    README.md          # 双语：功能、安装、配置、FAQ、发布清单
```

```sh
pnpm install          # workspace 级
pnpm run build        # 构建所有插件
pnpm test             # 测试所有插件
```

## 新增插件

1. 复制 `plugins/dsh-balance-plugin` 作为模板（`cp -R plugins/dsh-balance-plugin plugins/<插件名>`）。
2. 修改 `plugins/<插件名>/package.json`：`name`、`description`、`version`（从 `0.1.0` 起）、`repository`、`keywords`。保留 bundle manifest 形态（`dsh.bundle` + `cordis.patch.yml`）与 UI 插件的 `dsh.client` 块。
3. 编写宿主半面（`src/index.ts`）、浏览器半面（如有 `src/client.tsx`）与纯逻辑模块；可选服务遵循"每次请求时解析"模式。
4. 编写 `tests/`（node:test，无框架）与双语 README（功能、安装、配置、FAQ、发布清单）。
5. 发布前本地验证：

```sh
pnpm install
pnpm run build && pnpm test
dsh plugin --profile demo add ./plugins/<插件名>
dsh --profile demo --dump-config     # 应出现 "# == <插件名>" 层
```

6. 在上面的[插件列表](#插件列表)表格加一行。
7. 提交并推送。

## 发布插件

每个插件独立发布，拥有自己的版本与 release。两条渠道都支持（详见插件的 `PUBLISHING.md`）：

### 渠道 A：GitHub Release tarball（无需 npm 账号）

```sh
cd plugins/<插件名>
pnpm pack                                    # 生成 <插件名>-<版本>.tgz
cd ../..
gh release create v<版本> \
  --title "<插件名> <版本>" \
  --notes "..." \
  plugins/<插件名>/<插件名>-<版本>.tgz
git push --tags
```

用户从 Release 页面安装：

```sh
dsh plugin --profile <名字> add ./<插件名>-<版本>.tgz
```

### 渠道 B：npm（可选；需要 npm 账号）

```sh
cd plugins/<插件名>
pnpm run build && pnpm test
npm version <patch|minor|major>   # 同时 bump 版本并打 tag
pnpm pack                          # 检查 tarball（只应包含 lib/、cordis.patch.yml、README、LICENSE）
npm publish                        # 发布预构建代码——用户 `dsh plugin add <插件名>` 直接安装
git push && git push --tags
```

保持 npm 版本与 GitHub tag 同步。注意：由于插件位于子目录，`dsh plugin add github:<owner>/<repo>#<sha>` **无法指向子目录**——请使用渠道 A 或 B。

## 许可

[MIT](LICENSE)
