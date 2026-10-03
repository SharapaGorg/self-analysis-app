' Silently launches the Self-Analysis Dashboard in production mode on port 3010.
' Window style 0 = hidden (no console window flashes on boot).
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = "C:\Dev\Dev_2026\self-analysis-dashboard"
sh.Run """C:\Program Files\nodejs\node.exe"" ""C:\Dev\Dev_2026\self-analysis-dashboard\node_modules\next\dist\bin\next"" start -p 3010", 0, False
