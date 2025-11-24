# 配置 Claude Desktop MCP

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "配置 Claude Desktop MCP" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$configPath = "$env:APPDATA\Claude\claude_desktop_config.json"
$configDir = Split-Path $configPath

# 1. 确保目录存在
if (-not (Test-Path $configDir)) {
    Write-Host "创建配置目录..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
    Write-Host "✅ 目录已创建: $configDir" -ForegroundColor Green
    Write-Host ""
}

# 2. 检查是否已有配置
$hasExisting = $false
if (Test-Path $configPath) {
    Write-Host "⚠️  发现现有配置文件" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "当前配置:" -ForegroundColor Gray
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Get-Content $configPath | Write-Host -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "是否覆盖现有配置? [y/N]: " -ForegroundColor Yellow -NoNewline
    $overwrite = Read-Host
    
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host ""
        Write-Host "已取消配置" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "你可以手动编辑配置文件:" -ForegroundColor Cyan
        Write-Host "notepad $configPath" -ForegroundColor Gray
        Write-Host ""
        exit 0
    }
    $hasExisting = $true
    Write-Host ""
}

# 3. 获取环境变量
Write-Host "请输入 VBMSaaS 配置信息:" -ForegroundColor Yellow
Write-Host ""

Write-Host "VBMSAAS_API_URL [https://api.vbmsaas.com]: " -ForegroundColor Cyan -NoNewline
$apiUrl = Read-Host
if ([string]::IsNullOrWhiteSpace($apiUrl)) {
    $apiUrl = "https://api.vbmsaas.com"
}

Write-Host "VBMSAAS_ACCESS_KEY: " -ForegroundColor Cyan -NoNewline
$accessKey = Read-Host
if ([string]::IsNullOrWhiteSpace($accessKey)) {
    Write-Host ""
    Write-Host "❌ Access Key 不能为空" -ForegroundColor Red
    exit 1
}

Write-Host "VBMSAAS_PLATFORM_ID: " -ForegroundColor Cyan -NoNewline
$platformId = Read-Host
if ([string]::IsNullOrWhiteSpace($platformId)) {
    Write-Host ""
    Write-Host "❌ Platform ID 不能为空" -ForegroundColor Red
    exit 1
}

Write-Host "JWT_SECRET [vbmsaas-secret-key]: " -ForegroundColor Cyan -NoNewline
$jwtSecret = Read-Host
if ([string]::IsNullOrWhiteSpace($jwtSecret)) {
    $jwtSecret = "vbmsaas-secret-key"
}

Write-Host ""

# 4. 创建配置
$currentPath = (Get-Location).Path
$indexPath = Join-Path $currentPath "packages\mcp-server\dist\index.js"
$indexPath = $indexPath -replace '\\', '/'

$config = @{
    mcpServers = @{
        vbmsaas = @{
            command = "node"
            args = @($indexPath)
            env = @{
                VBMSAAS_API_URL = $apiUrl
                VBMSAAS_ACCESS_KEY = $accessKey
                VBMSAAS_PLATFORM_ID = $platformId
                JWT_SECRET = $jwtSecret
            }
        }
    }
}

# 如果已有配置，尝试合并
if ($hasExisting) {
    try {
        $existingConfig = Get-Content $configPath -Raw | ConvertFrom-Json
        if ($existingConfig.mcpServers) {
            # 保留其他 MCP 服务器配置
            $existingConfig.mcpServers.PSObject.Properties | ForEach-Object {
                if ($_.Name -ne "vbmsaas") {
                    $config.mcpServers[$_.Name] = $_.Value
                }
            }
        }
    } catch {
        Write-Host "⚠️  无法解析现有配置，将创建新配置" -ForegroundColor Yellow
    }
}

# 5. 保存配置
$configJson = $config | ConvertTo-Json -Depth 10
$configJson | Out-File -FilePath $configPath -Encoding utf8

Write-Host "✅ 配置已保存到:" -ForegroundColor Green
Write-Host "   $configPath" -ForegroundColor Gray
Write-Host ""

# 6. 显示配置
Write-Host "配置内容:" -ForegroundColor Yellow
Write-Host "----------------------------------------" -ForegroundColor Gray
$configJson | Write-Host -ForegroundColor Cyan
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host ""

# 7. 提示
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Claude Desktop MCP 配置完成！" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "下一步:" -ForegroundColor Yellow
Write-Host "1. 重启 Claude Desktop 应用" -ForegroundColor Cyan
Write-Host "2. 在 Claude 中使用 VBMSaaS MCP Tools" -ForegroundColor Cyan
Write-Host ""
Write-Host "可用的 MCP Tools:" -ForegroundColor Yellow
Write-Host "  - vbmsaas_login" -ForegroundColor Cyan
Write-Host "  - vbmsaas_get_resources" -ForegroundColor Cyan
Write-Host "  - vbmsaas_add_resource" -ForegroundColor Cyan
Write-Host "  - vbmsaas_get_menu_tree" -ForegroundColor Cyan
Write-Host "  - vbmsaas_add_menu" -ForegroundColor Cyan
Write-Host "  - ... 等 17 个工具" -ForegroundColor Cyan
Write-Host ""

