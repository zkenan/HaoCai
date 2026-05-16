@echo off
chcp 65001
echo ================================
echo   打包耗材管理系统
echo ================================
echo.

echo [1/4] 正在安装前端依赖...
cd client
call npm install
if %errorlevel% neq 0 (
    echo 前端依赖安装失败！
    pause
    exit /b 1
)
cd ..

echo.
echo [2/4] 正在打包前端...
cd client

REM 先清理并创建public目录
cd ..\server
if exist public rmdir /s /q public 2>nul
mkdir public
mkdir public\static
timeout /t 2 >nul

cd ..\client
call npm run build
if %errorlevel% neq 0 (
    echo 前端打包失败！
    pause
    exit /b 1
)
cd ..

echo.
echo [3/4] 正在安装后端依赖...
cd server
call npm install
if %errorlevel% neq 0 (
    echo 后端依赖安装失败！
    pause
    exit /b 1
)
cd ..

echo.
echo [4/4] 正在打包为exe文件...
cd server
call npm run build
if %errorlevel% neq 0 (
    echo exe打包失败！
    pause
    exit /b 1
)
cd ..

echo.
echo ================================
echo   打包完成！
echo ================================
echo.
echo 打包后的文件位置：
echo   耗材管理系统.exe (在项目根目录)
echo   database.json (在项目根目录)
echo.
echo 部署说明：
echo 1. 将 耗材管理系统.exe 和 database.json 复制到目标电脑
echo 2. 在目标电脑上修改 database.json 配置数据库连接
echo 3. 确保目标电脑已安装并启动MySQL数据库
echo 4. 在MySQL中执行 server/database.sql 创建数据库和表
echo 5. 双击 耗材管理系统.exe 启动系统
echo 6. 浏览器访问 http://localhost:3000
echo.
pause
