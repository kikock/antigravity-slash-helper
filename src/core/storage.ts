import * as vscode from 'vscode';
import { SlashCommandItem } from '../types';

/**
 * 斜杠命令持久化存储管理器
 */
export class CommandStorage {
  private static readonly STORAGE_KEY = 'antigravity.slash.commands.v3';
  private static readonly LEGACY_KEY = 'antigravity.slash.commands.v2';

  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * 获取所有已持久化保存的命令列表
   */
  public getAllCommands(): SlashCommandItem[] {
    const rawData = this.context.globalState.get<SlashCommandItem[]>(CommandStorage.STORAGE_KEY);
    if (Array.isArray(rawData) && rawData.length > 0) {
      return rawData;
    }
    // 从 v1 迁移用户手动创建的自定义命令，其余由新版扫描器重新生成简短中文说明
    const legacyData = this.context.globalState.get<SlashCommandItem[]>(CommandStorage.LEGACY_KEY);
    if (Array.isArray(legacyData)) {
      return legacyData.filter(cmd => cmd.isCustom);
    }
    return [];
  }

  /**
   * 覆盖保存全量命令列表
   */
  public async saveAllCommands(commands: SlashCommandItem[]): Promise<void> {
    await this.context.globalState.update(CommandStorage.STORAGE_KEY, commands);
  }

  /**
   * 添加或更新单条命令
   */
  public async upsertCommand(item: SlashCommandItem): Promise<void> {
    const current = this.getAllCommands();
    const index = current.findIndex(cmd => cmd.id === item.id || cmd.command === item.command);

    if (index >= 0) {
      current[index] = { ...current[index], ...item, updatedAt: Date.now() };
    } else {
      current.push({ ...item, updatedAt: Date.now() });
    }

    await this.saveAllCommands(current);
  }

  /**
   * 批量更新或合并命令
   */
  public async mergeCommands(scannedCommands: SlashCommandItem[]): Promise<SlashCommandItem[]> {
    const current = this.getAllCommands();
    const commandMap = new Map<string, SlashCommandItem>();

    // 先存已有命令
    for (const cmd of current) {
      commandMap.set(cmd.command, cmd);
    }

    // 合并新扫描命令
    for (const cmd of scannedCommands) {
      const existing = commandMap.get(cmd.command);
      if (existing) {
        // 保留用户的自定义属性或手动状态，但更新路径与描述
        commandMap.set(cmd.command, {
          ...existing,
          title: existing.isCustom ? existing.title : cmd.title,
          description: existing.isCustom ? existing.description : cmd.description,
          sourcePath: cmd.sourcePath || existing.sourcePath,
          category: existing.isCustom ? existing.category : cmd.category,
          updatedAt: Date.now()
        });
      } else {
        commandMap.set(cmd.command, cmd);
      }
    }

    const merged = Array.from(commandMap.values());
    await this.saveAllCommands(merged);
    return merged;
  }

  /**
   * 删除指定命令 (根据 id 或 command 字串)
   */
  public async removeCommand(idOrCommand: string): Promise<boolean> {
    const current = this.getAllCommands();
    const filtered = current.filter(cmd => cmd.id !== idOrCommand && cmd.command !== idOrCommand);
    if (filtered.length !== current.length) {
      await this.saveAllCommands(filtered);
      return true;
    }
    return false;
  }

  /**
   * 清理所有失效 (broken) 状态的命令
   */
  public async removeBrokenCommands(): Promise<number> {
    const current = this.getAllCommands();
    const healthyOnly = current.filter(cmd => cmd.healthStatus !== 'broken');
    const removedCount = current.length - healthyOnly.length;
    if (removedCount > 0) {
      await this.saveAllCommands(healthyOnly);
    }
    return removedCount;
  }
}

