# NPM 登录脚本

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "NPM 登录" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "准备登录 npm..." -ForegroundColor Yellow
Write-Host ""
Write-Host "请在弹出的浏览器中完成登录" -ForegroundColor Cyan
Write-Host "或者在命令行中输入你的 npm 凭证" -ForegroundColor Cyan
Write-Host ""

# 尝试登录
npm login

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "✅ 登录成功！" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # 显示当前用户
    $username = npm whoami
    Write-Host "当前用户: $username" -ForegroundColor Cyan
    Write-Host ""
    
    # 检查是否需要创建组织
    Write-Host "检查组织权限..." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "包名是: @vbmsaas/mcp-server" -ForegroundColor Cyan
    Write-Host "需要 'vbmsaas' 组织权限" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "请确认:" -ForegroundColor Yellow
    Write-Host "1. 你已经创建了 'vbmsaas' 组织，或" -ForegroundColor Gray
    Write-Host "2. 你是 'vbmsaas' 组织的成员" -ForegroundColor Gray
    Write-Host ""
    Write-Host "如果还没有创建组织，请访问:" -ForegroundColor Yellow
    Write-Host "https://www.npmjs.com/org/create" -ForegroundColor Cyan
    Write-Host ""
    
    Write-Host "是否继续发布流程? [y/N]: " -ForegroundColor Yellow -NoNewline
    $continue = Read-Host
    
    if ($continue -eq "y" -or $continue -eq "Y") {
        Write-Host ""
        Write-Host "运行发布前检查..." -ForegroundColor Yellow
        .\prepare-npm-publish.ps1
    }
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "❌ 登录失败" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "请检查:" -ForegroundColor Yellow
    Write-Host "1. 用户名和密码是否正确" -ForegroundColor Gray
    Write-Host "2. 邮箱是否已验证" -ForegroundColor Gray
    Write-Host "3. 网络连接是否正常" -ForegroundColor Gray
    Write-Host ""
}

