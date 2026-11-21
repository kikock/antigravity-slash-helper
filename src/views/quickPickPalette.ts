import * as vscode from 'vscode';
import { SlashCommandItem } from '../types';
import { ChatInputInjector } from '../core/injector';
import { resolveCommandScope } from '../core/storage';

interface CommandQuickPickItem extends vscode.QuickPickItem {
  commandItem?: SlashCommandItem;
}

/**
 * QuickPick 斜杠命令快速搜索与选择面板
 */
export class QuickPickPalette {
  /**
   * 打开命令选择面板（按「项目命令集」与「全局命令集」分组呈现）
   */
  public static async show(commands: SlashCommandItem[]): Promise<void> {
    if (commands.length === 0) {
      vscode.window.showWarningMessage('当前无可用斜杠命令，请先在侧边栏执行“重新扫描”。');
      return;
    }

    const quickPick = vscode.window.createQuickPick<CommandQuickPickItem>();
    quickPick.placeholder = '输入命令名、关键词或拼音模糊搜索 (例如: plan, grill, 团队, 目标)...';
    quickPick.matchOnDescription = true;
    quickPick.matchOnDetail = true;

    const workspaceCommands = commands.filter(cmd => resolveCommandScope(cmd) === 'workspace');
    const globalCommands = commands.filter(cmd => resolveCommandScope(cmd) === 'global');

    const items: CommandQuickPickItem[] = [];

    if (workspaceCommands.length > 0) {
      items.push({
        label: `📁 项目命令集 (${workspaceCommands.length})`,
        kind: vscode.QuickPickItemKind.Separator
      });
      items.push(...workspaceCommands.map(cmd => QuickPickPalette.toQuickPickItem(cmd)));
    }

    if (globalCommands.length > 0) {
      items.push({
        label: `🌐 全局命令集 (${globalCommands.length})`,
        kind: vscode.QuickPickItemKind.Separator
      });
      items.push(...globalCommands.map(cmd => QuickPickPalette.toQuickPickItem(cmd)));
    }

    quickPick.items = items;

    quickPick.onDidAccept(async () => {
      const selected = quickPick.selectedItems[0];
      if (selected && selected.commandItem) {
        quickPick.hide();
        const cmd = selected.commandItem;
        const selectAutocomplete = cmd.category === 'core' || cmd.category === 'skill';
        await ChatInputInjector.inject(cmd.command, { selectAutocomplete });
      }
    });

    quickPick.onDidHide(() => {
      quickPick.dispose();
    });

    quickPick.show();
  }

  private static toQuickPickItem(cmd: SlashCommandItem): CommandQuickPickItem {
    const scope = resolveCommandScope(cmd);
    let icon = '$(zap)';
    if (cmd.category === 'core') {
      icon = '$(star-full)';
    } else if (cmd.category === 'skill') {
      icon = scope === 'workspace' ? '$(extensions)' : '$(tools)';
    } else if (cmd.category === 'rule') {
      icon = '$(book)';
    } else if (cmd.category === 'custom') {
      icon = '$(edit)';
    }

    const statusBadge = cmd.healthStatus === 'broken' ? ' 🔴 [失效]' : '';
    const scopeTag = scope === 'workspace' ? '[项目]' : '[全局]';

    return {
      label: `${icon} ${cmd.command}${statusBadge}`,
      description: `${scopeTag} ${cmd.title}`,
      detail: cmd.healthReason ? `⚠️ ${cmd.healthReason}` : cmd.description,
      commandItem: cmd
    };
  }
}
