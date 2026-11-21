import * as vscode from 'vscode';
import { SlashCommandItem, CommandCategory, CommandScope } from '../types';
import { CommandStorage, resolveCommandScope } from '../core/storage';

type TreeItemType = 'scope' | 'category' | 'command';

export class SlashTreeItem extends vscode.TreeItem {
  constructor(
    public readonly itemType: TreeItemType,
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly commandItem?: SlashCommandItem,
    public readonly category?: CommandCategory,
    public readonly scope?: CommandScope
  ) {
    super(label, collapsibleState);

    if (itemType === 'command' && commandItem) {
      const cmdScope = resolveCommandScope(commandItem);
      const scopeLabel = cmdScope === 'workspace' ? '📁 当前项目 (Project)' : '🌐 全局 (Global)';

      this.description = commandItem.title;
      this.tooltip = new vscode.MarkdownString(
        `### ${commandItem.command} (${commandItem.title})\n\n` +
        `* **作用域**: ${scopeLabel}\n` +
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
        this.iconPath = new vscode.ThemeIcon(cmdScope === 'workspace' ? 'extensions' : 'tools');
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
    } else if (itemType === 'scope') {
      this.contextValue = 'slashScopeItem';
      this.iconPath = new vscode.ThemeIcon(scope === 'workspace' ? 'folder-library' : 'globe');
    } else if (itemType === 'category') {
      this.contextValue = 'slashCategoryItem';
      this.iconPath = new vscode.ThemeIcon('folder');
    }
  }
}

/**
 * 侧边栏树形视图提供者（按「项目命令集」与「全局命令集」两级分组展示）
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
    const workspaceCommands = this.storage.getWorkspaceCommands();
    const globalCommands = this.storage.getGlobalCommands();

    // 1. 根节点：将「项目命令集」与「全局命令集」彻底分开
    if (!element) {
      const workspaceNode = new SlashTreeItem(
        'scope',
        `📁 项目命令集 (Project) (${workspaceCommands.length})`,
        workspaceCommands.length > 0
          ? vscode.TreeItemCollapsibleState.Expanded
          : vscode.TreeItemCollapsibleState.Collapsed,
        undefined,
        undefined,
        'workspace'
      );

      const globalNode = new SlashTreeItem(
        'scope',
        `🌐 全局命令集 (Global) (${globalCommands.length})`,
        vscode.TreeItemCollapsibleState.Expanded,
        undefined,
        undefined,
        'global'
      );

      return Promise.resolve([workspaceNode, globalNode]);
    }

    // 2. 作用域节点：展开对应作用域下的子分类
    if (element.itemType === 'scope' && element.scope) {
      const scopedCommands = element.scope === 'workspace' ? workspaceCommands : globalCommands;
      const categories: { label: string; cat: CommandCategory }[] =
        element.scope === 'workspace'
          ? [
              { label: '🧩 项目技能 (Project Skills)', cat: 'skill' },
              { label: '📜 项目规则 (Project Rules)', cat: 'rule' },
              { label: '✏️ 项目自定义 (Project Custom)', cat: 'custom' }
            ]
          : [
              { label: '🌟 官方核心命令 (Core)', cat: 'core' },
              { label: '🛠️ 全局技能库 (Global Skills)', cat: 'skill' },
              { label: '✏️ 全局自定义命令 (Custom)', cat: 'custom' }
            ];

      const catItems = categories
        .map(c => {
          const count = scopedCommands.filter(cmd => cmd.category === c.cat).length;
          // 项目自定义为空时不展示冗余空分组
          if (element.scope === 'workspace' && c.cat === 'custom' && count === 0) {
            return null;
          }
          return new SlashTreeItem(
            'category',
            `${c.label} (${count})`,
            count > 0 ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed,
            undefined,
            c.cat,
            element.scope
          );
        })
        .filter((item): item is SlashTreeItem => item !== null);

      return Promise.resolve(catItems);
    }

    // 3. 分类节点：展开该作用域 + 分类下的具体命令列表
    if (element.itemType === 'category' && element.category && element.scope) {
      const scopedCommands = element.scope === 'workspace' ? workspaceCommands : globalCommands;
      const matched = scopedCommands.filter(cmd => cmd.category === element.category);
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
