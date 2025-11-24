# VBMCP 使用指南

## 环境变量配置

VBMCP 需要配置以下环境变量才能正常运行。

### 必需的环境变量

| 环境变量 | 说明 | 示例 |
|---------|------|------|
| `VBMSAAS_API_URL` | VBMSaaS API 地址 | `https://api.vbmsaas.com` |
| `VBMSAAS_ACCESS_KEY` | VBMSaaS 访问密钥 | `your-access-key-here` |
| `VBMSAAS_PLATFORM_ID` | VBMSaaS 平台ID | `your-platform-id-here` |

**注意**: 这些配置信息需要联系 VBMSaaS 平台管理员获取。

### 可选的环境变量

#### 登录凭证（仅用于开发/测试）

⚠️ **警告**: 生产环境不推荐配置账号密码到环境变量中。推荐使用以下方式：
- 通过 MCP Tools 参数传入账号密码
- 使用 `vbmsaas_save_credentials` 工具保存到安全存储

| 环境变量 | 说明 | 示例 |
|---------|------|------|
| `VBMSAAS_ACCOUNT` | 默认登录账号 | `user@example.com` 或 `13800138000` |
| `VBMSAAS_PASSWORD` | 默认登录密码 | `your-password` |
| `VBMSAAS_PARTITION_ID` | 默认分区ID | `your-partition-id` |

#### 服务器配置

| 环境变量 | 说明 | 默认值 |
|---------|------|--------|
| `SERVER_NAME` | 服务器名称 | `vbmsaas-mcp-platform` |
| `SERVER_VERSION` | 服务器版本 | `1.0.0` |
| `API_TIMEOUT` | API 超时时间（毫秒） | `30000` |
| `JWT_SECRET` | JWT 密钥 | `vbmsaas-default-secret-change-in-production` |

## 配置方法

### 方法一：使用配置向导（推荐）

```bash
cd packages/mcp-server
npm run env:config
```

配置向导会：
1. 引导您输入所有必需的环境变量
2. 可选配置其他环境变量
3. 自动生成 `.env` 文件

### 方法二：手动配置

1. 复制模板文件：
```bash
cd packages/mcp-server
cp .env.template .env
```

2. 编辑 `.env` 文件，填入实际值：
```env
VBMSAAS_API_URL=https://your-actual-api-url
VBMSAAS_ACCESS_KEY=your-actual-access-key
VBMSAAS_PLATFORM_ID=your-actual-platform-id
```

### 验证配置

配置完成后，运行以下命令验证：

```bash
cd packages/mcp-server
npm run env:check
```

输出示例：
```
========================================
VBMCP 环境变量配置状态
========================================

必需的环境变量:
  ✅ 已配置 VBMSAAS_API_URL: VBMSaaS API 地址
  ✅ 已配置 VBMSAAS_ACCESS_KEY: VBMSaaS 访问密钥
  ✅ 已配置 VBMSAAS_PLATFORM_ID: VBMSaaS 平台ID

可选的环境变量:
  ✅ 已配置 SERVER_NAME: 服务器名称
  ⚪ 未配置 SERVER_VERSION: 服务器版本
  ⚪ 未配置 API_TIMEOUT: API 超时时间（毫秒）
  ⚪ 未配置 JWT_SECRET: JWT 密钥

========================================
✅ 所有必需的环境变量已配置
========================================
```

## 运行服务器

配置完成后，可以启动 MCP 服务器：

```bash
cd packages/mcp-server
npm start
```

## 在 MCP 客户端中使用

### Claude Desktop 配置示例

编辑 Claude Desktop 的配置文件（通常在 `~/.config/claude/config.json`）：

```json
{
  "mcpServers": {
    "vbmsaas": {
      "command": "node",
      "args": [
        "/path/to/VBMCP/packages/mcp-server/dist/index.js"
      ],
      "env": {
        "VBMSAAS_API_URL": "https://your-api-url",
        "VBMSAAS_ACCESS_KEY": "your-access-key",
        "VBMSAAS_PLATFORM_ID": "your-platform-id"
      }
    }
  }
}
```

## 登录方式

VBMCP 支持多种登录方式：

### 方式一：通过 MCP Tools 登录（推荐）

使用 `vbmsaas_login_with_partition` 工具，每次调用时提供账号密码：

```javascript
{
  "account": "user@example.com",
  "password": "your-password",
  "partitionId": "your-partition-id"
}
```

### 方式二：保存凭证自动登录

1. 使用 `vbmsaas_save_credentials` 工具保存凭证到安全存储
2. 使用 `vbmsaas_login_auto` 工具自动登录

### 方式三：环境变量配置（仅用于开发/测试）

在 `.env` 文件中配置：
```env
VBMSAAS_ACCOUNT=user@example.com
VBMSAAS_PASSWORD=your-password
VBMSAAS_PARTITION_ID=your-partition-id
```

⚠️ **注意**: 生产环境不推荐使用此方式，因为账号密码会以明文形式保存在文件中。

## 常见问题

### Q: 如何获取 VBMSaaS 平台配置信息？

A: 请联系 VBMSaaS 平台管理员获取以下信息：
- API 地址
- 访问密钥
- 平台ID
- 账号和密码（如需要）

### Q: 账号密码应该如何配置？

A: 推荐方式（按优先级排序）：
1. **通过 MCP Tools 参数传入**（最安全）- 每次调用时提供
2. **使用凭证存储**（推荐）- 使用 `vbmsaas_save_credentials` 保存到安全存储
3. **环境变量配置**（仅开发/测试）- 配置到 `.env` 文件

### Q: 配置文件保存在哪里？

A: `.env` 文件保存在 `packages/mcp-server/` 目录下。此文件已被 `.gitignore` 忽略，不会被提交到版本控制系统。

### Q: 如何更新配置？

A: 可以：
1. 重新运行 `npm run env:config` 配置向导
2. 或直接编辑 `.env` 文件

### Q: 配置错误怎么办？

A: 运行 `npm run env:check` 检查配置状态，确保所有必需的环境变量都已正确配置。

## 安全提示

⚠️ **重要**: 
- 不要将 `.env` 文件提交到版本控制系统
- 不要在公开场合分享您的访问密钥和平台ID
- 定期更换访问密钥以提高安全性

