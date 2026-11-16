import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { execFile } from 'child_process';

/**
 * 延迟等待工具函数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 调用无窗口 SendSlash.exe 发送真实虚拟按键序列
 */
function execSendSlash(exePath: string, text: string, pressEnter: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(exePath, [text, pressEnter ? 'true' : 'false'], { windowsHide: true }, error => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

export interface InjectOptions {
  /** 是否在键入命令触发原生 / 列表后自动按下回车，转化为高亮命令芯片 */
  selectAutocomplete?: boolean;
}

/**
 * Chat 输入框智能注入器
 */
export class ChatInputInjector {
  /**
   * 检查并弹出 Chat 面板，触发原生 / 补全列表并选中转为高亮命令芯片
   * @param commandText 完整的命令文本 (例如 '/plan')
   * @param options 注入选项
   */
  public static async inject(commandText: string, options: InjectOptions = {}): Promise<boolean> {
    if (typeof commandText !== 'string' || !commandText.trim()) {
      return false;
    }

    const cleanCmd = commandText.trim();
    const shouldAutoSelect = options.selectAutocomplete === true;
    const availableCommands = new Set(await vscode.commands.getCommands(true));

    // 1. 先检查并弹出/聚焦 Chat 输入框（antigravity.toggleChatFocus 会真正执行内部的 focusInput 把光标放入输入框）
    const focusCandidates = [
      'antigravity.toggleChatFocus',
      'antigravity.panel.focus',
      'workbench.action.chat.open',
      'workbench.action.chat.focusInput',
      'interactive.focus'
    ];

    let focused = false;
    for (const cmd of focusCandidates) {
      if (availableCommands.has(cmd)) {
        try {
          await vscode.commands.executeCommand(cmd);
          focused = true;
          break;
        } catch {
          // 继续尝试下一个候选命令
        }
      }
    }

    if (focused) {
      await delay(300);
    }

    // 2. 主通道 (Windows)：使用无控制台的 SendSlash.exe 真实模拟按键，触发原生 / 列表并选中
    const sendSlashExe = path.resolve(__dirname, '..', '..', 'bin', 'SendSlash.exe');
    let sendInputBlocked = false;
    if (process.platform === 'win32' && fs.existsSync(sendSlashExe)) {
      try {
        const textToType = shouldAutoSelect ? cleanCmd : `${cleanCmd} `;
        await execSendSlash(sendSlashExe, textToType, shouldAutoSelect);
        vscode.window.setStatusBarMessage(
          shouldAutoSelect ? `✅ 已触发并选中命令芯片: ${cleanCmd}` : `✅ 已写入命令: ${cleanCmd}`,
          3000
        );
        return true;
      } catch (err) {
        sendInputBlocked = true;
        console.warn('SendSlash.exe 键入被拦截或失败，切换原生 RPC 降级通道:', err);
      }
    }

    // 3. 降级通道 A：调用 Antigravity 原生 RPC antigravity.addContext 写入
    if (availableCommands.has('antigravity.addContext')) {
      try {
        await vscode.commands.executeCommand('antigravity.addContext', shouldAutoSelect ? cleanCmd : `${cleanCmd} `);
        if (availableCommands.has('antigravity.panel.focus')) {
          await vscode.commands.executeCommand('antigravity.panel.focus');
        }
        vscode.window.setStatusBarMessage(
          sendInputBlocked
            ? `⚠️ 系统拦截了模拟按键，已降级为文本写入: ${cleanCmd}`
            : `✅ 已写入 Chat 输入框: ${cleanCmd}`,
          5000
        );
        return true;
      } catch {
        // 继续走剪贴板兜底
      }
    }

    // 4. 降级通道 B：剪贴板粘贴兜底
    const formatted = `${cleanCmd} `;
    try {
      await vscode.env.clipboard.writeText(formatted);
      if (availableCommands.has('workbench.action.paste')) {
        await vscode.commands.executeCommand('workbench.action.paste');
      } else {
        await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
      }
      vscode.window.setStatusBarMessage(`✅ 已粘贴至输入框: ${formatted}`, 3000);
      return true;
    } catch {
      await vscode.env.clipboard.writeText(formatted);
      vscode.window.showInformationMessage(
        `命令 [${formatted}] 已复制到剪贴板，请按 Ctrl+V 粘贴到 Chat 输入框。`
      );
      return true;
    }
  }
}
