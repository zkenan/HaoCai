@echo off
chcp 65001
echo ================================
echo   安装系统依赖
echo ================================
echo.

echo [1/2] 正在安装后端依赖...
cd server
call npm install
if %errorlevel% neq 0 (
    echo 后端依赖安装失败！
    pause
    exit /b 1
)
cd ..

echo.
echo [2/2] 正在安装前端依赖...
cd client
call npm install
if %errorlevel% neq 0 (
    echo 前端依赖安装失败！
    pause
    exit /b 1
)
cd ..

echo.
echo ================================
echo   依赖安装完成！
echo ================================
echo.
echo 下一步操作：
echo 1. 在MySQL中执行 server/database.sql 初始化数据库
echo 2. 修改 server/config/database.json 配置数据库连接
echo 3. 运行 启动系统.bat 启动系统
echo.
pause
