# 实施任务清单

> 由 spec.md 生成  
> 任务总数: 5  
> 核心原则: 先补环境探测（PATH / Git），再打通 OpenCode npm 插件，再补 OMP/Pi 列表与开关，最后补同等安装

## 依赖关系总览

Task 1（#28 CLI PATH）
Task 2（#29 Git xcrun 提示）  ← 可与 Task 1 并行
  ↓
Task 3（#15/#18 OpenCode npm 插件）
  ↓
Task 4（#30 OMP/Pi 插件列表与开关）
  ↓
Task 5（#30 续 Pi/OMP 插件安装）

## 变更影响概览

### 文件变更清单

| 文件 | 操作 | 涉及任务 | 说明 |
|------|------|---------|------|
| `src-tauri/src/library.rs` | 修改 | Task 1, 2 | 版本管理器路径、Git 错误增强 |
| `src-tauri/src/agent_skills_cli.rs` | 修改 | Task 1 | CLI 搜索路径与错误文案 |
| `src-tauri/src/mcp_manager.rs` | 修改 | Task 1 | 共用 Node 路径回退 |
| `src-tauri/src/plugin_manager.rs` | 修改 | Task 3, 4, 5 | npm 插件、OMP/Pi 扫描开关与安装 |
| `src/features/skills/state/skill-store.ts` | 修改 | Task 3, 4, 5 | 宿主与安装策略类型 |
| `src/features/skills/api/skill-client.ts` | 修改 | Task 3, 4, 5 | 归一化 |
| `src/app/routes/plugins.tsx` | 修改 | Task 4, 5 | Plugins 页 tab 与删除 |
| `src/features/install/components/PluginInstallPanel.tsx` | 修改 | Task 3, 4, 5 | 宿主选项 |
| `src/features/skills/components/ToolManageDialog.tsx` | 修改 | Task 4 | 可管理宿主 |

## 任务列表

### 任务 1: [x] #28 补齐 GUI 下 nvm/fnm 的 skills CLI 查找路径

- 文件: `src-tauri/src/library.rs`, `src-tauri/src/agent_skills_cli.rs`, `src-tauri/src/mcp_manager.rs`
- 依赖: 无
- spec 映射: 2, 3.1, 4.1
- 验收标准:
  - [x] 窄 PATH + `~/.nvm/versions/node/*/bin/npx` 时 CLI 删除可用
  - [x] 找不到 CLI 的错误提示提到 GUI PATH / nvm
  - [x] `cargo test` 相关用例通过

### 任务 2: [x] #29 Git/xcrun 环境检测与可执行提示

- 文件: `src-tauri/src/library.rs`
- 依赖: 无
- spec 映射: 2, 3.1, 4.3
- 验收标准:
  - [x] xcrun 错误文案包含 `xcode-select --install`
  - [x] 普通 git fatal 不被误判
  - [x] `cargo test` 相关用例通过

### 任务 3: [x] #15/#18 支持 OpenCode npm 插件

- 文件: `src-tauri/src/plugin_manager.rs`, 前端类型归一化
- 依赖: Task 2（克隆失败提示可复用）
- spec 映射: 2, 3.1, 4.2, 4.3
- 验收标准:
  - [x] 本地 `package.json`（含 opencode-plugin）探测为 opencode + `opencode-config-plugin`
  - [x] 安装写入 `plugin` 数组且扫描可见
  - [x] 可从数组启停
  - [x] 原 symlink OpenCode 插件回归通过

### 任务 4: [x] #30 Pi/OMP 插件列表与 lockfile 开关

- 文件: `plugin_manager.rs`, Plugins 页与宿主类型
- 依赖: Task 3（宿主类型扩展）
- spec 映射: 2, 3.1, 4.1, 4.3
- 验收标准:
  - [x] 临时 HOME 可列出 `~/.omp/plugins` 包
  - [x] 切换写入 `omp-plugins.lock.json` 的 `enabled`
  - [x] Plugins 页出现 OMP（Pi 在目录存在时出现）
  - Review decision recorded: 本批次命中 2 个大型信号（9 个生产文件、Git/CLI/Plugins 多模块），实现完成后执行 Code Review

### 任务 5: [x] #30 续 Pi/OMP 插件安装（对齐 Codex/OpenCode）

- 文件: `plugin_manager.rs`, `PluginInstallPanel.tsx`, 前端类型归一化, Plugins 页删除
- 依赖: Task 4
- spec 映射: 2, 3.1, 4.2, 4.3, 5
- 验收标准:
  - [x] 本地 `package.json`（含 `omp`/`pi`）探测为 omp/pi + `lockfile-plugin-link`
  - [x] 安装写入 `node_modules` 目录软链与 lockfile，扫描可见
  - [x] 可删除软链与 lockfile 条目
  - [x] 最后一个宿主删除后清理 `~/.skilldock/plugins` clone
  - [x] 官方 plugin.json 与 package.json `pi`/`omp` 并存时兼容宿主取并集
  - [x] 安装面板可选择 OMP/Pi 宿主

## Spec 覆盖映射

| Spec 章节 | 任务 |
|-----------|------|
| 2 目标 | Task 1-5 |
| 2.1 非目标 | Task 3, 4, 5 |
| 3.1 功能性需求 | Task 1-5 |
| 4 设计 | Task 3, 4, 5 |
| 5 测试 | Task 1-5 |
