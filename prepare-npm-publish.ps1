# NPM 发布准备脚本

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "NPM 发布准备检查" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$packagePath = "packages/mcp-server"
$allPassed = $true

# 1. 检查 npm 登录状态
Write-Host "1. 检查 npm 登录状态..." -ForegroundColor Yellow
$npmUser = npm whoami 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ 已登录 npm: $npmUser" -ForegroundColor Green
} else {
    Write-Host "   ❌ 未登录 npm" -ForegroundColor Red
    Write-Host "   请运行: npm login" -ForegroundColor Yellow
    $allPassed = $false
}
Write-Host ""

# 2. 检查代码编译
Write-Host "2. 检查代码编译..." -ForegroundColor Yellow
Push-Location $packagePath
$buildResult = npm run build 2>&1
Pop-Location

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ 代码编译成功" -ForegroundColor Green
} else {
    Write-Host "   ❌ 代码编译失败" -ForegroundColor Red
    $allPassed = $false
}
Write-Host ""

# 3. 检查必需文件
Write-Host "3. 检查必需文件..." -ForegroundColor Yellow
$requiredFiles = @(
    "$packagePath/package.json",
    "$packagePath/README.md",
    "$packagePath/.env.template",
    "$packagePath/.npmignore",
    "$packagePath/dist/index.js",
    "$packagePath/dist/cli.js"
)

foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "   ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $file 不存在" -ForegroundColor Red
        $allPassed = $false
    }
}
Write-Host ""

# 4. 检查 package.json 配置
Write-Host "4. 检查 package.json 配置..." -ForegroundColor Yellow
$packageJson = Get-Content "$packagePath/package.json" -Raw | ConvertFrom-Json

$requiredFields = @{
    "name" = "@vbmsaas/mcp-server"
    "version" = $null
    "description" = $null
    "license" = "Apache-2.0"
    "main" = "dist/index.js"
    "types" = "dist/index.d.ts"
}

foreach ($field in $requiredFields.Keys) {
    $expectedValue = $requiredFields[$field]
    $actualValue = $packageJson.$field
    
    if ($null -eq $actualValue) {
        Write-Host "   ❌ 缺少字段: $field" -ForegroundColor Red
        $allPassed = $false
    } elseif ($null -ne $expectedValue -and $actualValue -ne $expectedValue) {
        Write-Host "   ❌ $field 值不正确: $actualValue (期望: $expectedValue)" -ForegroundColor Red
        $allPassed = $false
    } else {
        Write-Host "   ✅ $field : $actualValue" -ForegroundColor Green
    }
}
Write-Host ""

# 5. 检查版本号
Write-Host "5. 当前版本号..." -ForegroundColor Yellow
Write-Host "   版本: $($packageJson.version)" -ForegroundColor Cyan
Write-Host ""

# 6. 预览将要发布的文件
Write-Host "6. 预览将要发布的文件..." -ForegroundColor Yellow
Push-Location $packagePath
$files = npm pack --dry-run 2>&1 | Select-String -Pattern "npm notice" | ForEach-Object { $_.Line }
Pop-Location

if ($files) {
    Write-Host "   将要发布的文件:" -ForegroundColor Gray
    $files | ForEach-Object { Write-Host "   $_" -ForegroundColor Cyan }
} else {
    Write-Host "   ⚠️  无法预览文件列表" -ForegroundColor Yellow
}
Write-Host ""

# 7. 检查 Git 状态
Write-Host "7. 检查 Git 状态..." -ForegroundColor Yellow
$gitStatus = git status --porcelain
if ([string]::IsNullOrWhiteSpace($gitStatus)) {
    Write-Host "   ✅ 工作区干净" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  有未提交的更改" -ForegroundColor Yellow
    Write-Host "   建议先提交所有更改再发布" -ForegroundColor Gray
}
Write-Host ""

# 8. 检查远程仓库
Write-Host "8. 检查远程仓库..." -ForegroundColor Yellow
$remoteUrl = git remote get-url origin 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ 远程仓库: $remoteUrl" -ForegroundColor Green
} else {
    Write-Host "   ⚠️  未配置远程仓库" -ForegroundColor Yellow
}
Write-Host ""

# 总结
Write-Host "========================================" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "✅ 所有检查通过！" -ForegroundColor Green
    Write-Host ""
    Write-Host "下一步操作:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. 如果需要更新版本号:" -ForegroundColor Cyan
    Write-Host "   cd $packagePath" -ForegroundColor Gray
    Write-Host "   npm version patch   # 1.0.0 -> 1.0.1" -ForegroundColor Gray
    Write-Host "   npm version minor   # 1.0.0 -> 1.1.0" -ForegroundColor Gray
    Write-Host "   npm version major   # 1.0.0 -> 2.0.0" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. 发布到 npm:" -ForegroundColor Cyan
    Write-Host "   cd $packagePath" -ForegroundColor Gray
    Write-Host "   npm publish --access public" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. 或者运行发布脚本:" -ForegroundColor Cyan
    Write-Host "   .\publish-to-npm.ps1" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "❌ 部分检查未通过，请修复后再发布" -ForegroundColor Red
}
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

