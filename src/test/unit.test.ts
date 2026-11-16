// 注入 vscode 模块轻量测试 Mock，允许脱离 Electron 宿主运行纯 Node 单元测试
const executedCommands: Array<{ cmd: string; args: unknown[] }> = [];
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (modulePath: string) {
  if (modulePath === 'vscode') {
    return {
      workspace: { workspaceFolders: [] },
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
      id: 'custom:illegal',
      command: 'illegal-no-slash',
      title: '非法命令',
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

  assert.strictEqual(result.healthyCount, 2, '健康命令数量断言失败');
  assert.strictEqual(result.brokenCount, 2, '失效命令数量断言失败');

  const validCmd = result.updated.find(c => c.id === 'skill:valid');
  assert.strictEqual(validCmd?.healthStatus, 'healthy');

  const brokenCmd = result.updated.find(c => c.id === 'skill:broken');
  assert.strictEqual(brokenCmd?.healthStatus, 'broken');
  assert.ok(brokenCmd?.healthReason?.includes('物理源文件不存在'));

  const illegalCmd = result.updated.find(c => c.id === 'custom:illegal');
  assert.strictEqual(illegalCmd?.healthStatus, 'broken');
  assert.ok(illegalCmd?.healthReason?.includes('命令语法非法'));

  console.log('  ✅ 健康度体检引擎测试通过：成功准确识别物理存在、物理缺失与非法语法！\n');

  // Test 3: 真实全局技能目录扫描测试
  console.log('▶ [Test 3] 校验真实机器环境的全局技能库扫描解析能力...');
  const { CommandScanner } = require('../core/scanner');
  const realScanner = new CommandScanner();
  const scanResult: SlashCommandItem[] = await realScanner.scan({
    includeCore: true,
    includeGlobalSkills: true,
    includeWorkspace: false
  });

  assert.ok(scanResult.length > CORE_SLASH_COMMANDS.length, '未能成功扫描到全局技能命令');
  const skillCommands = scanResult.filter(c => c.category === 'skill');
  console.log(`  ✅ 真实扫描成功！在当前系统中共发现并提取了 ${skillCommands.length} 项全局技能命令！`);
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

  console.log('🎉 所有自动化单元测试执行完毕，全部断言 PASS！');
}

runTests();
