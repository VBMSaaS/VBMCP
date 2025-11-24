# NPM 发布指南

本指南将帮助你将 `@vbmsaas/mcp-server` 发布到 npm。

## 📋 前置要求

### 1. 注册 npm 账号

如果还没有 npm 账号，请访问：https://www.npmjs.com/signup

填写信息：
- **Username**: 你的用户名（建议使用 vbmsaas 或相关名称）
- **Email**: 你的邮箱
- **Password**: 密码

### 2. 创建组织（可选但推荐）

包名是 `@vbmsaas/mcp-server`，需要创建 `vbmsaas` 组织：

1. 访问：https://www.npmjs.com/org/create
2. 组织名称：`vbmsaas`
3. 选择免费计划（Free）

**注意**：如果 `vbmsaas` 组织名已被占用，可以：
- 使用其他组织名（需要修改 package.json 中的 name）
- 或者不使用组织，直接发布为 `vbmcp`（需要修改 package.json）

### 3. 验证邮箱

npm 会发送验证邮件到你的邮箱，请点击链接验证。

## 🔐 登录 npm

### 方式一：使用命令行登录

```bash
npm login
```

输入：
- **Username**: 你的 npm 用户名
- **Password**: 你的密码
- **Email**: 你的邮箱
- **OTP** (如果启用了两步验证): 验证码

### 方式二：使用 Access Token（推荐）

1. 访问：https://www.npmjs.com/settings/YOUR_USERNAME/tokens
2. 点击 "Generate New Token"
3. 选择 "Automation" 类型
4. 复制生成的 token

然后配置：
```bash
npm config set //registry.npmjs.org/:_authToken YOUR_TOKEN
```

### 验证登录状态

```bash
npm whoami
```

应该显示你的用户名。

## 📦 发布流程

### 步骤 1: 运行发布前检查

```powershell
.\prepare-npm-publish.ps1
```

这个脚本会检查：
- ✅ npm 登录状态
- ✅ 代码编译
- ✅ 必需文件
- ✅ package.json 配置
- ✅ Git 状态

### 步骤 2: 发布到 npm

#### 自动发布（推荐）

```powershell
# 发布 patch 版本 (1.0.0 -> 1.0.1)
.\publish-to-npm.ps1

# 发布 minor 版本 (1.0.0 -> 1.1.0)
.\publish-to-npm.ps1 -VersionType minor

# 发布 major 版本 (1.0.0 -> 2.0.0)
.\publish-to-npm.ps1 -VersionType major

# 不更新版本号，直接发布当前版本
.\publish-to-npm.ps1 -VersionType none
```

#### 手动发布

```bash
# 1. 进入包目录
cd packages/mcp-server

# 2. 更新版本号（可选）
npm version patch   # 或 minor, major

# 3. 清理并编译
npm run clean
npm run build

# 4. 发布
npm publish --access public
```

### 步骤 3: 验证发布

访问：https://www.npmjs.com/package/@vbmsaas/mcp-server

应该能看到你刚发布的包。

## 🔧 常见问题

### 问题 1: 组织名不存在

**错误信息**：
```
npm ERR! 402 Payment Required - You must sign up for private packages
```

**解决方案**：
1. 创建 `vbmsaas` 组织
2. 或者修改 package.json 中的 name 为不带组织的名称

### 问题 2: 包名已存在

**错误信息**：
```
npm ERR! 403 Forbidden - You cannot publish over the previously published versions
```

**解决方案**：
1. 更新版本号：`npm version patch`
2. 或者使用不同的包名

### 问题 3: 未登录

**错误信息**：
```
npm ERR! need auth This command requires you to be logged in.
```

**解决方案**：
```bash
npm login
```

### 问题 4: 权限不足

**错误信息**：
```
npm ERR! 403 Forbidden - You do not have permission to publish
```

**解决方案**：
1. 确保你是组织成员
2. 或者使用 `--access public` 参数

## 📝 版本管理

### 语义化版本（Semantic Versioning）

版本号格式：`MAJOR.MINOR.PATCH`

- **MAJOR**: 不兼容的 API 修改
- **MINOR**: 向下兼容的功能性新增
- **PATCH**: 向下兼容的问题修正

### 更新版本号

```bash
npm version patch   # 1.0.0 -> 1.0.1 (bug 修复)
npm version minor   # 1.0.0 -> 1.1.0 (新功能)
npm version major   # 1.0.0 -> 2.0.0 (破坏性更新)
```

## 🚀 发布后

### 1. 更新 GitHub Release

1. 访问：https://github.com/VBMSaaS/VBMCP/releases/new
2. Tag: `v1.0.0`（对应版本号）
3. Title: `v1.0.0 - Initial Release`
4. 描述发布内容

### 2. 更新文档

确保 README.md 中的安装命令正确：
```bash
npm install -g @vbmsaas/mcp-server
```

### 3. 测试安装

在另一台机器或新目录测试：
```bash
npm install -g @vbmsaas/mcp-server
vbmcp --version
vbmcp-config check
```

## 📊 监控

### npm 统计

访问：https://www.npmjs.com/package/@vbmsaas/mcp-server

可以看到：
- 下载量
- 版本历史
- 依赖关系

### 更新包

当有新版本时：
```bash
cd packages/mcp-server
npm version patch
npm publish --access public
```

## 🔗 相关链接

- [npm 文档](https://docs.npmjs.com/)
- [语义化版本](https://semver.org/lang/zh-CN/)
- [npm 发布指南](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)

