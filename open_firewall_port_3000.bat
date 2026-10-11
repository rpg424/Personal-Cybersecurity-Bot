@echo off
:: Shield Labs Bot - Windows Firewall Unlocker (Port 3000 + Node.js)
echo ========================================================
echo   Shield Labs Bot - Windows Defender Firewall Unlocker
echo ========================================================
echo.
echo [1/2] Adding inbound firewall rule for Port 3000...
netsh advfirewall firewall add rule name="Shield Labs Bot Port 3000" dir=in action=allow protocol=TCP localport=3000 profile=any

echo [2/2] Adding inbound firewall rule for Node runtime...
netsh advfirewall firewall add rule name="Shield Labs Bot Node Runtime" dir=in action=allow program="C:\Program Files\nodejs\node.exe" profile=any

echo.
if %errorlevel% equ 0 (
    echo ========================================================
    echo   [SUCCESS] Port 3000 is completely OPEN for LAN connections!
    echo ========================================================
    echo.
    echo Your second laptop can now connect in browser:
    echo http://192.168.29.240:3000
    echo http://192.168.29.240:3000/#join
    echo.
    echo Make sure both laptops are on the SAME Wi-Fi: Rajendra_5G 3
) else (
    echo ========================================================
    echo   [ERROR] Administrator elevation required!
    echo   Please RIGHT-CLICK this file and select:
    echo   "Run as administrator"
    echo ========================================================
)
echo.
pause
