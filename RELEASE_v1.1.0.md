# Release v1.1.0 - VBIO配置生成功能

**发布日期**: 2025-11-26  
**版本号**: 1.1.0  
**Git Tag**: v1.1.0  
**NPM包**: @vbmsaas/mcp-server@1.1.0

---

## 🎉 发布概述

本次发布新增了完整的VBIO API配置生成功能,支持从需求文档自动生成API配置并保存到数据库。

---

## ✨ 新增功能

### 1. SQL参数化服务 (`SqlParameterizer`)
- ✅ 自动识别SQL中的参数值(字符串、数字)
- ✅ 智能推断参数名(snake_case → camelCase)
- ✅ 自动推断参数类型(string/number/boolean)
- ✅ 将实际值替换为MyBatis风格占位符 `#{paramName}`
- ✅ 复杂SQL检测和警告机制

### 2. SQL拆分服务 (`SqlSplitter`)
- ✅ 分离主SQL(不含WHERE和ORDER BY)
- ✅ 提取WHERE子句并解析为条件数组
- ✅ 提取ORDER BY子句
- ✅ 正确处理AND/OR连接符和括号逻辑
- ✅ 自动关联条件中的参数名

### 3. API配置解析器 (`ApiConfigParser`)
- ✅ 从需求文档提取基本信息
- ✅ 从文档提取参数定义
- ✅ 从文档提取返回字段定义
- ✅ 从文档提取表信息
- ✅ 从文档SQL示例中提取样例SQL
- ✅ 集成SqlParameterizer和SqlSplitter

### 4. API配置保存器 (`ApiConfigSaver`)
- ✅ 保存到vb_openapi表(主表)
- ✅ 保存到vb_openapi_parameters表(参数表)
- ✅ 保存到vb_openapi_conditions表(条件表)
- ✅ 保存到vb_openapi_columns表(返回字段表)
- ✅ 保存到vb_openapi_column_usage表(表使用表)

### 5. API测试器 (`ApiTester`)
- ✅ 测试生成的API配置
- ✅ 验证SQL语法
- ✅ 验证参数绑定

---

## 🔄 完整工作流程

```
需求文档
    ↓
提取信息(ApiConfigParser)
    ↓
生成样例SQL
    ↓
参数化(SqlParameterizer)
    ↓
拆分(SqlSplitter)
    ↓
保存(ApiConfigSaver)
    ↓
API配置创建完成
```

---

## 📊 数据库变更

新增以下数据库表结构定义:
- `vb_openapi` - API主表
- `vb_openapi_parameters` - 参数表
- `vb_openapi_conditions` - WHERE条件表
- `vb_openapi_columns` - 返回字段表
- `vb_openapi_table_usage` - 表使用表
- `vb_openapi_column_usage` - 字段使用表

---

## 📦 发布信息

### Git提交
- **Commit**: 07aa0b1
- **分支**: main
- **文件变更**: 21个文件,新增2704行代码

### NPM发布
- **包名**: @vbmsaas/mcp-server
- **版本**: 1.1.0
- **包大小**: 84.0 KB
- **解压大小**: 536.3 KB
- **文件数**: 59个

### 发布内容
- ✅ 编译后的TypeScript代码(dist/)
- ✅ 类型定义文件(.d.ts)
- ✅ Source Map文件(.js.map)
- ✅ README文档
- ✅ 环境变量模板(.env.template)

### 排除内容
- ❌ 测试脚本(test-*.js)
- ❌ 开发文档(docs/)
- ❌ 敏感信息(.env, credentials.json)
- ❌ 临时文件(tmp/, temp/)

---

## 🔒 安全检查

- ✅ 无敏感信息泄露
- ✅ 无开发过程文档
- ✅ 无测试脚本
- ✅ 无环境变量文件
- ✅ 无凭证文件

---

## 📝 使用方法

### 安装
```bash
npm install @vbmsaas/mcp-server@1.1.0
```

### 使用
```typescript
import { VBMSaaSMCPServer } from '@vbmsaas/mcp-server';

const server = new VBMSaaSMCPServer();

// 从需求文档创建API配置
const result = await server.handleCreateApiFromDescription({
  description: requirementDoc,
  partitionId: 'your-partition-id'
});
```

---

## 🔗 相关链接

- **GitHub仓库**: https://github.com/VBMSaaS/VBMCP
- **NPM包**: https://www.npmjs.com/package/@vbmsaas/mcp-server
- **Git Tag**: https://github.com/VBMSaaS/VBMCP/releases/tag/v1.1.0

---

## 👥 贡献者

- 小万(AI助手) - 核心功能实现
- 老赵 - 需求分析和方案设计

---

## 📅 下一步计划

- [ ] 扩展测试用例(子查询、复杂JOIN、CASE WHEN等)
- [ ] 添加配置缓存机制
- [ ] 添加SQL预编译功能
- [ ] 完善审计日志
- [ ] 添加外键约束

---

**发布完成时间**: 2025-11-26  
**发布状态**: ✅ 成功

