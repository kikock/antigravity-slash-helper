# Antigravity Slash Helper (斜杠命令助手)

> 专为 **Google Antigravity IDE** 及 VS Code 体系打造的核心斜杠命令管理、全量中文提炼与智能快捷触发扩展。

---

## ✨ 核心特性

1. **⚡ 混合式斜杠命令选择菜单**
   - **快捷键呼出**：按下 `Alt + /`（macOS 为 `Cmd + /`）弹出 QuickPick 模糊搜索浮层，支持中英文关键词、命令名模糊检索。
   - **状态栏直达**：底部状态栏常驻 `⚡ /Commands` 快捷按钮。
   - **侧边栏管理中心**：活动栏独立视图，按 **官方核心命令 / 全局与本地技能 / 规范与规则 / 用户自定义** 四大分组清晰呈现。

2. **🎯 智能聚焦与原生命令芯片加载**
   - **防误触交互**：列表**单击**仅选中查看详情，**双击（400ms 内）**或点击右侧行内 **`💬 填入 Chat 输入框`** 按钮立即触发；**删除操作**隔离至右键菜单底部危险区并带二次确认，彻底杜绝手滑误删。
   - **原生芯片加载**：自动通过 `antigravity.toggleChatFocus` 唤醒并聚焦至 Chat 内部输入框，借助无窗口原生键入助手（`SendSlash.exe`，带 50ms 超时保护自动中英文输入法切换）真实触发原生 `/` 自动补全列表并自动点选加载为高亮结构化命令芯片（如 `[<>] xxx`）。
   - **多级容灾降级**：若系统策略或管理员权限拦截模拟按键，自动无感降级为 Antigravity 原生 RPC `antigravity.addContext` 写入或剪贴板兜底，并在状态栏给出透明提示。

3. **🔍 全量跨源自动扫描与 100% 精简中文说明**
   - **官方核心命令库**：内置 12 项核心命令（`/plan`, `/grill-me`, `/goal`, `/boost`, `/teamwork`, `/learn`, `/compact`, `/schedule`, `/automation`, `/browser`, `/help`, `/clear`）。
   - **全量全局与插件技能**：穿透扫描 `~/.gemini/config/skills/`、`~/.gemini/antigravity/skills/`、`~/.gemini/antigravity/builtin/skills/`、`~/.gemini/antigravity-ide/skills/` 以及各已安装插件 `plugins/*/skills/`，自动排除冷备归档避免失效污染。
   - **工作区配置**：自动扫描当前项目 `.agents/skills/`、`.agent/skills/` 以及 `GEMINI.md`、`AGENTS.md`、`rules.md`。
   - **智能中文摘要提炼**：内置高精度中文映射与英文语义提炼引擎（支持 YAML `|` / `>` 多行块解析），将数百项英文 Skill 描述自动提炼为 10~18 字的精简中文说明，右侧列表一目了然，悬停 Tooltip 保留完整详情。

4. **🩺 物理依赖健康度检测与一键清理**
   - 逐条校验命令绑定的物理源文件（`SKILL.md` / 规则文件）是否存在及语法是否合规。
   - 状态徽章直观标识（🟢 正常可用 / 🔴 依赖失效），支持**一键清理全部失效项**与**右键单项删除**。

---

## ⌨️ 快捷键与操作指南

| 操作 | 触发方式 | 说明 |
| :--- | :--- | :--- |
| **打开快捷命令浮层** | `Alt + /` (`Cmd + /`) 或点击状态栏 `⚡ /Commands` | 模糊搜索并直接触发写入 |
| **加入 Chat 输入框** | 侧边栏条目 **双击** 或悬停点击 **`💬`** 按钮 | 自动聚焦 Chat 并加载命令 |
| **查看完整功能说明** | 鼠标悬停在侧边栏命令条目上 | 展示中文摘要、原始描述与物理路径 |
| **全量重扫 / 清理 / 新增** | 侧边栏视图右上角工具栏按钮 | 一键同步最新全局技能、清理失效项或手动新增 |
| **删除单条命令** | 右键命令条目 → **删除此命令** | 二次弹窗确认后移除 |

> [!TIP]
> **关于 Windows 管理员权限提示**：如果您以“以管理员身份”运行 Antigravity IDE，Windows UIPI 安全机制可能会拦截子进程模拟按键（状态栏会提示降级为纯文本写入）。如需自动加载为 `[<>]` 图标芯片，建议取消 IDE 兼容性属性中的“以管理员身份运行此程序”，或将扩展目录下的 `bin/SendSlash.exe` 加入安全软件白名单。

---

## 🛠️ 构建、测试与安装

```powershell
# 1. 安装依赖
npm install

# 2. 编译 TypeScript
npm run compile

# 3. 运行全量自动化单元测试（核心白名单/健康体检/真实全局扫描/注入链路）
npm test

# 4. 打包为 VSIX 安装包
npx @vscode/vsce package --allow-missing-repository

# 5. 安装到 Antigravity IDE
antigravity --install-extension antigravity-slash-helper-1.0.0.vsix --force
```

---

## 📝 更新日志 (Changelog)

### v1.0.0 (2026-11-16)
* 🎉 初始正式版发布，完整适配 Google Antigravity IDE。
* ✨ 实现快捷键 `Alt + /` QuickPick 模糊搜索面板与侧边栏分类树形视图。
* ✨ 实现双击（400ms 识别）与行内 `💬` 按钮加入输入框，将删除操作隔离至右键菜单防误触。
* ✨ 打通 `antigravity.toggleChatFocus` 焦点落位与无窗口 `SendSlash.exe`（自动 IME 切换保护），支持原生 `/` 列表触发与结构化芯片加载，并集成 `antigravity.addContext` 容灾降级。
* ✨ 全面打通全局、内置及插件技能目录扫描（实测支持 440+ 项命令），实现 100% 精简中文说明提炼。
* ✅ 配备物理依赖健康度体检、失效标红与一键清理功能。
