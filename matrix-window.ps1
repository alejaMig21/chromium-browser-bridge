# Window helper of `node matrix.mjs --drive` (Windows only). Minimizes and restores a browser's main window WITHOUT
# activating anything and without any mouse or key input; restore puts the window back right behind the window that was
# in front when it was minimized, so the user's z-order and focus are left as found.
#   -Action minimize|restore   -Name <process name, e.g. vivaldi>   -Behind <hwnd that was in front, from minimize>
param([string]$Action, [string]$Name, [long]$Behind = 0)
Add-Type @'
using System; using System.Runtime.InteropServices;
public class MatrixWindow {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint flags);
}
'@
$w = Get-Process -Name $Name -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
if (-not $w) { '{"ok":false,"note":"no window of that browser was found"}'; exit }
$h = $w.MainWindowHandle
if ($Action -eq 'minimize') {
  $front = [MatrixWindow]::GetForegroundWindow()
  $was = [MatrixWindow]::IsIconic($h)       # already minimized by the user: it must be left that way
  [void][MatrixWindow]::ShowWindow($h, 7)   # SW_SHOWMINNOACTIVE
  '{{"ok":true,"behind":{0},"iconic":{1},"was":{2}}}' -f [long]$front, ([MatrixWindow]::IsIconic($h)).ToString().ToLower(), $was.ToString().ToLower()
} elseif ($Action -eq 'restore') {
  [void][MatrixWindow]::ShowWindow($h, 4)   # SW_SHOWNOACTIVATE
  if ($Behind -ne 0) { [void][MatrixWindow]::SetWindowPos($h, [IntPtr]$Behind, 0, 0, 0, 0, 0x13) }   # NOSIZE | NOMOVE | NOACTIVATE
  '{{"ok":true,"iconic":{0}}}' -f ([MatrixWindow]::IsIconic($h)).ToString().ToLower()
} else { '{"ok":false,"note":"unknown action"}' }
