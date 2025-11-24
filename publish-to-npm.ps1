# NPM 发布脚本

param(
    [string]$VersionType = "patch"  # patch, minor, major
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "发布到 npm" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$packagePath = "packages/mcp-server"

# 1. 运行发布前检查
Write-Host "1. 运行发布前检查..." -ForegroundColor Yellow
.\prepare-npm-publish.ps1

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ 发布前检查失败，请修复后再试" -ForegroundColor Red
    exit 1
}

# 2. 确认发布
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "准备发布" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Push-Location $packagePath
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
$currentVersion = $packageJson.version
Pop-Location

Write-Host "当前版本: $currentVersion" -ForegroundColor Cyan
Write-Host "版本类型: $VersionType" -ForegroundColor Cyan
Write-Host ""
Write-Host "是否继续发布? [y/N]: " -ForegroundColor Yellow -NoNewline
$confirm = Read-Host

if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host ""
    Write-Host "已取消发布" -ForegroundColor Yellow
    exit 0
}

Write-Host ""

# 3. 更新版本号
Write-Host "2. 更新版本号..." -ForegroundColor Yellow
Push-Location $packagePath

if ($VersionType -ne "none") {
    npm version $VersionType --no-git-tag-version
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ❌ 版本号更新失败" -ForegroundColor Red
        Pop-Location
        exit 1
    }
    
    $packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
    $newVersion = $packageJson.version
    Write-Host "   ✅ 版本号已更新: $currentVersion -> $newVersion" -ForegroundColor Green
} else {
    Write-Host "   ⚪ 跳过版本号更新" -ForegroundColor Gray
    $newVersion = $currentVersion
}

Pop-Location
Write-Host ""

# 4. 清理并重新编译
Write-Host "3. 清理并重新编译..." -ForegroundColor Yellow
Push-Location $packagePath

npm run clean
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ 编译失败" -ForegroundColor Red
    Pop-Location
    exit 1
}

Write-Host "   ✅ 编译成功" -ForegroundColor Green
Pop-Location
Write-Host ""

# 5. 发布到 npm
Write-Host "4. 发布到 npm..." -ForegroundColor Yellow
Push-Location $packagePath

npm publish --access public

if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ 发布失败" -ForegroundColor Red
    Pop-Location
    exit 1
}

Write-Host "   ✅ 发布成功！" -ForegroundColor Green
Pop-Location
Write-Host ""

# 6. 提交版本更新
if ($VersionType -ne "none") {
    Write-Host "5. 提交版本更新到 Git..." -ForegroundColor Yellow
    
    git add "$packagePath/package.json"
    git commit -m "chore: bump version to $newVersion"
    
    Write-Host "   ✅ 已提交版本更新" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "是否推送到远程仓库? [y/N]: " -ForegroundColor Yellow -NoNewline
    $pushConfirm = Read-Host
    
    if ($pushConfirm -eq "y" -or $pushConfirm -eq "Y") {
        git push origin main
        Write-Host "   ✅ 已推送到远程仓库" -ForegroundColor Green
    }
    Write-Host ""
}

# 完成
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ 发布完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "包名: @vbmsaas/mcp-server" -ForegroundColor Cyan
Write-Host "版本: $newVersion" -ForegroundColor Cyan
Write-Host "npm 页面: https://www.npmjs.com/package/@vbmsaas/mcp-server" -ForegroundColor Cyan
Write-Host ""
Write-Host "用户可以通过以下命令安装:" -ForegroundColor Yellow
Write-Host "npm install -g @vbmsaas/mcp-server" -ForegroundColor Gray
Write-Host ""

