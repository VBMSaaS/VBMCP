# 修复 npm registry 配置

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "修复 npm registry 配置" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. 检查当前 registry
Write-Host "1. 检查当前 registry..." -ForegroundColor Yellow
$currentRegistry = npm config get registry
Write-Host "   当前 registry: $currentRegistry" -ForegroundColor Cyan
Write-Host ""

# 2. 切换到官方 registry
if ($currentRegistry -notlike "*registry.npmjs.org*") {
    Write-Host "2. 切换到官方 npm registry..." -ForegroundColor Yellow
    npm config set registry https://registry.npmjs.org/
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ 已切换到官方 registry" -ForegroundColor Green
    } else {
        Write-Host "   ❌ 切换失败" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "2. 已经是官方 registry，无需切换" -ForegroundColor Green
}
Write-Host ""

# 3. 验证配置
Write-Host "3. 验证配置..." -ForegroundColor Yellow
$newRegistry = npm config get registry
Write-Host "   新的 registry: $newRegistry" -ForegroundColor Cyan
Write-Host ""

# 4. 提示
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Registry 配置完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  重要提示:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. 发布包时使用官方 registry:" -ForegroundColor Cyan
Write-Host "   https://registry.npmjs.org/" -ForegroundColor Gray
Write-Host ""
Write-Host "2. 如果需要使用淘宝镜像下载包，可以:" -ForegroundColor Cyan
Write-Host "   - 临时使用: npm install --registry=https://registry.npmmirror.com" -ForegroundColor Gray
Write-Host "   - 或使用 nrm 工具管理多个 registry" -ForegroundColor Gray
Write-Host ""
Write-Host "3. 现在可以登录 npm:" -ForegroundColor Cyan
Write-Host "   .\npm-login.ps1" -ForegroundColor Gray
Write-Host ""

