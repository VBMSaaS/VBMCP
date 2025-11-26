/**
 * API Configuration Saver Service
 * 
 * 将解析的API配置保存到VBMSaaS资源数据库
 */

import { ParsedApiConfig } from '../types.js';
import { VBMSaaSApiService } from './api.js';

export class ApiConfigSaver {
  private apiService: VBMSaaSApiService;
  private userid: string | null = null;

  // 资源typeName常量 (用于category参数)
  private readonly RESOURCE_NAMES = {
    VBIO: 'E9E0821DA2AF2F84-vbio',  // vbio的typeName
    VBIO_PARAMETERS: '5FE8EE8DB6890877-vbio_parameters',  // vbio_parameters的typeName
    VBIO_CONDITIONS: '612F85E52FEB1B64-vbio_conditions',  // vbio_conditions的typeName
    VBIO_COLUMNS: 'E25E49F06DA09BC7-vbio_columns',  // vbio_columns的typeName
    VBIO_COLUMN_USAGE: '9BE9D4B3321E3DEC-vbio_column_usage'  // vbio_column_usage的typeName
  };

  constructor(apiService: VBMSaaSApiService, userid?: string) {
    this.apiService = apiService;
    this.userid = userid || null;
  }

  /**
   * 从JWT token中提取userid
   */
  private extractUserIdFromToken(token: string): string | null {
    try {
      // JWT token格式: header.payload.signature
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      // 解码payload (base64)
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      return payload.userId || payload.id || null;
    } catch (error) {
      console.error('[ApiConfigSaver] 解析token失败:', error);
      return null;
    }
  }

  /**
   * 保存API配置到数据库
   * 
   * @param config - 解析后的API配置
   * @param partitionId - 分区ID
   * @returns 保存结果,包含创建的记录信息
   */
  async saveConfig(config: ParsedApiConfig, partitionId: string): Promise<{
    vbioMid: string;
    vbio: any;
    parameters: any[];
    conditions: any[];
    columns: any[];
    tableUsages: any[];
  }> {
    console.log('[ApiConfigSaver] 开始保存API配置');
    console.log('[ApiConfigSaver] API名称:', config.name);
    console.log('[ApiConfigSaver] 分区ID:', partitionId);

    // 1. 创建vbio记录
    const vbioResult = await this.saveVbio(config, partitionId);
    const vbioMid = vbioResult.mid;
    
    console.log('[ApiConfigSaver] vbio记录已创建, Mid:', vbioMid);

    // 2. 保存参数
    const parameters = await this.saveParameters(config, vbioMid, partitionId);
    console.log('[ApiConfigSaver] 参数已保存, 数量:', parameters.length);

    // 3. 保存条件
    const conditions = await this.saveConditions(config, vbioMid, partitionId);
    console.log('[ApiConfigSaver] 条件已保存, 数量:', conditions.length);

    // 4. 保存返回字段
    const columns = await this.saveColumns(config, vbioMid, partitionId);
    console.log('[ApiConfigSaver] 返回字段已保存, 数量:', columns.length);

    // 5. 保存表使用信息
    const tableUsages = await this.saveTableUsages(config, vbioMid, partitionId);
    console.log('[ApiConfigSaver] 表使用信息已保存, 数量:', tableUsages.length);

    console.log('[ApiConfigSaver] API配置保存完成');

    return {
      vbioMid,
      vbio: vbioResult,
      parameters,
      conditions,
      columns,
      tableUsages
    };
  }

  /**
   * 保存vbio基本信息
   */
  private async saveVbio(config: ParsedApiConfig, partitionId: string): Promise<any> {
    console.log('[ApiConfigSaver] ========================================');
    console.log('[ApiConfigSaver] 开始保存vbio记录');
    console.log('[ApiConfigSaver] ========================================');

    const data = {
      Name: config.name,
      Description: config.description,
      ApiType: config.apiType || 'query',
      HttpMethod: config.httpMethod,
      RoutePath: config.routePath,
      ResultType: config.resultType || 'json',
      AuthType: config.authType || 'token',
      ApiSql: config.apiSql || '',
      ApiSqlOrderBy: config.apiSqlOrderBy || '',
      CountSql: config.countSql || '',
      ApiResponseWrapper: config.apiResponseWrapper || '',
      _PartId: partitionId
    };

    console.log('[ApiConfigSaver] vbio数据:', JSON.stringify(data, null, 2));
    console.log('[ApiConfigSaver] 资源名称:', this.RESOURCE_NAMES.VBIO);
    console.log('[ApiConfigSaver] 分区ID:', partitionId);
    console.log('[ApiConfigSaver] 用户ID:', this.userid);

    const response = await this.apiService.addResourceData({
      categoryId: this.RESOURCE_NAMES.VBIO,
      data,
      partitionId,
      userid: this.userid || undefined
    });

    console.log('[ApiConfigSaver] vbio保存响应:', JSON.stringify(response, null, 2));

    if (!response.success) {
      throw new Error(`保存vbio失败: ${response.message}`);
    }

    console.log('[ApiConfigSaver] ✅ vbio保存成功, Mid:', response.mid);

    // 返回完整的response对象,包含mid
    return response;
  }

  /**
   * 保存参数定义
   */
  private async saveParameters(config: ParsedApiConfig, vbioMid: string, partitionId: string): Promise<any[]> {
    if (!config.parameters || config.parameters.length === 0) {
      return [];
    }

    const results = [];
    for (const param of config.parameters) {
      const data = {
        Name: param.ParamName,
        ParamName: param.ParamName,
        ParamType: param.ParamType,
        ArrayType: param.ArrayType || false,
        Required: param.Required || false,
        NotNullable: param.NotNullable || false,
        ParamDefault: param.ParamDefault || '',
        ParamIn: param.ParamIn || 'query',
        ValidationRule: param.ValidationRule || '',
        ParamDesc: param.ParamDesc || '',
        VBIOMid: vbioMid,
        _PartId: partitionId
      };

      const response = await this.apiService.addResourceData({
        categoryId: this.RESOURCE_NAMES.VBIO_PARAMETERS,
        data,
        partitionId,
        userid: this.userid || undefined
      });

      if (response.success) {
        results.push(response.data);
      }
    }

    return results;
  }

  /**
   * 保存查询条件
   */
  private async saveConditions(config: ParsedApiConfig, vbioMid: string, partitionId: string): Promise<any[]> {
    if (!config.conditions || config.conditions.length === 0) {
      return [];
    }

    const results = [];
    for (let i = 0; i < config.conditions.length; i++) {
      const cond = config.conditions[i];
      const data = {
        Name: `条件${i + 1}`,
        CondStatement: cond.CondStatement,
        CondConnector: cond.CondConnector || 'AND',
        OpenParenthesis: cond.OpenParenthesis || '',
        CloseParenthesis: cond.CloseParenthesis || '',
        ParamName: cond.ParamName || '',
        OrderNo: cond.OrderNo || i,
        VBIOMid: vbioMid,
        _PartId: partitionId
      };

      const response = await this.apiService.addResourceData({
        categoryId: this.RESOURCE_NAMES.VBIO_CONDITIONS,
        data,
        partitionId,
        userid: this.userid || undefined
      });

      if (response.success) {
        results.push(response.data);
      }
    }

    return results;
  }

  /**
   * 保存返回字段定义
   */
  private async saveColumns(config: ParsedApiConfig, vbioMid: string, partitionId: string): Promise<any[]> {
    if (!config.columns || config.columns.length === 0) {
      return [];
    }

    const results = [];
    for (const col of config.columns) {
      const data = {
        Name: col.ColumnName,
        ColumnName: col.ColumnName,
        ColumnDesc: col.ColumnDesc || '',
        ColumnType: col.ColumnType,
        ArrayType: col.ArrayType || false,
        ColumnFormat: col.ColumnFormat || '',
        VBIOMid: vbioMid,
        _PartId: partitionId
      };

      const response = await this.apiService.addResourceData({
        categoryId: this.RESOURCE_NAMES.VBIO_COLUMNS,
        data,
        partitionId,
        userid: this.userid || undefined
      });

      if (response.success) {
        results.push(response.data);
      }
    }

    return results;
  }

  /**
   * 保存表使用信息
   */
  private async saveTableUsages(config: ParsedApiConfig, vbioMid: string, partitionId: string): Promise<any[]> {
    if (!config.tableUsages || config.tableUsages.length === 0) {
      return [];
    }

    const results = [];
    for (const table of config.tableUsages) {
      const data = {
        Name: table.TableName,
        TableSchema: table.TableSchema,
        TableName: table.TableName,
        ResourceId: table.ResourceId || '',
        ColumnId: table.ColumnId || 0,
        VBIOMid: vbioMid,
        _PartId: partitionId
      };

      const response = await this.apiService.addResourceData({
        categoryId: this.RESOURCE_NAMES.VBIO_COLUMN_USAGE,
        data,
        partitionId,
        userid: this.userid || undefined
      });

      if (response.success) {
        results.push(response.data);
      }
    }

    return results;
  }
}
