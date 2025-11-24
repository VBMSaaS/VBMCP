# VBMCP (VeinBase Model Context Protocol Server)

VBMCP 是一个基于 MCP 协议的服务器，为 AI Agent 提供了完整的 VBMSaaS 平台资源管理能力。

## 项目概述

通过这个项目，AI Agent 可以直接操作 VBMSaaS 平台的资源、菜单和页面，实现自动化管理和配置。

## 功能特性

### 认证与授权
- 用户登录/登出
- 获取用户信息
- 获取应用列表
- 分区登录
- 自动登录

### 资源管理
- 获取资源列表
- 创建资源
- 删除资源
- 获取资源详情

### 资源字段管理
- 添加字段
- 更新字段
- 删除字段

支持的字段类型：
- 基础类型: `string`, `int`, `numeric`, `long`, `bool`
- 时间类型: `timestamp`, `datetime`, `date`, `time`
- 复杂类型: `jsonobject`, `jsonarray`, `stringarray`
- 媒体类型: `file`, `image`, `video`, `audio`
- 其他类型: `select`, `html`

### 菜单管理
- 获取菜单树（支持 PC/移动端/小程序）
- 新增菜单

### 页面管理
- 新增页面
- 获取页面列表（支持分页）

## 快速开始

### 前置要求

- Node.js >= 18.0.0
- npm >= 8.0.0
- VBMSaaS 平台访问凭证（请联系平台管理员获取）

### 安装步骤

1. **克隆项目**
```bash
git clone <repository-url>
cd VBMCP
```

2. **安装依赖**
```bash
npm install
```

3. **构建项目**
```bash
cd packages/mcp-server
npm run build
```

4. **配置环境变量**
```bash
npm run env:config
```

按照提示输入以下信息（请联系 VBMSaaS 平台管理员获取）：
- VBMSaaS API 地址
- VBMSaaS 访问密钥
- VBMSaaS 平台ID

5. **验证配置**
```bash
npm run env:check
```

确保所有必需的环境变量都已正确配置。

### 配置

#### 方式一：使用配置向导（推荐）

```bash
cd packages/mcp-server
npm run env:config
```

配置向导会引导您输入所有必需的环境变量，并自动生成 `.env` 文件。

#### 方式二：手动配置环境变量文件

1. 复制环境变量模板：
```bash
cd packages/mcp-server
cp .env.template .env
```

2. 编辑 `.env` 文件，填入实际配置：
```env
VBMSAAS_API_URL=https://your-vbmsaas-api-url
VBMSAAS_ACCESS_KEY=your-access-key-here
VBMSAAS_PLATFORM_ID=your-platform-id-here
```

#### 检查配置状态

```bash
cd packages/mcp-server
npm run env:check
```

此命令会显示当前环境变量的配置状态。

#### 方式三：使用 MCP 配置文件

如果您使用 MCP 客户端（如 Claude Desktop），可以在 MCP 配置文件中设置环境变量：

1. 复制配置示例：
```bash
cp mcp-config.example.json mcp-config.json
```

2. 编辑 `mcp-config.json`：
```json
{
  "mcpServers": {
    "vbmsaas": {
      "command": "node",
      "args": [
        "/path/to/VBMCP/packages/mcp-server/dist/index.js"
      ],
      "env": {
        "VBMSAAS_API_URL": "https://your-vbmsaas-api-url",
        "VBMSAAS_ACCESS_KEY": "your-access-key-here",
        "VBMSAAS_PLATFORM_ID": "your-platform-id-here"
      }
    }
  }
}
```

**注意**: 请联系 VBMSaaS 平台管理员获取以下配置信息：
- `VBMSAAS_API_URL`: API 服务地址
- `VBMSAAS_ACCESS_KEY`: 访问密钥
- `VBMSAAS_PLATFORM_ID`: 平台ID

### 运行

```bash
node packages/mcp-server/dist/index.js
```

## MCP Tools

VBMCP 提供了 17 个 MCP Tools，涵盖以下功能模块：

- **认证模块**: 6个工具
- **资源管理**: 4个工具
- **字段管理**: 3个工具
- **菜单管理**: 2个工具
- **页面管理**: 2个工具

详细的使用说明请参考 [USAGE.md](USAGE.md)。

## 技术栈

- TypeScript
- Node.js
- Axios
- MCP Protocol

## 项目结构

```
VBMCP/
├── packages/
│   └── mcp-server/              # MCP Server 核心代码
│       ├── src/
│       │   ├── index.ts         # 入口文件
│       │   ├── server.ts        # MCP Server 实现
│       │   ├── types.ts         # 类型定义
│       │   ├── services/        # 服务层
│       │   │   ├── api.ts       # API 服务
│       │   │   └── auth.ts      # 认证服务
│       │   └── utils/           # 工具函数
│       ├── dist/                # 编译输出
│       ├── .env.template        # 环境变量模板
│       └── package.json
├── mcp-config.example.json      # MCP 配置示例
├── LICENSE                      # Apache License 2.0
└── README.md
```

## 许可证

本项目采用 [Apache License 2.0](LICENSE) 开源协议。

## 贡献

欢迎提交 Issue 和 Pull Request！

## 联系方式

如有问题或建议，请通过 GitHub Issues 联系我们。

