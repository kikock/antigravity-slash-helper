import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as vscode from 'vscode';
import { SlashCommandItem, ScanOptions } from '../types';
import { summarizeSkillDescription } from './skillTranslator';

/**
 * 官方内置核心命令白名单定义
 */
export const CORE_SLASH_COMMANDS: Omit<SlashCommandItem, 'updatedAt'>[] = [
  {
    id: 'core:plan',
    command: '/plan',
    title: '架构前置规划 (Planning Mode)',
    description: '进入先规划后编码模式，输出需求拆解、架构推演方案及原子化任务清单',
    category: 'core',
    healthStatus: 'healthy'
  },
  {
    id: 'core:grill-me',
    command: '/grill-me',
    title: '反向需求对齐 (Interactive Interview)',
    description: '暂停直接编码，由 AI 扮演严苛系统审查员，针对边界、技术选型与吞吐进行递进式反向拷问',
    category: 'core',
    healthStatus: 'healthy'
  },
  {
    id: 'core:goal',
    command: '/goal',
    title: '目标驱动自愈 (Autonomous Run)',
    description: '开启长程自治闭环，遭遇构建或单测报错自动反思自愈，直至目标完全达成绝不停机',
    category: 'core',
    healthStatus: 'healthy'
  },
  {
    id: 'core:boost',
    command: '/boost',
    title: '深度思辨验证 (Deep Reasoning)',
    description: '激发底层深度推理算力，引入第一性原理分析与多视角对抗验证，用于疑难复杂研发',
    category: 'core',
    healthStatus: 'healthy'
  },
  {
    id: 'core:teamwork',
    command: '/teamwork',
    title: '虚拟团队对抗 (Multi-Agent Audit)',
    description: '并发模拟架构师、安全/SRE 工程师与测试 QA 角色，进行多视角交叉推演审查',
    category: 'core',
    healthStatus: 'healthy'
  },
  {
    id: 'core:learn',
    command: '/learn',
    title: '经验沉淀固化 (Rule Extraction)',
    description: '将本次排障踩坑经验、特定环境规避策略自动总结固化为本地 Skill 或 Rules 规则',
    category: 'core',
    healthStatus: 'healthy'
  },
  {
    id: 'core:compact',
    command: '/compact',
    title: '会话上下文紧缩 (Context Compaction)',
    description: '提取已确认决策与当前进度，精简对话历史释放 Context Window，防止模型退化',
    category: 'core',
    healthStatus: 'healthy'
  },
  {
    id: 'core:schedule',
    command: '/schedule',
    title: '定时任务调度 (Cron / Timer)',
    description: '创建一次性延时唤醒定时器或周期性 Cron 调度，后台自动触发巡检与报表生成',
    category: 'core',
    healthStatus: 'healthy'
  },
  {
    id: 'core:automation',
    command: '/automation',
    title: '自动化后台配置 (Background Automation)',
    description: '交互式向导配置后台周期性任务流程',
    category: 'core',
    healthStatus: 'healthy'
  },
  {
    id: 'core:browser',
    command: '/browser',
    title: '浏览器原生交互 (Browser DevTools)',
    description: '激活原生 Chrome WebView 浏览器智能体，执行点击、表单填报与视觉 UI 审查',
    category: 'core',
    healthStatus: 'healthy'
  },
  {
    id: 'core:help',
    command: '/help',
    title: '系统帮助手册 (System Help)',
    description: '查看当前 Antigravity 运行环境的所有可用命令与核心指南',
    category: 'core',
    healthStatus: 'healthy'
  },
  {
    id: 'core:clear',
    command: '/clear',
    title: '清空当前会话 (Clear Context)',
    description: '重置并清空当前的上下文对话历史',
    category: 'core',
    healthStatus: 'healthy'
  }
];

/**
 * 全局与本地多源命令扫描引擎
 */
export class CommandScanner {
  /**
   * 执行全源扫描并返回合并后的命令列表
   */
  public async scan(options: ScanOptions = {}): Promise<SlashCommandItem[]> {
    const results: SlashCommandItem[] = [];
    const now = Date.now();

    // 1. 扫描官方核心命令白名单
    if (options.includeCore !== false) {
      for (const coreCmd of CORE_SLASH_COMMANDS) {
        results.push({
          ...coreCmd,
          updatedAt: now
        });
      }
    }

    // 2. 扫描全量全局技能与已安装插件技能目录
    if (options.includeGlobalSkills !== false) {
      const home = os.homedir();
      const globalSkillRoots = [
        path.join(home, '.gemini', 'config', 'skills'),
        path.join(home, '.gemini', 'antigravity', 'skills'),
        path.join(home, '.gemini', 'antigravity-ide', 'skills'),
        path.join(home, '.gemini', 'skills'),
        path.join(home, '.gemini', 'antigravity', 'builtin', 'skills'),
        path.join(home, '.gemini', 'antigravity-ide', 'builtin', 'skills')
      ];

      // 动态发现各插件包内附带的 skills 目录
      const pluginRoots = [
        path.join(home, '.gemini', 'config', 'plugins'),
        path.join(home, '.gemini', 'antigravity-ide', 'plugins')
      ];
      for (const pRoot of pluginRoots) {
        if (fs.existsSync(pRoot)) {
          try {
            const plugins = await fs.promises.readdir(pRoot, { withFileTypes: true });
            for (const p of plugins) {
              if (p.isDirectory()) {
                globalSkillRoots.push(path.join(pRoot, p.name, 'skills'));
              }
            }
          } catch {
            // 忽略权限异常目录
          }
        }
      }

      for (const dir of globalSkillRoots) {
        const items = await this.scanSkillsDirectory(dir);
        results.push(...items);
      }
    }

    // 3. 扫描当前工作区 (.agents/skills, .agent/skills, GEMINI.md, rules.md)
    if (options.includeWorkspace !== false && vscode.workspace.workspaceFolders) {
      for (const folder of vscode.workspace.workspaceFolders) {
        const rootPath = folder.uri.fsPath;

        // 扫描工作区自定义技能
        const agentSkills = await this.scanSkillsDirectory(path.join(rootPath, '.agents', 'skills'));
        const dotAgentSkills = await this.scanSkillsDirectory(path.join(rootPath, '.agent', 'skills'));
        results.push(...agentSkills, ...dotAgentSkills);

        // 扫描工作区规则
        const rulesCommands = await this.scanWorkspaceRules(rootPath);
        results.push(...rulesCommands);
      }
    }

    // 4. 按命令字去重（先扫描到的高优先级项保留，工作区同名覆盖全局）
    const deduped = new Map<string, SlashCommandItem>();
    for (const item of results) {
      if (!deduped.has(item.command)) {
        deduped.set(item.command, item);
      }
    }

    return Array.from(deduped.values());
  }

  /**
   * 递归扫描指定 skills 目录并提取元数据
   */
  private async scanSkillsDirectory(skillsDir: string): Promise<SlashCommandItem[]> {
    const list: SlashCommandItem[] = [];
    if (!fs.existsSync(skillsDir)) {
      return list;
    }

    try {
      const entries = await fs.promises.readdir(skillsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) {
          continue;
        }

        const skillPath = path.join(skillsDir, entry.name, 'SKILL.md');
        if (fs.existsSync(skillPath)) {
          const meta = await this.parseSkillFrontmatter(skillPath, entry.name);
          const { shortTitle, fullDescription } = summarizeSkillDescription(meta.name, meta.description);
          list.push({
            id: `skill:${meta.name}`,
            command: `/${meta.name}`,
            title: shortTitle,
            description: fullDescription,
            category: 'skill',
            sourcePath: skillPath,
            healthStatus: 'healthy',
            updatedAt: Date.now()
          });
        }
      }
    } catch (err) {
      console.warn(`扫描技能目录失败: ${skillsDir}`, err);
    }

    return list;
  }

  /**
   * 解析 SKILL.md 中的 YAML Frontmatter（完整支持单行、引号及 | / > 多行块语法）
   */
  private async parseSkillFrontmatter(skillFile: string, fallbackName: string): Promise<{ name: string; description: string }> {
    try {
      const content = await fs.promises.readFile(skillFile, 'utf-8');
      const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (frontmatterMatch) {
        const yamlText = frontmatterMatch[1];
        let name = fallbackName;
        let description = '';

        const nameMatch = yamlText.match(/^name:\s*([^\r\n]+)/m);
        if (nameMatch) {
          name = nameMatch[1].trim().replace(/^['"]|['"]$/g, '');
        }

        // 支持 YAML 多行块 (|, >-, |-, >) 及常规单行字符串
        const lines = yamlText.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
          const descHeader = lines[i].match(/^description:\s*(.*)$/);
          if (descHeader) {
            const firstVal = descHeader[1].trim();
            if (/^[|>][+-]?$/.test(firstVal)) {
              const blockLines: string[] = [];
              for (let j = i + 1; j < lines.length; j++) {
                if (/^[a-zA-Z0-9_-]+:\s*/.test(lines[j])) {
                  break;
                }
                if (lines[j].trim()) {
                  blockLines.push(lines[j].trim());
                }
              }
              description = blockLines.join(' ');
            } else {
              description = firstVal.replace(/^['"]|['"]$/g, '');
            }
            break;
          }
        }

        return { name, description };
      }
    } catch {
      // 容错降级
    }

    return { name: fallbackName, description: '' };
  }

  /**
   * 扫描工作区特定规则文件
   */
  private async scanWorkspaceRules(rootPath: string): Promise<SlashCommandItem[]> {
    const list: SlashCommandItem[] = [];
    const targetFiles = [
      { filename: 'GEMINI.md', title: 'Gemini 项目核心规范' },
      { filename: 'AGENTS.md', title: 'Agents 智能体协作规范' },
      { filename: 'rules.md', title: '项目实施规则 (最高宪法)' }
    ];

    for (const item of targetFiles) {
      const filePath = path.join(rootPath, item.filename);
      if (fs.existsSync(filePath)) {
        list.push({
          id: `rule:${item.filename.toLowerCase()}`,
          command: `/${item.filename.replace(/\.md$/i, '').toLowerCase()}`,
          title: `[规则] ${item.title}`,
          description: `加载并遵循 ${item.filename} 项目级工程与行为约束规则`,
          category: 'rule',
          sourcePath: filePath,
          healthStatus: 'healthy',
          updatedAt: Date.now()
        });
      }
    }

    return list;
  }
}

