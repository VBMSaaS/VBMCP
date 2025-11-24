# @vbmsaas/mcp-server

[![npm version](https://badge.fury.io/js/@vbmsaas%2Fmcp-server.svg)](https://www.npmjs.com/package/@vbmsaas/mcp-server)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

VBMSaaS MCP Server - Model Context Protocol server for VBMSaaS platform integration.

## 🚀 Features

- ✅ **17 MCP Tools** covering 5 major functional modules
- ✅ **Authentication Management** - Login, logout, credential storage
- ✅ **Resource Management** - CRUD operations for platform resources
- ✅ **Field Management** - Dynamic field definitions
- ✅ **Menu Management** - PC, Mobile, and Mini Program menus
- ✅ **Page Management** - Page configuration and retrieval
- ✅ **Environment Configuration CLI** - Interactive setup wizard

## 📦 Installation

### Global Installation (Recommended)

```bash
npm install -g @vbmsaas/mcp-server
```

### Local Installation

```bash
npm install @vbmsaas/mcp-server
```

## ⚙️ Configuration

### Quick Setup

```bash
# Run configuration wizard
vbmcp-config config

# Check configuration status
vbmcp-config check
```

### Manual Configuration

Create a `.env` file in your project root:

```env
# Required
VBMSAAS_API_URL=https://api.vbmsaas.com
VBMSAAS_ACCESS_KEY=your-access-key
VBMSAAS_PLATFORM_ID=your-platform-id

# Optional (for development/testing)
VBMSAAS_ACCOUNT=your-account
VBMSAAS_PASSWORD=your-password
VBMSAAS_PARTITION_ID=your-partition-id

# Server Configuration
JWT_SECRET=your-jwt-secret
SERVER_NAME=VBMCP
SERVER_VERSION=1.0.0
```

### Claude Desktop Configuration

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "vbmsaas": {
      "command": "vbmcp",
      "env": {
        "VBMSAAS_API_URL": "https://api.vbmsaas.com",
        "VBMSAAS_ACCESS_KEY": "your-access-key",
        "VBMSAAS_PLATFORM_ID": "your-platform-id",
        "JWT_SECRET": "your-jwt-secret"
      }
    }
  }
}
```

**Config file location:**
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

## 🛠️ Available MCP Tools

### Authentication (3 tools)
- `vbmsaas_login` - Login with account and password
- `vbmsaas_logout` - Logout and clear session
- `vbmsaas_save_credentials` - Save credentials for auto-login
- `vbmsaas_login_auto` - Auto-login with saved credentials

### Resource Management (5 tools)
- `vbmsaas_get_resources` - Get all resources for a partition
- `vbmsaas_add_resource` - Add a new resource
- `vbmsaas_delete_resource` - Delete a resource
- `vbmsaas_get_resource_basic_info` - Get basic resource information
- `vbmsaas_get_resource_detail` - Get detailed resource information

### Field Management (3 tools)
- `vbmsaas_add_resource_field` - Add a field to a resource
- `vbmsaas_update_resource_field` - Update a field definition
- `vbmsaas_delete_resource_field` - Delete a field from a resource

### Menu Management (2 tools)
- `vbmsaas_get_menu_tree` - Get menu tree for a role
- `vbmsaas_add_menu` - Add a new menu

### Page Management (2 tools)
- `vbmsaas_get_pages` - Get pages with pagination
- `vbmsaas_add_page` - Add a new page

### User Management (2 tools)
- `vbmsaas_get_user_info` - Get current user information
- `vbmsaas_get_applications` - Get accessible applications

## 📖 Usage Examples

### Using with Claude Desktop

After configuration, you can use MCP tools in Claude conversations:

```
User: Please login to VBMSaaS with my account
Claude: [Uses vbmsaas_login tool]

User: Show me all resources in the platform
Claude: [Uses vbmsaas_get_resources tool]

User: Create a new resource called "Customer"
Claude: [Uses vbmsaas_add_resource tool]
```

### Programmatic Usage

```typescript
import { VBMSaaSMCPServer } from '@vbmsaas/mcp-server';

const server = new VBMSaaSMCPServer();
await server.start();
```

## 🔒 Security Best Practices

1. **Never commit `.env` files** - Use `.env.template` as reference
2. **Use environment variables** - Don't hardcode credentials
3. **Rotate secrets regularly** - Update JWT_SECRET and access keys
4. **Production environments** - Use MCP tools or credential storage instead of env vars

## 📚 Documentation

- [Full Documentation](https://github.com/VBMSaaS/VBMCP#readme)
- [Usage Guide](https://github.com/VBMSaaS/VBMCP/blob/main/USAGE.md)
- [API Reference](https://github.com/VBMSaaS/VBMCP/wiki)

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](https://github.com/VBMSaaS/VBMCP/blob/main/CONTRIBUTING.md).

## 📄 License

Apache License 2.0 - see [LICENSE](https://github.com/VBMSaaS/VBMCP/blob/main/LICENSE)

## 🔗 Links

- [GitHub Repository](https://github.com/VBMSaaS/VBMCP)
- [Issue Tracker](https://github.com/VBMSaaS/VBMCP/issues)
- [VBMSaaS Platform](https://www.vbmsaas.com)

## 💬 Support

- GitHub Issues: [Report a bug](https://github.com/VBMSaaS/VBMCP/issues/new)
- Email: support@vbmsaas.com

