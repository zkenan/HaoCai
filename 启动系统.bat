@echo off
chcp 65001 >nul
echo ========================================
echo   耗材出入库管理系统
echo ========================================
echo.
echo 正在启动系统...
echo.

start "" "耗材管理系统.exe"

echo.
echo 系统已启动！
echo.
echo 请在浏览器中访问：
echo   本地访问: http://localhost:3000
echo   局域网访问: http://[本机IP]:3000
echo.
echo 默认管理员账户：
echo   用户名: admin
echo   密码: 123456
echo.
echo 按任意键关闭此窗口...
pause >nul
