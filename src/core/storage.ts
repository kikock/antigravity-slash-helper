import * as vscode from 'vscode';
import { CommandScope, SlashCommandItem } from '../types';

/**
 * 推断命令所属作用域（兼容历史持久化数据）
 */
export function resolveCommandScope(item: Pick<SlashCommandItem, 'scope' | 'category'>): CommandScope {
  if (item.scope === 'global' || item.scope === 'workspace') {
    return item.scope;
  }
  return item.category === 'rule' ? 'workspace' : 'global';
}

/**
 * 斜杠命令持久化存储管理器
 * 将「全局命令集 (globalState)」与「当前项目命令集 (workspaceState)」物理隔离存储
 */
export class CommandStorage {
  private static readonly STORAGE_KEY = 'antigravity.slash.commands.v3';
  private static readonly WORKSPACE_STORAGE_KEY = 'antigravity.slash.workspaceCommands.v1';
  private static readonly LEGACY_KEY = 'antigravity.slash.commands.v2';

  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * 获取全局命令集 (Core / 全局 Skills / 全局 Custom)
   */
  public getGlobalCommands(): SlashCommandItem[] {
    const rawData = this.context.globalState.get<SlashCommandItem[]>(CommandStorage.STORAGE_KEY);
    if (Array.isArray(rawData) && rawData.length > 0) {
      return rawData
        .filter(cmd => resolveCommandScope(cmd) === 'global')
        .map(cmd => ({ ...cmd, scope: 'global' as const }));
    }

    // 从旧版迁移用户手动创建的自定义命令，其余由新版扫描器重新生成简短中文说明
    const legacyData = this.context.globalState.get<SlashCommandItem[]>(CommandStorage.LEGACY_KEY);
    if (Array.isArray(legacyData)) {
      return legacyData
        .filter(cmd => cmd.isCustom)
        .map(cmd => ({ ...cmd, scope: 'global' as const }));
    }
    return [];
  }

  /**
   * 获取当前项目命令集 (当前工作区 Skills / Rules / 项目 Custom)
   */
  public getWorkspaceCommands(): SlashCommandItem[] {
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
      return [];
    }
    const rawData = this.context.workspaceState.get<SlashCommandItem[]>(CommandStorage.WORKSPACE_STORAGE_KEY);
    if (Array.isArray(rawData) && rawData.length > 0) {
      return rawData.map(cmd => ({ ...cmd, scope: 'workspace' as const }));
    }
    return [];
  }

  /**
   * 获取合并后的全量命令列表（项目集优先，全局在后）
   */
  public getAllCommands(): SlashCommandItem[] {
    return [...this.getWorkspaceCommands(), ...this.getGlobalCommands()];
  }

  /**
   * 按作用域分流覆盖保存命令列表
   */
  public async saveAllCommands(commands: SlashCommandItem[]): Promise<void> {
    const globalList: SlashCommandItem[] = [];
    const workspaceList: SlashCommandItem[] = [];

    for (const cmd of commands) {
      const scope = resolveCommandScope(cmd);
      const normalized = { ...cmd, scope };
      if (scope === 'workspace') {
        workspaceList.push(normalized);
      } else {
        globalList.push(normalized);
      }
    }

    await Promise.all([
      this.context.globalState.update(CommandStorage.STORAGE_KEY, globalList),
      this.context.workspaceState.update(CommandStorage.WORKSPACE_STORAGE_KEY, workspaceList)
    ]);
  }

  /**
   * 添加或更新单条命令（根据 scope 存入全局或项目存储）
   */
  public async upsertCommand(item: SlashCommandItem): Promise<void> {
    const scope = resolveCommandScope(item);
    const normalized: SlashCommandItem = { ...item, scope, updatedAt: Date.now() };
    const list = scope === 'workspace' ? this.getWorkspaceCommands() : this.getGlobalCommands();

    const index = list.findIndex(cmd => cmd.id === normalized.id || cmd.command === normalized.command);
    if (index >= 0) {
      list[index] = { ...list[index], ...normalized, updatedAt: Date.now() };
    } else {
      list.push(normalized);
    }

    if (scope === 'workspace') {
      await this.context.workspaceState.update(CommandStorage.WORKSPACE_STORAGE_KEY, list);
    } else {
      await this.context.globalState.update(CommandStorage.STORAGE_KEY, list);
    }
  }

  /**
   * 批量更新或合并命令（按全局与项目作用域分别合并，互不覆盖）
   */
  public async mergeCommands(scannedCommands: SlashCommandItem[]): Promise<SlashCommandItem[]> {
    const mergedGlobal = this.mergeScopedList(
      this.getGlobalCommands(),
      scannedCommands.filter(cmd => resolveCommandScope(cmd) === 'global').map(cmd => ({ ...cmd, scope: 'global' as const }))
    );

    const mergedWorkspace = this.mergeScopedList(
      this.getWorkspaceCommands(),
      scannedCommands.filter(cmd => resolveCommandScope(cmd) === 'workspace').map(cmd => ({ ...cmd, scope: 'workspace' as const }))
    );

    await Promise.all([
      this.context.globalState.update(CommandStorage.STORAGE_KEY, mergedGlobal),
      this.context.workspaceState.update(CommandStorage.WORKSPACE_STORAGE_KEY, mergedWorkspace)
    ]);

    return [...mergedWorkspace, ...mergedGlobal];
  }

  /**
   * 单个作用域内的命令合并辅助方法
   */
  private mergeScopedList(existingList: SlashCommandItem[], incomingList: SlashCommandItem[]): SlashCommandItem[] {
    const commandMap = new Map<string, SlashCommandItem>();

    for (const cmd of existingList) {
      commandMap.set(cmd.command, cmd);
    }

    for (const cmd of incomingList) {
      const existing = commandMap.get(cmd.command);
      if (existing) {
        commandMap.set(cmd.command, {
          ...existing,
          id: existing.isCustom ? existing.id : cmd.id,
          title: existing.isCustom ? existing.title : cmd.title,
          description: existing.isCustom ? existing.description : cmd.description,
          sourcePath: cmd.sourcePath || existing.sourcePath,
          category: existing.isCustom ? existing.category : cmd.category,
          scope: cmd.scope ?? existing.scope,
          healthStatus: cmd.healthStatus,
          healthReason: cmd.healthReason,
          updatedAt: Date.now()
        });
      } else {
        commandMap.set(cmd.command, cmd);
      }
    }

    return Array.from(commandMap.values());
  }

  /**
   * 删除指定命令 (根据 id 或 command 字串；优先精确匹配 id，避免误删另一作用域同名命令)
   */
  public async removeCommand(idOrCommand: string): Promise<boolean> {
    const globalList = this.getGlobalCommands();
    const workspaceList = this.getWorkspaceCommands();

    const matchedByIdInGlobal = globalList.some(cmd => cmd.id === idOrCommand);
    const matchedByIdInWorkspace = workspaceList.some(cmd => cmd.id === idOrCommand);

    let nextGlobal = globalList;
    let nextWorkspace = workspaceList;

    if (matchedByIdInGlobal || matchedByIdInWorkspace) {
      nextGlobal = globalList.filter(cmd => cmd.id !== idOrCommand);
      nextWorkspace = workspaceList.filter(cmd => cmd.id !== idOrCommand);
    } else {
      nextGlobal = globalList.filter(cmd => cmd.command !== idOrCommand);
      nextWorkspace = workspaceList.filter(cmd => cmd.command !== idOrCommand);
    }

    const changed = nextGlobal.length !== globalList.length || nextWorkspace.length !== workspaceList.length;
    if (changed) {
      await Promise.all([
        this.context.globalState.update(CommandStorage.STORAGE_KEY, nextGlobal),
        this.context.workspaceState.update(CommandStorage.WORKSPACE_STORAGE_KEY, nextWorkspace)
      ]);
    }
    return changed;
  }

  /**
   * 清理所有失效 (broken) 状态的命令
   */
  public async removeBrokenCommands(): Promise<number> {
    const globalList = this.getGlobalCommands();
    const workspaceList = this.getWorkspaceCommands();

    const healthyGlobal = globalList.filter(cmd => cmd.healthStatus !== 'broken');
    const healthyWorkspace = workspaceList.filter(cmd => cmd.healthStatus !== 'broken');

    const removedCount =
      (globalList.length - healthyGlobal.length) +
      (workspaceList.length - healthyWorkspace.length);

    if (removedCount > 0) {
      await Promise.all([
        this.context.globalState.update(CommandStorage.STORAGE_KEY, healthyGlobal),
        this.context.workspaceState.update(CommandStorage.WORKSPACE_STORAGE_KEY, healthyWorkspace)
      ]);
    }
    return removedCount;
  }
}
