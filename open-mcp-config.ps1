# 打开 Claude Desktop MCP 配置文件

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "打开 Claude Desktop MCP 配置" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$configPath = "$env:APPDATA\Claude\claude_desktop_config.json"

# 检查配置文件是否存在
if (Test-Path $configPath) {
    Write-Host "✅ 找到配置文件:" -ForegroundColor Green
    Write-Host "   $configPath" -ForegroundColor Gray
    Write-Host ""
    
    # 显示当前配置
    Write-Host "当前配置内容:" -ForegroundColor Yellow
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Get-Content $configPath | Write-Host -ForegroundColor Cyan
    Write-Host "----------------------------------------" -ForegroundColor Gray
    Write-Host ""
    
    # 询问是否用编辑器打开
    Write-Host "是否用编辑器打开配置文件? [Y/n]: " -ForegroundColor Yellow -NoNewline
    $open = Read-Host
    
    if ($open -eq "" -or $open -eq "Y" -or $open -eq "y") {
        # 用默认编辑器打开
        notepad $configPath
    }
} else {
    Write-Host "❌ 配置文件不存在" -ForegroundColor Red
    Write-Host "   路径: $configPath" -ForegroundColor Gray
    Write-Host ""
    Write-Host "是否创建配置文件? [Y/n]: " -ForegroundColor Yellow -NoNewline
    $create = Read-Host
    
    if ($create -eq "" -or $create -eq "Y" -or $create -eq "y") {
        # 确保目录存在
        $configDir = Split-Path $configPath
        if (-not (Test-Path $configDir)) {
            New-Item -ItemType Directory -Path $configDir -Force | Out-Null
        }
        
        # 创建示例配置
        $exampleConfig = @{
            mcpServers = @{
                vbmsaas = @{
                    command = "node"
                    args = @(
                        "$PSScriptRoot\packages\mcp-server\dist\index.js"
                    )
                    env = @{
                        VBMSAAS_API_URL = "https://api.vbmsaas.com"
                        VBMSAAS_ACCESS_KEY = "your-access-key-here"
                        VBMSAAS_PLATFORM_ID = "your-platform-id-here"
                    }
                }
            }
        } | ConvertTo-Json -Depth 10
        
        $exampleConfig | Out-File -FilePath $configPath -Encoding utf8
        
        Write-Host ""
        Write-Host "✅ 配置文件已创建" -ForegroundColor Green
        Write-Host ""
        Write-Host "⚠️  请编辑配置文件，填入正确的环境变量值" -ForegroundColor Yellow
        Write-Host ""
        
        # 打开编辑器
        notepad $configPath
    }
}

Write-Host ""
Write-Host "配置文件路径: $configPath" -ForegroundColor Cyan
Write-Host ""

