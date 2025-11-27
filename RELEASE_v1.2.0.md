# Release Notes - v1.2.0

## 🎉 新功能 - 数据管理模块

本次发布新增了完整的数据管理功能,为 VBMCP 提供了对 VBMSaaS 平台资源数据的完整 CRUD 操作能力。

### ✨ 新增工具 (5个)

1. **vbmsaas_query_resource_data** - 查询资源数据
   - 支持分页查询 (page, pageSize)
   - 支持条件过滤 (conditions)
   - 支持排序 (orderBy, orderDirection)
   - 支持指定返回字段 (fields)

2. **vbmsaas_get_resource_data** - 获取单条资源数据
   - 根据 mid 获取数据详情
   - 支持包含引用数据 (withQuote)

3. **vbmsaas_update_resource_data** - 更新资源数据
   - 根据 mid 更新指定数据
   - 支持部分字段更新

4. **vbmsaas_delete_resource_data** - 删除资源数据
   - 根据 mid 删除数据
   - 支持强制删除选项 (force)

5. **vbmsaas_batch_resource_data** - 批量操作资源数据
   - 支持批量添加
   - 支持批量更新
   - 支持批量删除
   - 返回每个操作的详细结果

### 📝 代码变更

- **types.ts**: 新增 10 个数据管理相关的类型定义
- **api.ts**: 新增 4 个 API 服务方法
  - `queryResourceData()` - 查询数据列表
  - `getResourceData()` - 获取单条数据
  - `updateResourceData()` - 更新数据
  - `deleteResourceData()` - 删除数据
  - `batchResourceData()` - 批量操作
- **server.ts**: 新增 5 个 MCP 工具注册和处理方法

### 📚 文档更新

- **README.md**: 更新功能列表,MCP Tools 总数从 17 个增加到 27 个
- **USAGE.md**: 新增完整的数据管理工具使用指南,包含详细示例

### 📊 统计数据

- 新增代码: 约 600 行
- 新增类型: 10 个接口
- 新增方法: 9 个 (4个API + 5个处理)
- MCP Tools 总数: **27 个** (从 17 个增加)

### 🔧 技术改进

- ✅ 完整的 TypeScript 类型定义
- ✅ 详细的日志输出和错误处理
- ✅ 统一的响应格式
- ✅ 完善的参数验证

### 📦 升级说明

从 v1.1.0 升级到 v1.2.0:

```bash
npm install @vbmsaas/mcp-server@1.2.0
```

或者更新 package.json:

```json
{
  "dependencies": {
    "@vbmsaas/mcp-server": "^1.2.0"
  }
}
```

### 🎯 使用示例

查询数据:
```typescript
await vbmsaas_query_resource_data({
  categoryId: "your-category-id",
  page: 1,
  pageSize: 10,
  orderBy: "createTime",
  orderDirection: "desc"
});
```

批量操作:
```typescript
await vbmsaas_batch_resource_data({
  categoryId: "your-category-id",
  operations: [
    { type: "add", data: { name: "Item 1" } },
    { type: "update", mid: "xxx", data: { name: "Updated" } },
    { type: "delete", mid: "yyy" }
  ]
});
```

---

**发布日期**: 2025-11-27  
**版本**: 1.2.0  
**贡献者**: 小万 & 老赵

