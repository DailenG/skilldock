# Feature: OpenCode npm 插件、Git 工具链提示、CLI PATH、OMP 插件列表

**作者**: Cursor Grok  
**日期**: 2026-09-18  
**状态**: Quick Draft  
**Issues**: #15 #18 #28 #29 #30

---

## 1. 背景 (Background)

SkillDock 1.0.20 上四条已确认缺口：

- OpenCode 只识别 `.opencode/plugins/*.{js,ts}` 符号链接，无法安装 `oh-my-opencode-slim` 这类把包名写入 `opencode.json` `plugin` 数组的 npm 插件。
- `discover_repo_skills` 在 macOS Command Line Tools 损坏时把 `xcrun` 原文抛成“仓库克隆失败”。
- Agent Skills CLI 兼容模式删除 Skill 时，GUI PATH 不含 nvm/fnm/volta/asdf。
- Pi / OMP 已有 Skills/MCP 适配，Plugins 页不列出 `~/.omp/plugins` 与 lockfile 启停状态。

## 2. 目标 (Goals)

- 粘贴 GitHub URL 可探测并安装 OpenCode npm 插件到 `plugin` 数组；已用 bunx 安装的包会出现在 Plugins 页并可启用/停用。
- Git 克隆因 xcrun / Command Line Tools 失败时给出 `xcode-select --install` 提示。
- GUI 下能通过 nvm/fnm/volta/asdf 找到 `skills` 或 `npx`。
- Plugins 页列出用户级 OMP（及存在磁盘时的 Pi）插件，并可用 lockfile 开关。
- 粘贴 GitHub URL 或本地目录可探测 Pi/OMP 插件，并像 Codex/OpenCode 一样安装到对应用户级目录。

### 2.1 非目标 (Non-Goals)

- 不运行 oh-my-opencode-slim 的交互式 TUI installer，不改 agent 模型预设。
- 不做 OMP marketplace、项目级 scope、XDG，不调用 `bun` / `omp plugin install`，不做升级。
- 不修 #27 白屏、#24/#25 更新镜像。

## 3. 需求细化 (Requirements)

### 3.1 功能性需求

- npm OpenCode 插件探测：`package.json` keywords 含 `opencode-plugin`，或依赖 `@opencode-ai/plugin` / `@opencode/plugin`。
- 安装：把 npm 包名写入现有 `opencode.json` / `opencode.jsonc` 的 `plugin` 数组；GitHub API 能识别时不强制 `git clone`。
- 扫描：现有 symlink 插件 + `plugin` 数组并存。
- 启停：配置型插件通过增删数组项；symlink 插件保持原逻辑。
- macOS Git 错误含 xcrun / invalid active developer path / Command Line Tools 时追加安装提示。
- CLI 搜索路径增加版本管理器 bin。
- 扫描 `~/.omp/plugins`：`package.json` dependencies ∪ lockfile；`enabled` 缺省为 true。
- Pi：仅当 `~/.pi/plugins` 存在时用同样模型扫描。
- Pi/OMP 探测：`package.json` 含非空 `omp` 或 `pi` 块；仅 `pi` 的包也可装到 OMP。官方 `plugin.json` 与 `pi`/`omp` 块并存时，兼容宿主取并集。
- Pi/OMP 安装：clone 到 SkillDock 托管目录，目录软链到 `~/.omp/plugins/node_modules/<pkg>` 或 `~/.pi/plugins/node_modules/<pkg>`，写入 lockfile `plugins[name]={version, enabled:true}`，并补 plugins `package.json` dependencies。
- Pi/OMP 删除：移除软链、lockfile 条目与 dependencies；若托管仓库已无其他宿主引用，再删除 `~/.skilldock/plugins` 中的 clone。

### 3.2 非功能性需求

- 不破坏现有 Claude/Cursor/Codex/OpenCode symlink 插件。
- JSONC 写回尽量保留注释。
- 探测失败仍走原 clone 路径。

## 4. 设计方案 (Design)

### 4.1 方案概览

- OpenCode 增加 `opencode-config-plugin` 安装策略，与 `opencode-plugin-link` 并存。
- Git 错误在 `run_git_clone_with_progress` 统一增强。
- Node 版本管理器路径收到 `library.rs`，CLI 与 MCP 共用。
- OMP 启停复用 Claude JSON map + Codex nested `enabled`，不复制 OpenCode symlink。

### 4.2 接口设计

- `PluginHostTool` 增加 `omp`、`pi`。
- `PluginInstallStrategy` 增加 `opencode-config-plugin`、`lockfile-plugin-link`。
- `set_plugin_enabled` / `install_plugin_probe_for_host` / `delete_plugin` 增加 `omp` / `pi`。
- 不新增 Tauri command。

### 4.3 核心逻辑

- 远程探测：GitHub contents 无 `.opencode/plugins` 时读取 `package.json`。
- npm 安装元数据：`~/.skilldock/opencode-npm/<slug>/`，`root_path` 指向该目录。
- OMP lockfile：`~/.omp/plugins/omp-plugins.lock.json` 的 `plugins[name].enabled`。
- Pi/OMP 安装策略 `lockfile-plugin-link`：需要本地文件才能软链，不走 `opencode-config-plugin` 那种免 clone 短路径。

## 5. 测试计划 (Test Plan)

- npm `package.json` 识别与本地探测。
- `plugin` 数组安装/扫描/启停。
- xcrun 错误文案。
- 窄 PATH 下 nvm 假 `npx` 可删除 CLI Skill。
- 临时 HOME 下 OMP lockfile 列表与开关。
- 本地 `package.json`（含 `omp`/`pi`）探测为 `lockfile-plugin-link`；临时 HOME 安装后扫描可见，删除后消失。

## 9. Changelog

| 日期 | 变更内容 | 作者 |
|------|----------|------|
| 2026-09-18 | Quick Draft，覆盖 #15 #18 #28 #29 #30 | Cursor Grok |
| 2026-09-21 | 增加 Pi/OMP 用户级插件安装（clone + 目录软链 + lockfile） | Cursor Grok |
| 2026-09-21 | Pi/OMP 删除在最后一个宿主卸载后清理 SkillDock 托管 clone | Cursor Grok |
| 2026-09-21 | 官方 plugin.json 与 package.json `pi`/`omp` 并存时合并兼容宿主 | Cursor Grok |
| 2026-09-21 | 混合仓库扫描：Pi/OMP 读取 package.json 简介与组件，官方 plugin.json 名称用于宿主聚合 | Cursor Grok |
| 2026-09-21 | Pi 安装同时写入 `~/.pi/agent/settings.json` 的 `packages`，运行时才能加载插件 skills/extensions | Cursor Grok |
| 2026-09-21 | 插件组件识别补 extensions（Pi hook）、package.json `pi`/`omp` 声明路径、官方 plugin.json / 更多 mcp 清单 | Cursor Grok |
