import * as fs from 'fs';
import { SlashCommandItem } from '../types';

/**
 * 命令健康度与物理依赖校验引擎
 */
export class CommandHealthChecker {
  /**
   * 对命令列表执行全面体检，返回附加健康状态的更新列表
   */
  public check(commands: SlashCommandItem[]): {
    updated: SlashCommandItem[];
    healthyCount: number;
    brokenCount: number;
  } {
    let healthyCount = 0;
    let brokenCount = 0;

    const updated = commands.map(cmd => {
      // 1. 核心命令默认健康
      if (cmd.category === 'core') {
        healthyCount++;
        return {
          ...cmd,
          healthStatus: 'healthy' as const,
          healthReason: undefined
        };
      }

      // 2. 带有物理依赖路径的命令 (技能/规则)
      if (cmd.sourcePath) {
        if (!fs.existsSync(cmd.sourcePath)) {
          brokenCount++;
          return {
            ...cmd,
            healthStatus: 'broken' as const,
            healthReason: `物理源文件不存在或已被移除: ${cmd.sourcePath}`
          };
        } else {
          healthyCount++;
          return {
            ...cmd,
            healthStatus: 'healthy' as const,
            healthReason: undefined
          };
        }
      }

      // 3. 用户手动自定义命令校验 (语法规则校验)
      if (cmd.isCustom || cmd.category === 'custom') {
        const trimmed = cmd.command.trim();
        if (!trimmed.startsWith('/') || trimmed.length <= 1 || /\s/.test(trimmed)) {
          brokenCount++;
          return {
            ...cmd,
            healthStatus: 'broken' as const,
            healthReason: '命令语法非法: 必须以 / 开头且不能包含空格'
          };
        } else {
          healthyCount++;
          return {
            ...cmd,
            healthStatus: 'healthy' as const,
            healthReason: undefined
          };
        }
      }

      // 默认未知状态转正常
      healthyCount++;
      return {
        ...cmd,
        healthStatus: 'healthy' as const
      };
    });

    return { updated, healthyCount, brokenCount };
  }
}

