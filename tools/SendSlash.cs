using System;
using System.Runtime.InteropServices;
using System.Threading;

namespace AntigravitySlashTool
{
    internal static class Program
    {
        private const uint INPUT_KEYBOARD = 1;
        private const uint KEYEVENTF_KEYUP = 0x0002;
        private const uint KEYEVENTF_UNICODE = 0x0004;
        private const ushort VK_SHIFT = 0x10;
        private const ushort VK_RETURN = 0x0D;

        private const uint WM_IME_CONTROL = 0x0283;
        private const int IMC_GETOPENSTATUS = 0x0005;
        private const int IMC_SETOPENSTATUS = 0x0006;
        private const uint SMTO_ABORTIFHUNG = 0x0002;

        [StructLayout(LayoutKind.Sequential)]
        private struct INPUT
        {
            public uint type;
            public InputUnion U;
        }

        [StructLayout(LayoutKind.Explicit)]
        private struct InputUnion
        {
            [FieldOffset(0)] public MOUSEINPUT mi;
            [FieldOffset(0)] public KEYBDINPUT ki;
            [FieldOffset(0)] public HARDWAREINPUT hi;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct MOUSEINPUT
        {
            public int dx;
            public int dy;
            public uint mouseData;
            public uint dwFlags;
            public uint time;
            public IntPtr dwExtraInfo;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct KEYBDINPUT
        {
            public ushort wVk;
            public ushort wScan;
            public uint dwFlags;
            public uint time;
            public IntPtr dwExtraInfo;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct HARDWAREINPUT
        {
            public uint uMsg;
            public ushort wParamL;
            public ushort wParamH;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct GUITHREADINFO
        {
            public int cbSize;
            public uint flags;
            public IntPtr hwndActive;
            public IntPtr hwndFocus;
            public IntPtr hwndCapture;
            public IntPtr hwndMenuOwner;
            public IntPtr hwndMoveSize;
            public IntPtr hwndCaret;
            public RECT rcCaret;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct RECT
        {
            public int left, top, right, bottom;
        }

        [DllImport("user32.dll", SetLastError = true)]
        private static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

        [DllImport("user32.dll")]
        private static extern short VkKeyScanW(char ch);

        [DllImport("user32.dll")]
        private static extern uint MapVirtualKeyW(uint uCode, uint uMapType);

        [DllImport("user32.dll")]
        private static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll")]
        private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        [DllImport("user32.dll")]
        private static extern bool GetGUIThreadInfo(uint idThread, ref GUITHREADINFO lpgui);

        [DllImport("imm32.dll")]
        private static extern IntPtr ImmGetDefaultIMEWnd(IntPtr hWnd);

        [DllImport("user32.dll", CharSet = CharSet.Auto)]
        private static extern IntPtr SendMessageTimeout(
            IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam,
            uint fuFlags, uint uTimeout, out IntPtr lpdwResult);

        private static bool SendKeyWithScan(ushort vk, bool keyUp)
        {
            INPUT[] inputs = new INPUT[1];
            inputs[0].type = INPUT_KEYBOARD;
            inputs[0].U.ki.wVk = vk;
            inputs[0].U.ki.wScan = (ushort)MapVirtualKeyW(vk, 0);
            inputs[0].U.ki.dwFlags = keyUp ? KEYEVENTF_KEYUP : 0;

            return SendInput(1, inputs, Marshal.SizeOf(typeof(INPUT))) == 1;
        }

        private static bool SendUnicodeChar(char ch)
        {
            INPUT[] inputs = new INPUT[2];
            inputs[0].type = INPUT_KEYBOARD;
            inputs[0].U.ki.wVk = 0;
            inputs[0].U.ki.wScan = ch;
            inputs[0].U.ki.dwFlags = KEYEVENTF_UNICODE;

            inputs[1].type = INPUT_KEYBOARD;
            inputs[1].U.ki.wVk = 0;
            inputs[1].U.ki.wScan = ch;
            inputs[1].U.ki.dwFlags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP;

            return SendInput(2, inputs, Marshal.SizeOf(typeof(INPUT))) == 2;
        }

        private static bool SendChar(char ch)
        {
            short vkAndShift = VkKeyScanW(ch);
            if (vkAndShift == -1)
            {
                return SendUnicodeChar(ch);
            }

            ushort vk = (ushort)(vkAndShift & 0xFF);
            byte shiftState = (byte)((vkAndShift >> 8) & 0xFF);
            bool needShift = (shiftState & 1) != 0;

            if (needShift)
            {
                SendKeyWithScan(VK_SHIFT, false);
            }

            bool okDown = SendKeyWithScan(vk, false);
            bool okUp = SendKeyWithScan(vk, true);

            if (needShift)
            {
                SendKeyWithScan(VK_SHIFT, true);
            }

            return okDown && okUp;
        }

        private static IntPtr GetFocusedImeWindow()
        {
            IntPtr fg = GetForegroundWindow();
            if (fg == IntPtr.Zero) return IntPtr.Zero;

            uint pid;
            uint threadId = GetWindowThreadProcessId(fg, out pid);
            GUITHREADINFO info = new GUITHREADINFO();
            info.cbSize = Marshal.SizeOf(typeof(GUITHREADINFO));

            IntPtr target = fg;
            if (GetGUIThreadInfo(threadId, ref info) && info.hwndFocus != IntPtr.Zero)
            {
                target = info.hwndFocus;
            }
            return ImmGetDefaultIMEWnd(target);
        }

        [STAThread]
        private static int Main(string[] args)
        {
            if (args.Length == 0 || string.IsNullOrEmpty(args[0]))
            {
                return 1;
            }

            string text = args[0];
            bool pressEnter = args.Length >= 2 && string.Equals(args[1], "true", StringComparison.OrdinalIgnoreCase);

            // 带 50ms 超时保护地临时切换为英文输入状态，避免中文输入法干扰 '/' 与命令字母
            IntPtr imeWnd = GetFocusedImeWindow();
            IntPtr prevImeState = IntPtr.Zero;
            if (imeWnd != IntPtr.Zero)
            {
                IntPtr res;
                if (SendMessageTimeout(imeWnd, WM_IME_CONTROL, (IntPtr)IMC_GETOPENSTATUS, IntPtr.Zero, SMTO_ABORTIFHUNG, 50, out res) != IntPtr.Zero)
                {
                    prevImeState = res;
                    if (prevImeState != IntPtr.Zero)
                    {
                        IntPtr dummy;
                        SendMessageTimeout(imeWnd, WM_IME_CONTROL, (IntPtr)IMC_SETOPENSTATUS, IntPtr.Zero, SMTO_ABORTIFHUNG, 50, out dummy);
                        Thread.Sleep(20);
                    }
                }
            }

            try
            {
                for (int i = 0; i < text.Length; i++)
                {
                    if (!SendChar(text[i]))
                    {
                        return 2;
                    }
                    Thread.Sleep(i == 0 && text[0] == '/' ? 60 : 6);
                }

                if (pressEnter)
                {
                    // 等待原生列表渲染高亮第一项后按 Enter 确认，转化为图标 Chip
                    Thread.Sleep(320);
                    SendKeyWithScan(VK_RETURN, false);
                    SendKeyWithScan(VK_RETURN, true);
                }
            }
            finally
            {
                if (imeWnd != IntPtr.Zero && prevImeState != IntPtr.Zero)
                {
                    Thread.Sleep(30);
                    IntPtr dummy;
                    SendMessageTimeout(imeWnd, WM_IME_CONTROL, (IntPtr)IMC_SETOPENSTATUS, prevImeState, SMTO_ABORTIFHUNG, 50, out dummy);
                }
            }

            return 0;
        }
    }
}
