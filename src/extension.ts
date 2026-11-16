import * as vscode from 'vscode';
import { CommandStorage } from './core/storage';
import { CommandScanner } from './core/scanner';
import { CommandHealthChecker } from './core/checker';
import { ChatInputInjector } from './core/injector';
import { QuickPickPalette } from './views/quickPickPalette';
import { CommandTreeProvider, SlashTreeItem } from './views/commandTreeProvider';
import { SlashCommandItem } from './types';

export async function activate(context: vscode.ExtensionContext) {
  const storage = new CommandStorage(context);
  const scanner = new CommandScanner();
  const checker = new CommandHealthChecker();
  const treeProvider = new CommandTreeProvider(storage);

  // 1. 注册侧边栏 TreeView
  const treeView = vscode.window.createTreeView('antigravity-slash-commands-view', {
    treeDataProvider: treeProvider,
    showCollapseAll: true
  });
  context.subscriptions.push(treeView);

  // 2. 注册底部状态栏快捷按钮
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'antigravity.slash.openPalette';
  statusBarItem.text = '$(zap) /Commands';
  statusBarItem.tooltip = '点击快速选择 Antigravity 斜杠命令 (快捷键: Alt+/)';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // 3. 注册命令: 打开快捷菜单
  const openPaletteCmd = vscode.commands.registerCommand('antigravity.slash.openPalette', async () => {
    let commands = storage.getAllCommands();
    if (commands.length === 0) {
      // 若为空，先自动静默扫描一次
      const scanned = await scanner.scan();
      const { updated } = checker.check(scanned);
      commands = await storage.mergeCommands(updated);
      treeProvider.refresh();
    }
    await QuickPickPalette.show(commands);
  });
  context.subscriptions.push(openPaletteCmd);

  // 4. 注册命令: 重新全量扫描
  const scanAllCmd = vscode.commands.registerCommand('antigravity.slash.scanAll', async () => {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Antigravity: 正在全量扫描全局与工作区斜杠命令...',
        cancellable: false
      },
      async progress => {
        progress.report({ increment: 20, message: '读取核心白名单与技能目录...' });
        const scanned = await scanner.scan();

        progress.report({ increment: 50, message: '校验物理依赖健康状态...' });
        const { updated, healthyCount, brokenCount } = checker.check(scanned);

        progress.report({ increment: 80, message: '合并入本地存储...' });
        await storage.mergeCommands(updated);
        treeProvider.refresh();

        vscode.window.showInformationMessage(
          `扫描完成！共发现 ${scanned.length} 项命令 (🟢 正常: ${healthyCount}, 🔴 失效: ${brokenCount})`
        );
      }
    );
  });
  context.subscriptions.push(scanAllCmd);

  // 5. 注册命令: 检查健康度
  const checkHealthCmd = vscode.commands.registerCommand('antigravity.slash.checkHealth', async () => {
    const current = storage.getAllCommands();
    const { updated, healthyCount, brokenCount } = checker.check(current);
    await storage.saveAllCommands(updated);
    treeProvider.refresh();

    if (brokenCount > 0) {
      const action = await vscode.window.showWarningMessage(
        `健康度体检完成：共 ${current.length} 项命令，发现 ${brokenCount} 项物理源已失效！`,
        '一键清理失效项',
        '稍后处理'
      );
      if (action === '一键清理失效项') {
        await vscode.commands.executeCommand('antigravity.slash.cleanInvalid');
      }
    } else {
      vscode.window.showInformationMessage(`健康度体检完成：全部 ${healthyCount} 项命令均健康可用 🟢`);
    }
  });
  context.subscriptions.push(checkHealthCmd);

  // 6. 注册命令: 一键清理失效命令
  const cleanInvalidCmd = vscode.commands.registerCommand('antigravity.slash.cleanInvalid', async () => {
    const removedCount = await storage.removeBrokenCommands();
    treeProvider.refresh();
    vscode.window.showInformationMessage(`已成功清理 ${removedCount} 项失效斜杠命令！`);
  });
  context.subscriptions.push(cleanInvalidCmd);

  // 7. 注册命令: 手动添加自定义命令（支持自由输入 /命令、@指令 或 常用快捷短语，不强制要求 / 开头）
  const addCustomCmd = vscode.commands.registerCommand('antigravity.slash.addCustom', async () => {
    const cmdInput = await vscode.window.showInputBox({
      prompt: '请输入自定义命令或快捷指令 (例如: /my-task 或 常用提示词，不强制 / 开头)',
      validateInput: text => {
        if (!text.trim()) {
          return '命令或快捷指令内容不能为空';
        }
        return null;
      }
    });

    if (!cmdInput) {
      return;
    }

    const trimmedCmd = cmdInput.trim();
    const defaultTitle = trimmedCmd.replace(/^\//, '').slice(0, 20);
    const titleInput = await vscode.window.showInputBox({
      prompt: '请输入命令简要中文标题 (例如: 我的自动化任务)',
      value: defaultTitle
    });

    const descInput = await vscode.window.showInputBox({
      prompt: '请输入该命令的详细描述或说明',
      value: '用户手动添加的自定义快捷命令'
    });

    const newCmd: SlashCommandItem = {
      id: `custom:${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      command: trimmedCmd,
      title: titleInput?.trim() || defaultTitle,
      description: descInput?.trim() || '',
      category: 'custom',
      healthStatus: 'healthy',
      isCustom: true,
      updatedAt: Date.now()
    };

    await storage.upsertCommand(newCmd);
    treeProvider.refresh();
    vscode.window.showInformationMessage(`已成功添加自定义命令: ${newCmd.command}`);
  });
  context.subscriptions.push(addCustomCmd);

  // 8. 注册命令: 删除单条命令
  const deleteCmd = vscode.commands.registerCommand('antigravity.slash.deleteCommand', async (item?: SlashTreeItem | SlashCommandItem) => {
    let targetCommand = resolveCommandText(item);

    if (!targetCommand) {
      const all = storage.getAllCommands();
      const picks = all.map(c => ({
        label: c.command,
        description: c.title,
        detail: c.description,
        cmdText: c.command
      }));
      const pick = await vscode.window.showQuickPick(picks, { placeHolder: '选择要删除的斜杠命令' });
      if (pick) {
        targetCommand = pick.cmdText;
      }
    }

    if (targetCommand) {
      const confirm = await vscode.window.showWarningMessage(
        `确定要从列表中删除命令 [${targetCommand}] 吗？`,
        { modal: true },
        '确认删除'
      );
      if (confirm === '确认删除') {
        await storage.removeCommand(targetCommand);
        treeProvider.refresh();
        vscode.window.showInformationMessage(`已删除命令: ${targetCommand}`);
      }
    }
  });
  context.subscriptions.push(deleteCmd);

  // 9. 注册命令: 填入 Chat 输入框 (显式按钮/菜单触发，立即生效)
  const insertCmd = vscode.commands.registerCommand('antigravity.slash.insertToChat', async (item?: SlashTreeItem | SlashCommandItem | string) => {
    const resolved = resolveSlashCommand(item, storage);
    if (resolved) {
      await ChatInputInjector.inject(resolved.command, { selectAutocomplete: resolved.selectAutocomplete });
    } else {
      await vscode.commands.executeCommand('antigravity.slash.openPalette');
    }
  });
  context.subscriptions.push(insertCmd);

  // 9.1 注册命令: 侧边栏行点击事件 (400ms 内双击同一条目即加入输入框)
  let lastClickCommand = '';
  let lastClickTime = 0;
  const DOUBLE_CLICK_THRESHOLD_MS = 400;

  const itemClickCmd = vscode.commands.registerCommand('antigravity.slash.onItemClick', async (item?: SlashTreeItem | SlashCommandItem | string) => {
    const resolved = resolveSlashCommand(item, storage);
    if (!resolved) {
      return;
    }

    const now = Date.now();
    if (resolved.command === lastClickCommand && now - lastClickTime <= DOUBLE_CLICK_THRESHOLD_MS) {
      // 命中双击，重置状态并立即键入填入输入框
      lastClickCommand = '';
      lastClickTime = 0;
      await ChatInputInjector.inject(resolved.command, { selectAutocomplete: resolved.selectAutocomplete });
    } else {
      // 单击仅选中，记录状态并在状态栏友好提示
      lastClickCommand = resolved.command;
      lastClickTime = now;
      vscode.window.setStatusBarMessage(`已选中 ${resolved.command}（双击条目或点击右侧 💬 图标即可加入输入框）`, 2500);
    }
  });
  context.subscriptions.push(itemClickCmd);

  // 10. 首次启动或升级后执行静默预扫（若尚无内置/扫描命令）
  const existing = storage.getAllCommands();
  if (existing.filter(c => !c.isCustom).length === 0) {
    scanner.scan().then(async scanned => {
      const { updated } = checker.check(scanned);
      await storage.mergeCommands(updated);
      treeProvider.refresh();
    });
  }
}

export function deactivate() {}

/**
 * 从不同调用来源（TreeItem / SlashCommandItem / 纯字符串）中安全提取斜杠命令文本
 */
function resolveCommandText(item?: unknown): string | undefined {
  if (typeof item === 'string') {
    return item;
  }
  if (item && typeof item === 'object') {
    const obj = item as Record<string, unknown>;
    if (obj.commandItem && typeof obj.commandItem === 'object') {
      const cmdItem = obj.commandItem as Record<string, unknown>;
      if (typeof cmdItem.command === 'string') {
        return cmdItem.command;
      }
    }
    if (typeof obj.command === 'string') {
      return obj.command;
    }
  }
  return undefined;
}

/**
 * 解析命令文本并判断是否为原生可自动补全为结构化 Chip 的命令 (core / skill)
 */
function resolveSlashCommand(
  item: unknown,
  storage: CommandStorage
): { command: string; selectAutocomplete: boolean } | undefined {
  const command = resolveCommandText(item);
  if (!command) {
    return undefined;
  }

  let category: string | undefined;
  if (item && typeof item === 'object') {
    const obj = item as Record<string, unknown>;
    if (obj.commandItem && typeof obj.commandItem === 'object') {
      category = (obj.commandItem as Record<string, unknown>).category as string | undefined;
    } else if (typeof obj.category === 'string') {
      category = obj.category;
    }
  }

  if (!category) {
    const found = storage.getAllCommands().find(c => c.command === command);
    category = found?.category;
  }

  const selectAutocomplete = category === 'core' || category === 'skill';
  return { command, selectAutocomplete };
}


