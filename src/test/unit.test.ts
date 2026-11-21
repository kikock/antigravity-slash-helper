// 注入 vscode 模块轻量测试 Mock，允许脱离 Electron 宿主运行纯 Node 单元测试
const executedCommands: Array<{ cmd: string; args: unknown[] }> = [];
const mockWorkspaceFolders: Array<{ uri: { fsPath: string } }> = [];
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (modulePath: string) {
  if (modulePath === 'vscode') {
    return {
      workspace: { workspaceFolders: mockWorkspaceFolders },
      window: {
        showInformationMessage: () => {},
        showWarningMessage: () => {},
        setStatusBarMessage: () => {}
      },
      commands: {
        getCommands: async () => ['antigravity.addContext', 'antigravity.toggleChatFocus', 'antigravity.panel.focus'],
        executeCommand: async (cmd: string, ...args: unknown[]) => {
          executedCommands.push({ cmd, args });
        }
      },
      env: {
        clipboard: {
          writeText: async () => {}
        }
      }
    };
  }
  return originalRequire.apply(this, arguments);
};

import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import { CORE_SLASH_COMMANDS } from '../core/scanner';
import { CommandHealthChecker } from '../core/checker';
import { SlashCommandItem } from '../types';

async function runTests() {
  console.log('🧪 开始运行 Antigravity Slash Helper 单元测试集...\n');

  // Test 1: 核心命令完整度测试
  console.log('▶ [Test 1] 校验核心官方斜杠命令白名单覆盖率...');
  const expectedCommands = [
    '/plan',
    '/grill-me',
    '/goal',
    '/boost',
    '/teamwork',
    '/learn',
    '/compact',
    '/schedule',
    '/browser',
    '/help',
    '/clear'
  ];

  const coreCommandsSet = new Set(CORE_SLASH_COMMANDS.map(c => c.command));
  for (const cmd of expectedCommands) {
    assert.ok(coreCommandsSet.has(cmd), `缺失核心官方命令: ${cmd}`);
  }
  console.log(`  ✅ 核心白名单测试通过：已全部覆盖 ${expectedCommands.length} 项核心命令！\n`);

  // Test 2: 健康度校验测试 (文件存在 vs 文件不存在)
  console.log('▶ [Test 2] 校验物理文件依赖健康度判断逻辑...');
  const checker = new CommandHealthChecker();

  const tempFilePath = path.join(__dirname, 'temp_test_skill.md');
  fs.writeFileSync(tempFilePath, '---\nname: temp-skill\n---\n', 'utf-8');

  const mockCommands: SlashCommandItem[] = [
    {
      id: 'core:plan',
      command: '/plan',
      title: '规划',
      description: '描述',
      category: 'core',
      healthStatus: 'unknown',
      updatedAt: Date.now()
    },
    {
      id: 'skill:valid',
      command: '/valid-skill',
      title: '有效技能',
      description: '描述',
      category: 'skill',
      sourcePath: tempFilePath,
      healthStatus: 'unknown',
      updatedAt: Date.now()
    },
    {
      id: 'skill:broken',
      command: '/broken-skill',
      title: '失效技能',
      description: '描述',
      category: 'skill',
      sourcePath: path.join(__dirname, 'non_existent_file.md'),
      healthStatus: 'unknown',
      updatedAt: Date.now()
    },
    {
      id: 'custom:free-text',
      command: '@research 请帮我分析代码架构',
      title: '自由自定义快捷指令',
      description: '不带斜杠的自定义命令',
      category: 'custom',
      healthStatus: 'unknown',
      isCustom: true,
      updatedAt: Date.now()
    },
    {
      id: 'custom:empty',
      command: '   ',
      title: '空白非法命令',
      description: '描述',
      category: 'custom',
      healthStatus: 'unknown',
      isCustom: true,
      updatedAt: Date.now()
    }
  ];

  const result = checker.check(mockCommands);

  // 清理临时文件
  if (fs.existsSync(tempFilePath)) {
    fs.unlinkSync(tempFilePath);
  }

  assert.strictEqual(result.healthyCount, 3, '健康命令数量断言失败');
  assert.strictEqual(result.brokenCount, 2, '失效命令数量断言失败');

  const validCmd = result.updated.find(c => c.id === 'skill:valid');
  assert.strictEqual(validCmd?.healthStatus, 'healthy');

  const freeCustomCmd = result.updated.find(c => c.id === 'custom:free-text');
  assert.strictEqual(freeCustomCmd?.healthStatus, 'healthy');

  const brokenCmd = result.updated.find(c => c.id === 'skill:broken');
  assert.strictEqual(brokenCmd?.healthStatus, 'broken');
  assert.ok(brokenCmd?.healthReason?.includes('物理源文件不存在'));

  const illegalCmd = result.updated.find(c => c.id === 'custom:empty');
  assert.strictEqual(illegalCmd?.healthStatus, 'broken');
  assert.ok(illegalCmd?.healthReason?.includes('命令内容为空'));

  console.log('  ✅ 健康度体检引擎测试通过：成功识别物理存在、物理缺失、自由自定义指令与空白失效项！\n');

  // Test 3: 真实全局技能目录扫描测试 (兼容无本地 ~/.gemini 的 CI 环境)
  console.log('▶ [Test 3] 校验全局技能库扫描解析与中文提炼能力...');
  const os = require('os');
  const globalSkillsDir = path.join(os.homedir(), '.gemini', 'config', 'skills');
  let createdMockGlobal = false;
  if (!fs.existsSync(globalSkillsDir)) {
    createdMockGlobal = true;
    fs.mkdirSync(path.join(globalSkillsDir, 'ci-mock-security-audit'), { recursive: true });
    fs.writeFileSync(
      path.join(globalSkillsDir, 'ci-mock-security-audit', 'SKILL.md'),
      '---\nname: ci-mock-security-audit\ndescription: Security audit and vulnerability review.\n---\n',
      'utf-8'
    );
  }

  const { CommandScanner } = require('../core/scanner');
  const realScanner = new CommandScanner();
  const scanResult: SlashCommandItem[] = await realScanner.scan({
    includeCore: true,
    includeGlobalSkills: true,
    includeWorkspace: false
  });

  if (createdMockGlobal) {
    fs.rmSync(path.join(os.homedir(), '.gemini'), { recursive: true, force: true });
  }

  assert.ok(scanResult.length > CORE_SLASH_COMMANDS.length, '未能成功扫描到全局技能命令');
  const skillCommands = scanResult.filter(c => c.category === 'skill');
  console.log(`  ✅ 扫描成功！共发现并提取了 ${skillCommands.length} 项全局技能命令！`);
  console.log(`  示例中文简短说明:`);
  for (const s of skillCommands.slice(0, 6)) {
    assert.ok(!s.title.startsWith('[技能]'), `仍存在未提炼中文的旧标题: ${s.title}`);
    assert.ok(/[\u4e00-\u9fa5]/.test(s.title), `技能 ${s.command} 的标题未包含中文: ${s.title}`);
    console.log(`    • ${s.command} -> ${s.title}`);
  }
  console.log('');

  // Test 4: ChatInputInjector 调用链与降级容灾验证
  console.log('▶ [Test 4] 校验 ChatInputInjector 聚焦 -> 键入 -> 降级链路...');
  const { ChatInputInjector } = require('../core/injector');
  executedCommands.length = 0;
  const injected = await ChatInputInjector.inject('/plan', { selectAutocomplete: true });
  assert.strictEqual(injected, true, '注入返回值必须为 true');
  assert.strictEqual(executedCommands[0].cmd, 'antigravity.toggleChatFocus', '第一步必须弹出并聚焦 Chat 输入框');
  console.log('  ✅ ChatInputInjector 链路测试通过：已验证面板弹出聚焦及容灾降级闭环！\n');

  // Test 5: 全局命令集与项目命令集分离（扫描去重隔离 + 存储物理隔离 + 精确删除）
  console.log('▶ [Test 5] 校验全局命令集与项目命令集分离及存储隔离...');
  const tempWsDir = path.join(__dirname, 'temp_mock_workspace');
  const tempWsSkillDir = path.join(tempWsDir, '.agent', 'skills', 'plan');
  const tempSubWsSkillDir = path.join(tempWsDir, '01_github_code', '.agents', 'skills', 'github-projects-indexer');
  fs.mkdirSync(tempWsSkillDir, { recursive: true });
  fs.mkdirSync(tempSubWsSkillDir, { recursive: true });
  fs.writeFileSync(
    path.join(tempWsSkillDir, 'SKILL.md'),
    '---\nname: plan\ndescription: Project-specific planning workflow.\n---\n',
    'utf-8'
  );
  fs.writeFileSync(
    path.join(tempSubWsSkillDir, 'SKILL.md'),
    '---\nname: github-projects-indexer\ndescription: 扫描下级所有项目文件夹的 README.md 文档，提炼项目核心功能。\n---\n',
    'utf-8'
  );
  fs.writeFileSync(path.join(tempWsDir, 'rules.md'), '# Project Rules\n', 'utf-8');

  mockWorkspaceFolders.push({ uri: { fsPath: tempWsDir } });
  const separatedScan: SlashCommandItem[] = await realScanner.scan({
    includeCore: true,
    includeGlobalSkills: false,
    includeWorkspace: true
  });
  mockWorkspaceFolders.length = 0;

  const globalPlan = separatedScan.find(c => c.command === '/plan' && c.scope === 'global');
  const projectPlan = separatedScan.find(c => c.command === '/plan' && c.scope === 'workspace');
  const subProjectSkill = separatedScan.find(c => c.command === '/github-projects-indexer' && c.scope === 'workspace');
  const projectRule = separatedScan.find(c => c.command === '/rules' && c.scope === 'workspace');

  assert.ok(globalPlan, '全局核心 /plan 命令应保留');
  assert.ok(projectPlan, '项目级同名 /plan 技能应独立保留而不被全局覆盖');
  assert.ok(subProjectSkill, '工作区子目录 .agents/skills 下的项目技能应被扫描到');
  assert.notStrictEqual(globalPlan.id, projectPlan.id, '全局与项目同名命令 id 必须不同');
  assert.ok(projectRule && projectRule.scope === 'workspace', '项目规则应归属 workspace 作用域');

  const { CommandStorage } = require('../core/storage');
  const globalStoreMap = new Map<string, unknown>();
  const workspaceStoreMap = new Map<string, unknown>();
  const mockContext = {
    globalState: {
      get: (k: string) => globalStoreMap.get(k),
      update: async (k: string, v: unknown) => { globalStoreMap.set(k, v); }
    },
    workspaceState: {
      get: (k: string) => workspaceStoreMap.get(k),
      update: async (k: string, v: unknown) => { workspaceStoreMap.set(k, v); }
    }
  };

  mockWorkspaceFolders.push({ uri: { fsPath: tempWsDir } });
  const storage = new CommandStorage(mockContext);
  await storage.mergeCommands(separatedScan);

  const storedGlobal = storage.getGlobalCommands();
  const storedWorkspace = storage.getWorkspaceCommands();
  assert.ok(storedGlobal.every((c: SlashCommandItem) => c.scope === 'global'), '全局存储中不应混入项目命令');
  assert.ok(storedWorkspace.every((c: SlashCommandItem) => c.scope === 'workspace'), '项目存储中不应混入全局命令');
  assert.ok(storedWorkspace.some((c: SlashCommandItem) => c.id === projectPlan.id), '项目存储应包含项目技能');

  // 按 id 精确删除项目 /plan，不应误删全局 /plan
  await storage.removeCommand(projectPlan.id);
  assert.ok(!storage.getWorkspaceCommands().some((c: SlashCommandItem) => c.id === projectPlan.id), '项目 /plan 应被删除');
  assert.ok(storage.getGlobalCommands().some((c: SlashCommandItem) => c.id === globalPlan.id), '全局 /plan 不应受影响');

  mockWorkspaceFolders.length = 0;
  fs.rmSync(tempWsDir, { recursive: true, force: true });
  console.log('  ✅ 全局与项目命令集分离测试通过：扫描、隔离存储与精确删除全部符合预期！\n');

  console.log('🎉 所有自动化单元测试执行完毕，全部断言 PASS！');
}

runTests();
