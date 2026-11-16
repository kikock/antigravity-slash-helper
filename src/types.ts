/**
 * Antigravity 斜杠命令助手 - 核心类型定义
 */

/**
 * 命令分类枚举
 * - core: 官方内置核心命令 (/plan, /grill-me, /goal, /boost 等)
 * - skill: 来源于技能库的命令 (根据 SKILL.md 注册)
 * - rule: 来源于规则文件的命令 (根据 GEMINI.md/rules.md 注册)
 * - custom: 用户手动新增的自定义命令
 */
export type CommandCategory = 'core' | 'skill' | 'rule' | 'custom';

/**
 * 命令物理依赖与健康度状态
 * - healthy: 健康可用 (文件存在且语法无误)
 * - broken: 失效不可用 (物理源文件已丢失或不存在)
 * - unknown: 未知状态 (尚未进行体检)
 */
export type HealthStatus = 'healthy' | 'broken' | 'unknown';

/**
 * 斜杠命令完整实体定义
 */
export interface SlashCommandItem {
  /** 唯一标识符，例如 'core:plan' 或 'skill:baoyu-diagram' */
  id: string;
  /** 完整命令字，必须以 / 开头，例如 '/plan' */
  command: string;
  /** 简明中文标题 */
  title: string;
  /** 详细功能描述，说明其运作机制与适用场景 */
  description: string;
  /** 命令所属分类 */
  category: CommandCategory;
  /** 物理文件依赖路径 (用于健康度真实性校验) */
  sourcePath?: string;
  /** 当前健康度状态 */
  healthStatus: HealthStatus;
  /** 异常失效原因描述 (仅在 broken 时生效) */
  healthReason?: string;
  /** 是否为用户在侧边栏手动新增 */
  isCustom?: boolean;
  /** 命令创建或扫描入库时间戳 */
  updatedAt: number;
}

/**
 * 扫描选项配置
 */
export interface ScanOptions {
  /** 是否扫描官方核心白名单命令 */
  includeCore?: boolean;
  /** 是否扫描全局技能目录 (~/.gemini/config/skills) */
  includeGlobalSkills?: boolean;
  /** 是否扫描当前工作区技能与规则 (.agents/skills, GEMINI.md) */
  includeWorkspace?: boolean;
}

