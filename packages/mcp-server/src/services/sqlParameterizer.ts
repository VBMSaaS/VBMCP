/**
 * SQL Parameterizer Service
 * 
 * 将样例SQL中的实际值替换为参数占位符,并自动推断参数名和类型
 */

import { ApiParameter } from '../types.js';

/**
 * SQL中识别出的参数值
 */
interface DetectedValue {
  value: string;           // 原始值,如 'STA001' 或 100
  quotedValue: string;     // 在SQL中的完整形式,如 'STA001'
  position: number;        // 在SQL中的位置
  type: 'string' | 'number' | 'boolean';  // 推断的类型
  context: string;         // 上下文,如 "station_code = 'STA001'"
  fieldName?: string;      // 关联的字段名,如 station_code
}

/**
 * 参数化结果
 */
export interface ParameterizationResult {
  parameterizedSql: string;   // 参数化后的SQL
  parameters: ApiParameter[];  // 提取的参数定义
  mapping: Record<string, string>;  // 值到参数名的映射
  warnings?: string[];        // 警告信息(需要用户确认的情况)
  suggestions?: string[];     // 建议信息
}

export class SqlParameterizer {
  /**
   * 参数化SQL语句
   * 
   * @param sql - 包含实际值的样例SQL
   * @param declaredParams - 从需求文档中声明的参数(可选)
   * @returns 参数化结果
   */
  parameterizeSql(sql: string, declaredParams?: ApiParameter[]): ParameterizationResult {
    console.log('[SqlParameterizer] 开始参数化SQL');
    console.log('[SqlParameterizer] 原始SQL长度:', sql.length);

    // 0. 检测复杂SQL并生成警告
    const { warnings, suggestions } = this.validateSql(sql);

    // 1. 检测SQL中的所有参数值
    const detectedValues = this.detectValues(sql);
    console.log('[SqlParameterizer] 检测到参数值数量:', detectedValues.length);

    // 2. 为每个值生成参数名
    const valueToParamMap = this.generateParameterNames(detectedValues, declaredParams);
    console.log('[SqlParameterizer] 生成参数映射:', valueToParamMap);

    // 3. 替换SQL中的值为占位符
    let parameterizedSql = sql;
    const parameters: ApiParameter[] = [];
    const paramSet = new Set<string>();

    // 按位置倒序替换,避免位置偏移
    const sortedValues = [...detectedValues].sort((a, b) => b.position - a.position);

    for (const detected of sortedValues) {
      const paramName = valueToParamMap[detected.value];
      if (!paramName) continue;

      // 替换为占位符
      const placeholder = this.createPlaceholder(paramName, detected.type);
      const before = parameterizedSql.substring(0, detected.position);
      const after = parameterizedSql.substring(detected.position + detected.quotedValue.length);
      parameterizedSql = before + placeholder + after;

      // 添加参数定义(去重)
      if (!paramSet.has(paramName)) {
        paramSet.add(paramName);
        parameters.push(this.createParameterDefinition(paramName, detected, declaredParams));
      }
    }

    console.log('[SqlParameterizer] 参数化完成,参数数量:', parameters.length);

    return {
      parameterizedSql,
      parameters,
      mapping: valueToParamMap,
      warnings: warnings.length > 0 ? warnings : undefined,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    };
  }

  /**
   * 验证SQL复杂度并生成警告
   */
  private validateSql(sql: string): { warnings: string[]; suggestions: string[] } {
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // 检测子查询
    if (sql.match(/\(\s*SELECT/i)) {
      warnings.push('检测到子查询,参数提取可能不完整');
      suggestions.push('建议:确认子查询中的参数值是否需要参数化');
    }

    // 检测复杂JOIN
    const joinCount = (sql.match(/\bJOIN\b/gi) || []).length;
    if (joinCount > 2) {
      warnings.push(`检测到${joinCount}个JOIN,SQL较为复杂`);
      suggestions.push('建议:确认JOIN条件中的参数值是否正确识别');
    }

    // 检测CASE WHEN
    if (sql.match(/\bCASE\s+WHEN\b/i)) {
      warnings.push('检测到CASE WHEN语句');
      suggestions.push('建议:确认CASE WHEN中的条件值是否需要参数化');
    }

    // 检测函数调用中的参数
    if (sql.match(/\w+\([^)]*['"][^'"]+['"]/)) {
      warnings.push('检测到函数调用中包含字符串值');
      suggestions.push('建议:确认函数参数是否需要参数化(如日期格式化、字符串处理等)');
    }

    // 检测数组/IN子句
    if (sql.match(/\bIN\s*\(/i) || sql.match(/ANY\s*\(/i)) {
      warnings.push('检测到IN或ANY子句');
      suggestions.push('建议:确认数组参数的格式是否正确(如 #{paramName}::type[])');
    }

    return { warnings, suggestions };
  }

  /**
   * 检测SQL中的参数值
   */
  private detectValues(sql: string): DetectedValue[] {
    const values: DetectedValue[] = [];

    // 1. 检测字符串值 (单引号)
    const stringRegex = /'([^']*)'/g;
    let match;
    while ((match = stringRegex.exec(sql)) !== null) {
      const value = match[1];
      const quotedValue = match[0];
      const position = match.index;
      
      // 提取上下文(前后30个字符)
      const contextStart = Math.max(0, position - 30);
      const contextEnd = Math.min(sql.length, position + quotedValue.length + 30);
      const context = sql.substring(contextStart, contextEnd);

      // 尝试提取字段名
      const fieldName = this.extractFieldName(sql, position);

      values.push({
        value,
        quotedValue,
        position,
        type: 'string',
        context,
        fieldName
      });
    }

    // 2. 检测数字值 (在WHERE/HAVING子句中)
    const numberRegex = /\b(\d+(?:\.\d+)?)\b/g;
    const whereMatch = sql.match(/\b(WHERE|HAVING)\b/i);
    if (whereMatch) {
      const whereStart = sql.indexOf(whereMatch[0]);
      const whereClause = sql.substring(whereStart);
      
      while ((match = numberRegex.exec(whereClause)) !== null) {
        const value = match[1];
        const position = whereStart + match.index;
        
        // 排除在函数调用中的数字(如 ROUND(..., 0))
        if (this.isInFunctionCall(sql, position)) {
          continue;
        }

        const contextStart = Math.max(0, position - 30);
        const contextEnd = Math.min(sql.length, position + value.length + 30);
        const context = sql.substring(contextStart, contextEnd);
        const fieldName = this.extractFieldName(sql, position);

        values.push({
          value,
          quotedValue: value,
          position,
          type: 'number',
          context,
          fieldName
        });
      }
    }

    return values;
  }

  /**
   * 提取字段名
   */
  private extractFieldName(sql: string, valuePosition: number): string | undefined {
    // 向前查找最近的字段名 (格式: field_name = 或 field_name LIKE)
    const before = sql.substring(Math.max(0, valuePosition - 100), valuePosition);
    const fieldMatch = before.match(/(\w+)\s*(?:=|LIKE|IN|>|<|>=|<=|!=)\s*$/i);
    return fieldMatch ? fieldMatch[1] : undefined;
  }

  /**
   * 判断位置是否在函数调用中
   */
  private isInFunctionCall(sql: string, position: number): boolean {
    // 向前查找最近的左括号和函数名
    const before = sql.substring(Math.max(0, position - 50), position);
    const funcMatch = before.match(/\w+\s*\([^)]*$/);
    return !!funcMatch;
  }

  /**
   * 生成参数名
   */
  private generateParameterNames(
    detectedValues: DetectedValue[],
    declaredParams?: ApiParameter[]
  ): Record<string, string> {
    const mapping: Record<string, string> = {};
    const usedNames = new Set<string>();

    for (const detected of detectedValues) {
      // 1. 优先使用声明的参数名
      if (declaredParams) {
        const declared = declaredParams.find(p =>
          p.ParamName && this.matchesValue(p, detected)
        );
        if (declared && declared.ParamName) {
          mapping[detected.value] = declared.ParamName;
          usedNames.add(declared.ParamName);
          continue;
        }
      }

      // 2. 从字段名推断参数名
      if (detected.fieldName) {
        const paramName = this.fieldNameToParamName(detected.fieldName);
        const uniqueName = this.ensureUniqueName(paramName, usedNames);
        mapping[detected.value] = uniqueName;
        usedNames.add(uniqueName);
        continue;
      }

      // 3. 使用默认参数名
      const defaultName = this.ensureUniqueName('param', usedNames);
      mapping[detected.value] = defaultName;
      usedNames.add(defaultName);
    }

    return mapping;
  }

  /**
   * 字段名转参数名 (snake_case → camelCase)
   */
  private fieldNameToParamName(fieldName: string): string {
    // 移除引号和schema前缀
    let name = fieldName.replace(/['"]/g, '').replace(/^\w+\./, '');

    // snake_case 转 camelCase
    return name.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * 确保参数名唯一
   */
  private ensureUniqueName(baseName: string, usedNames: Set<string>): string {
    let name = baseName;
    let counter = 1;
    while (usedNames.has(name)) {
      name = `${baseName}${counter}`;
      counter++;
    }
    return name;
  }

  /**
   * 判断声明的参数是否匹配检测到的值
   */
  private matchesValue(param: ApiParameter, detected: DetectedValue): boolean {
    // 简单匹配:参数名与字段名相关
    if (detected.fieldName && param.ParamName) {
      const paramLower = param.ParamName.toLowerCase();
      const fieldLower = detected.fieldName.toLowerCase().replace(/_/g, '');
      return paramLower === fieldLower || fieldLower.includes(paramLower);
    }
    return false;
  }

  /**
   * 创建占位符
   */
  private createPlaceholder(paramName: string, type: 'string' | 'number' | 'boolean'): string {
    // 基本格式: #{paramName}
    // 如果需要类型转换,可以扩展为: #{paramName}::type
    return `#{${paramName}}`;
  }

  /**
   * 创建参数定义
   */
  private createParameterDefinition(
    paramName: string,
    detected: DetectedValue,
    declaredParams?: ApiParameter[]
  ): ApiParameter {
    // 优先使用声明的参数定义
    if (declaredParams) {
      const declared = declaredParams.find(p => p.ParamName === paramName);
      if (declared) {
        return declared;
      }
    }

    // 自动生成参数定义
    return {
      ParamName: paramName,
      ParamType: this.mapType(detected.type),
      Required: false,  // 默认非必填
      ParamDesc: `从SQL推断的参数 (字段: ${detected.fieldName || '未知'})`,
      ParamIn: 'query',
      ArrayType: false,
      NotNullable: false
    };
  }

  /**
   * 映射类型
   */
  private mapType(type: 'string' | 'number' | 'boolean'): string {
    const typeMap: Record<string, string> = {
      'string': 'string',
      'number': 'int',
      'boolean': 'bool'
    };
    return typeMap[type] || 'string';
  }
}

