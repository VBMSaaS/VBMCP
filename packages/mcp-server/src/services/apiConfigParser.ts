/**
 * API Configuration Parser Service
 *
 * 解析API需求文字描述,提取API配置信息
 */

import { ParsedApiConfig, ApiParameter, ApiCondition, ApiColumn, ApiTableUsage } from '../types.js';
import { SqlParameterizer } from './sqlParameterizer.js';
import { SqlSplitter } from './sqlSplitter.js';

export class ApiConfigParser {
  private sqlParameterizer: SqlParameterizer;
  private sqlSplitter: SqlSplitter;

  constructor() {
    this.sqlParameterizer = new SqlParameterizer();
    this.sqlSplitter = new SqlSplitter();
  }
  /**
   * 解析API需求描述,提取配置信息
   * 
   * @param description - API需求的文字描述
   * @returns 解析后的API配置
   */
  async parseDescription(description: string): Promise<ParsedApiConfig> {
    console.log('[ApiConfigParser] 开始解析API需求描述');
    console.log('[ApiConfigParser] 描述长度:', description.length);

    // 使用简单的规则解析(后续可以集成LLM)
    const config = this.parseWithRules(description);

    console.log('[ApiConfigParser] 解析完成');
    console.log('[ApiConfigParser] API名称:', config.name);
    console.log('[ApiConfigParser] HTTP方法:', config.httpMethod);
    console.log('[ApiConfigParser] 路由路径:', config.routePath);

    return config;
  }

  /**
   * 使用规则解析描述
   *
   * @param description - API需求描述
   * @returns 解析后的配置
   */
  private parseWithRules(description: string): ParsedApiConfig {
    // 提取基本信息
    const name = this.extractName(description);
    const httpMethod = this.extractHttpMethod(description);
    const routePath = this.extractRoutePath(description);
    const descriptionText = this.extractDescription(description);

    // 提取声明的参数(从需求文档)
    const declaredParams = this.extractParameters(description);

    // 提取返回字段
    const columns = this.extractColumns(description);

    // 提取表信息
    const tableUsages = this.extractTableUsages(description);

    // 生成样例SQL(如果是数据库查询类接口)
    const sampleSql = this.generateSql(description, tableUsages, columns, []);

    // 参数化SQL - 将实际值替换为占位符
    const { parameterizedSql, parameters } = this.sqlParameterizer.parameterizeSql(
      sampleSql,
      declaredParams
    );

    // 拆分SQL - 分离主SQL、WHERE条件、ORDER BY
    const { mainSql, conditions, orderBy } = this.sqlSplitter.splitSql(parameterizedSql);

    return {
      name,
      description: descriptionText,
      httpMethod,
      routePath,
      apiType: 'query',
      resultType: 'json',
      authType: 'token',
      apiSql: mainSql,
      apiSqlOrderBy: orderBy,
      parameters,
      conditions,
      columns,
      tableUsages
    };
  }

  /**
   * 提取API名称
   */
  private extractName(description: string): string {
    // 查找"接口名称"、"API名称"等关键词 (支持markdown加粗)
    const nameMatch = description.match(/(?:\*\*)?(?:接口名称|API名称|名称)(?:\*\*)?[：:]\s*(.+?)(?:\n|$)/);
    if (nameMatch) {
      return nameMatch[1].trim();
    }

    // 查找第一个标题
    const titleMatch = description.match(/^##?\s+(.+?)$/m);
    if (titleMatch) {
      return titleMatch[1].trim();
    }

    return '未命名API';
  }

  /**
   * 提取HTTP方法
   */
  private extractHttpMethod(description: string): string {
    // 支持markdown加粗
    const methodMatch = description.match(/(?:\*\*)?(?:请求方法|HTTP方法|方法)(?:\*\*)?[：:]\s*`?([A-Z]+)`?/i);
    if (methodMatch) {
      return methodMatch[1].toUpperCase();
    }

    // 默认GET
    return 'GET';
  }

  /**
   * 提取路由路径
   */
  private extractRoutePath(description: string): string {
    // 支持markdown加粗和代码块
    const pathMatch = description.match(/(?:\*\*)?(?:接口路径|路径|URL)(?:\*\*)?[：:]\s*`([^`]+)`/);
    if (pathMatch) {
      return pathMatch[1].trim();
    }

    return '/api/unknown';
  }

  /**
   * 提取描述信息
   */
  private extractDescription(description: string): string {
    // 提取概述部分
    const overviewMatch = description.match(/##\s*概述\s*\n\n(.+?)(?:\n\n|---)/s);
    if (overviewMatch) {
      return overviewMatch[1].trim();
    }
    
    // 返回前100个字符
    return description.substring(0, 100).replace(/\n/g, ' ');
  }

  /**
   * 提取参数定义
   */
  private extractParameters(description: string): ApiParameter[] {
    const parameters: ApiParameter[] = [];

    // 查找参数表格 - 更灵活的匹配,支持多种格式
    const patterns = [
      /###\s*Query Parameters[\s\S]*?\n\n([\s\S]*?)(?:\n##|$)/i,
      /##\s*请求参数[\s\S]*?\n\n([\s\S]*?)(?:\n##|$)/i,
      /###\s*请求参数[\s\S]*?\n\n([\s\S]*?)(?:\n##|$)/i
    ];

    let tableContent = '';
    for (const pattern of patterns) {
      const match = description.match(pattern);
      if (match) {
        tableContent = match[1];
        break;
      }
    }

    if (!tableContent) {
      return parameters;
    }

    // 查找表格行
    const lines = tableContent.split('\n');
    let inTable = false;
    let headerFound = false;

    for (const line of lines) {
      // 跳过空行
      if (!line.trim()) continue;

      // 检查是否是表格行
      if (line.includes('|')) {
        // 跳过分隔线
        if (line.includes('---')) {
          inTable = true;
          continue;
        }

        // 跳过表头
        if (!headerFound) {
          headerFound = true;
          continue;
        }

        // 解析数据行
        if (inTable) {
          const cells = line.split('|').map(c => c.trim()).filter(c => c);
          if (cells.length >= 4) {
            parameters.push({
              ParamName: cells[0],
              ParamType: this.mapDataType(cells[1]),
              Required: cells[2] === '是' || cells[2].toLowerCase() === 'true',
              ParamDesc: cells[3],
              ParamIn: 'query'
            });
          }
        }
      } else if (inTable) {
        // 表格结束
        break;
      }
    }

    return parameters;
  }

  /**
   * 提取返回字段
   */
  private extractColumns(description: string): ApiColumn[] {
    const columns: ApiColumn[] = [];

    // 1. 优先从"list 数组元素"部分提取(实际业务数据字段)
    const listFieldMatch = description.match(/####?\s*list\s*数组元素[\s\S]*?\n\n([\s\S]*?)(?:\n\n##|$)/i);
    if (listFieldMatch) {
      const content = listFieldMatch[1];
      const rows = content.split('\n').filter(line => line.includes('|'));

      // 跳过表头和分隔线
      let inTable = false;
      for (const row of rows) {
        if (row.includes('---')) {
          inTable = true;
          continue;
        }
        if (!inTable) continue;

        const cells = row.split('|').map(c => c.trim()).filter(c => c);
        if (cells.length >= 3) {
          columns.push({
            ColumnName: cells[0],
            ColumnType: this.mapDataType(cells[1]),
            ColumnDesc: cells[2]
          });
        }
      }

      if (columns.length > 0) {
        return columns;
      }
    }

    // 2. 从"数据字段说明"或"响应字段"部分提取
    const fieldMatch = description.match(/###?\s*(?:数据字段说明|响应字段|返回字段)[\s\S]*?\n\n([\s\S]*?)(?:\n\n###|$)/);
    if (fieldMatch) {
      const content = fieldMatch[1];
      const rows = content.split('\n').filter(line => line.includes('|'));

      // 跳过表头
      for (let i = 1; i < rows.length; i++) {
        const cells = rows[i].split('|').map(c => c.trim()).filter(c => c);
        if (cells.length >= 3) {
          columns.push({
            ColumnName: cells[0],
            ColumnType: this.mapDataType(cells[1]),
            ColumnDesc: cells[2]
          });
        }
      }
    }

    return columns;
  }

  /**
   * 提取表使用信息
   */
  private extractTableUsages(description: string): ApiTableUsage[] {
    const tableUsages: ApiTableUsage[] = [];

    // 1. 从"表名"或"表结构"部分提取
    // 例如: **表名**: `vb_saas.toll_station`
    const tableNamePattern = /\*\*表名\*\*[：:\s]+`([^`]+)`/i;
    const tableNameMatch = description.match(tableNamePattern);
    if (tableNameMatch) {
      const fullTableName = tableNameMatch[1];
      const parts = fullTableName.split('.');
      if (parts.length === 2) {
        tableUsages.push({
          TableSchema: parts[0],
          TableName: parts[1]
        });
        return tableUsages;
      }
    }

    // 2. 从SQL示例中提取
    // 例如: FROM vb_saas.toll_station
    const fromPattern = /FROM\s+([a-z_]+)\.([a-z_]+)/i;
    const fromMatch = description.match(fromPattern);
    if (fromMatch) {
      tableUsages.push({
        TableSchema: fromMatch[1],
        TableName: fromMatch[2]
      });
      return tableUsages;
    }

    // 3. 从描述中查找表名引用(兜底方案)
    const tableMatches = description.matchAll(/(?:表|table)[：:\s]+`?(\w+)`?/gi);
    for (const match of tableMatches) {
      tableUsages.push({
        TableSchema: 'vb_saas',
        TableName: match[1]
      });
    }

    return tableUsages;
  }

  /**
   * 生成样例SQL语句
   *
   * 根据需求描述生成包含实际值的样例SQL,用于后续参数化处理
   */
  private generateSql(
    description: string,
    tableUsages: ApiTableUsage[],
    columns: ApiColumn[],
    conditions: ApiCondition[]
  ): string {
    // 1. 优先从文档的SQL示例中提取
    const sqlFromDoc = this.extractSqlFromDescription(description);
    if (sqlFromDoc) {
      return sqlFromDoc;
    }

    // 2. 如果没有SQL示例,则自动生成
    if (tableUsages.length === 0) {
      return '';
    }

    // 构建SELECT子句 - 使用数据库字段名(snake_case)
    const selectFields = columns.length > 0
      ? columns.map(c => this.camelToSnake(c.ColumnName)).join(', ')
      : '*';

    // 构建FROM子句
    const fromTable = `${tableUsages[0].TableSchema}.${tableUsages[0].TableName}`;

    // 从描述中提取WHERE条件的样例值
    const whereClause = this.generateWhereClause(description, tableUsages[0]);

    // 从描述中提取ORDER BY子句
    const orderByClause = this.generateOrderByClause(description, columns);

    // 组合SQL
    let sql = `SELECT ${selectFields} FROM ${fromTable}`;
    if (whereClause) {
      sql += ` WHERE ${whereClause}`;
    }
    if (orderByClause) {
      sql += ` ORDER BY ${orderByClause}`;
    }

    return sql;
  }

  /**
   * 从文档中提取SQL示例
   */
  private extractSqlFromDescription(description: string): string | null {
    // 查找SQL代码块
    const sqlPattern = /```sql\s+([\s\S]+?)\s+```/i;
    const match = description.match(sqlPattern);
    if (match) {
      return match[1].trim();
    }
    return null;
  }

  /**
   * 将camelCase转换为snake_case
   */
  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * 生成WHERE子句(包含样例值)
   */
  private generateWhereClause(description: string, mainTable: ApiTableUsage): string {
    const conditions: string[] = [];

    // 1. 从描述中查找查询条件的示例
    // 例如: "收费站编号为STA001" → "station_code = 'STA001'"
    const codePattern = /(?:编号|code)(?:为|是|等于|=)\s*['"]?(\w+)['"]?/i;
    const codeMatch = description.match(codePattern);
    if (codeMatch) {
      conditions.push(`station_code = '${codeMatch[1]}'`);
    }

    // 2. 查找模糊查询条件
    // 例如: "名称包含北京" → "station_name LIKE '%北京%'"
    const namePattern = /(?:名称|name)(?:包含|含有|like)\s*['"]?([^'"，。\n]+)['"]?/i;
    const nameMatch = description.match(namePattern);
    if (nameMatch) {
      const value = nameMatch[1].trim();
      conditions.push(`station_name LIKE '%${value}%'`);
    }

    // 3. 查找道路名称条件
    const roadPattern = /(?:道路|road)(?:名称|name)?(?:为|是|包含|=)\s*['"]?([^'"，。\n]+)['"]?/i;
    const roadMatch = description.match(roadPattern);
    if (roadMatch) {
      const value = roadMatch[1].trim();
      if (value.includes('包含') || description.includes('模糊')) {
        conditions.push(`road_name LIKE '%${value}%'`);
      } else {
        conditions.push(`road_name = '${value}'`);
      }
    }

    // 4. 默认添加deleted = false条件
    conditions.push('deleted = false');

    return conditions.join(' AND ');
  }

  /**
   * 生成ORDER BY子句
   */
  private generateOrderByClause(description: string, columns: ApiColumn[]): string {
    // 1. 从描述中查找排序规则
    // 例如: "按收费站编号升序排列" → "station_code"
    const orderPattern = /按\s*([^\s，。]+)\s*(?:升序|降序|排序|排列)/;
    const orderMatch = description.match(orderPattern);
    if (orderMatch) {
      const fieldName = orderMatch[1];
      // 转换为数据库字段名
      const dbFieldName = this.convertToDbFieldName(fieldName);

      // 检查是否降序
      const isDesc = description.includes('降序');
      return isDesc ? `${dbFieldName} DESC` : dbFieldName;
    }

    // 2. 默认按第一个字段排序(如果有字段定义)
    if (columns.length > 0) {
      // 优先使用code或id字段
      const codeColumn = columns.find(c =>
        c.ColumnName.toLowerCase().includes('code') ||
        c.ColumnName.toLowerCase().includes('id')
      );
      if (codeColumn) {
        return codeColumn.ColumnName;
      }
      return columns[0].ColumnName;
    }

    return '';
  }

  /**
   * 将中文字段名转换为数据库字段名
   */
  private convertToDbFieldName(chineseName: string): string {
    const fieldMap: Record<string, string> = {
      '收费站编号': 'station_code',
      '收费站名称': 'station_name',
      '道路名称': 'road_name',
      '编号': 'code',
      '名称': 'name',
      '创建时间': 'created_at',
      '更新时间': 'updated_at'
    };

    return fieldMap[chineseName] || chineseName;
  }

  /**
   * 映射数据类型
   */
  private mapDataType(type: string): string {
    const typeMap: Record<string, string> = {
      'string': 'string',
      'number': 'int',
      'integer': 'int',
      'boolean': 'bool',
      'bool': 'bool',
      'array': 'jsonarray',
      'object': 'jsonobject',
      'date': 'datetime',
      'datetime': 'datetime',
      'timestamp': 'timestamp'
    };

    const lowerType = type.toLowerCase().trim();
    return typeMap[lowerType] || 'string';
  }
}

