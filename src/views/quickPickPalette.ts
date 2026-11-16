import * as vscode from 'vscode';
import { SlashCommandItem } from '../types';
import { ChatInputInjector } from '../core/injector';

interface CommandQuickPickItem extends vscode.QuickPickItem {
  commandItem: SlashCommandItem;
}

/**
 * QuickPick 斜杠命令快速搜索与选择面板
 */
export class QuickPickPalette {
  /**
   * 打开命令选择面板
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

    // 分类并构建 QuickPickItem
    const items: CommandQuickPickItem[] = commands.map(cmd => {
      let icon = '$(zap)';
      if (cmd.category === 'core') {
        icon = '$(star-full)';
      } else if (cmd.category === 'skill') {
        icon = '$(tools)';
      } else if (cmd.category === 'rule') {
        icon = '$(book)';
      } else if (cmd.category === 'custom') {
        icon = '$(edit)';
      }

      const statusBadge = cmd.healthStatus === 'broken' ? ' 🔴 [失效]' : '';

      return {
        label: `${icon} ${cmd.command}${statusBadge}`,
        description: cmd.title,
        detail: cmd.healthReason ? `⚠️ ${cmd.healthReason}` : cmd.description,
        commandItem: cmd
      };
    });

    quickPick.items = items;

    quickPick.onDidAccept(async () => {
      const selected = quickPick.selectedItems[0];
      if (selected) {
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
}

