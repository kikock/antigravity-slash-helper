import * as vscode from 'vscode';
import { SlashCommandItem, CommandCategory } from '../types';
import { CommandStorage } from '../core/storage';

type TreeItemType = 'category' | 'command';

export class SlashTreeItem extends vscode.TreeItem {
  constructor(
    public readonly itemType: TreeItemType,
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly commandItem?: SlashCommandItem,
    public readonly category?: CommandCategory
  ) {
    super(label, collapsibleState);

    if (itemType === 'command' && commandItem) {
      this.description = commandItem.title;
      this.tooltip = new vscode.MarkdownString(
        `### ${commandItem.command} (${commandItem.title})\n\n` +
        `* **分类**: ${commandItem.category}\n` +
        `* **健康状态**: ${commandItem.healthStatus === 'healthy' ? '🟢 正常可用' : '🔴 依赖失效'}\n` +
        (commandItem.healthReason ? `* **异常原因**: ${commandItem.healthReason}\n` : '') +
        (commandItem.sourcePath ? `* **物理路径**: \`${commandItem.sourcePath}\`\n\n` : '\n') +
        `> ${commandItem.description}`
      );

      // 图标设定
      if (commandItem.healthStatus === 'broken') {
        this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'));
      } else if (commandItem.category === 'core') {
        this.iconPath = new vscode.ThemeIcon('star-full', new vscode.ThemeColor('charts.yellow'));
      } else if (commandItem.category === 'skill') {
        this.iconPath = new vscode.ThemeIcon('tools');
      } else if (commandItem.category === 'rule') {
        this.iconPath = new vscode.ThemeIcon('book');
      } else {
        this.iconPath = new vscode.ThemeIcon('edit');
      }

      this.contextValue = 'slashCommandItem';

      // 绑定行点击事件：通过时间窗口识别双击行为，双击后填入输入框
      this.command = {
        command: 'antigravity.slash.onItemClick',
        title: '双击填入输入框',
        arguments: [commandItem]
      };
    } else if (itemType === 'category') {
      this.contextValue = 'slashCategoryItem';
      this.iconPath = new vscode.ThemeIcon('folder');
    }
  }
}

/**
 * 侧边栏树形视图提供者
 */
export class CommandTreeProvider implements vscode.TreeDataProvider<SlashTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<SlashTreeItem | undefined | null | void> =
    new vscode.EventEmitter<SlashTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<SlashTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  constructor(private readonly storage: CommandStorage) {}

  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  public getTreeItem(element: SlashTreeItem): vscode.TreeItem {
    return element;
  }

  public getChildren(element?: SlashTreeItem): Thenable<SlashTreeItem[]> {
    const allCommands = this.storage.getAllCommands();

    // 根节点：按分类分组
    if (!element) {
      const categories: { label: string; cat: CommandCategory; icon: string }[] = [
        { label: '🌟 官方核心命令 (Core)', cat: 'core', icon: 'star-full' },
        { label: '🛠️ 全局与本地技能 (Skills)', cat: 'skill', icon: 'tools' },
        { label: '📜 规范与规则定义 (Rules)', cat: 'rule', icon: 'book' },
        { label: '✏️ 用户自定义命令 (Custom)', cat: 'custom', icon: 'edit' }
      ];

      const catItems = categories.map(c => {
        const count = allCommands.filter(cmd => cmd.category === c.cat).length;
        const item = new SlashTreeItem(
          'category',
          `${c.label} (${count})`,
          count > 0 ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed,
          undefined,
          c.cat
        );
        return item;
      });

      return Promise.resolve(catItems);
    }

    // 子节点：展开某分类下的命令列表
    if (element.itemType === 'category' && element.category) {
      const matched = allCommands.filter(cmd => cmd.category === element.category);
      const items = matched.map(cmd => {
        return new SlashTreeItem(
          'command',
          cmd.command,
          vscode.TreeItemCollapsibleState.None,
          cmd
        );
      });
      return Promise.resolve(items);
    }

    return Promise.resolve([]);
  }
}

