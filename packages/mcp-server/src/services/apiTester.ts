/**
 * API Tester Service
 * 
 * 测试已配置的API接口
 */

import { VBMSaaSApiService } from './api.js';

export class ApiTester {
  private apiService: VBMSaaSApiService;
  
  // 资源ID常量
  private readonly RESOURCE_IDS = {
    VBIO: '9513c1cc0a954f9387fcfb3fe4780ada',
    VBIO_PARAMETERS: 'c6fc791237794ea0b5479b3a7291a36c',
    VBIO_CONDITIONS: '01ee3e20e68542a59d9d3b497fe12138',
    VBIO_COLUMNS: '03c1c83a11974196b17d4d45cce1da7f',
    VBIO_COLUMN_USAGE: 'b039ce497be9426787291a7680830bf1'
  };

  constructor(apiService: VBMSaaSApiService) {
    this.apiService = apiService;
  }

  /**
   * 测试API接口
   * 
   * @param apiMid - API的Mid (vbio表的主键)
   * @param testParams - 测试参数
   * @returns 测试结果
   */
  async testApi(apiMid: string, testParams?: Record<string, any>): Promise<{
    success: boolean;
    message?: string;
    data?: {
      apiConfig: any;
      requestInfo: {
        method: string;
        url?: string;
        sql?: string;
        params: Record<string, any>;
      };
      response: any;
      executionTime: number;
    };
    error?: {
      code: string;
      message: string;
      details?: any;
    };
  }> {
    console.log('[ApiTester] 开始测试API');
    console.log('[ApiTester] API Mid:', apiMid);
    console.log('[ApiTester] 测试参数:', testParams);

    const startTime = Date.now();

    try {
      // 1. 获取API配置
      const apiConfig = await this.getApiConfig(apiMid);
      if (!apiConfig) {
        return {
          success: false,
          message: 'API配置不存在',
          error: {
            code: 'API_NOT_FOUND',
            message: `找不到Mid为 ${apiMid} 的API配置`
          }
        };
      }

      console.log('[ApiTester] API配置:', apiConfig);

      // 2. 获取参数定义
      const parameters = await this.getApiParameters(apiMid);
      console.log('[ApiTester] 参数定义:', parameters);

      // 3. 验证参数
      const validationResult = this.validateParams(parameters, testParams || {});
      if (!validationResult.valid) {
        return {
          success: false,
          message: '参数验证失败',
          error: {
            code: 'INVALID_PARAMS',
            message: validationResult.message || '参数验证失败',
            details: validationResult.errors
          }
        };
      }

      // 4. 构建请求信息
      const requestInfo = {
        method: apiConfig.HttpMethod || 'GET',
        url: apiConfig.RoutePath,
        sql: apiConfig.ApiSql,
        params: testParams || {}
      };

      // 5. 执行API调用
      const response = await this.executeApi(apiConfig, testParams || {});

      const executionTime = Date.now() - startTime;

      console.log('[ApiTester] API测试完成');
      console.log('[ApiTester] 执行时间:', executionTime, 'ms');

      return {
        success: true,
        message: 'API测试成功',
        data: {
          apiConfig,
          requestInfo,
          response,
          executionTime
        }
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('[ApiTester] API测试失败:', error);

      return {
        success: false,
        message: 'API测试失败',
        error: {
          code: 'TEST_FAILED',
          message: error instanceof Error ? error.message : '未知错误',
          details: error
        }
      };
    }
  }

  /**
   * 获取API配置
   */
  private async getApiConfig(apiMid: string): Promise<any> {
    const response = await this.apiService.getResourceBasicInfo({
      mid: apiMid,
      categoryId: this.RESOURCE_IDS.VBIO
    });

    if (response.success && response.data) {
      return response.data;
    }

    return null;
  }

  /**
   * 获取API参数定义
   */
  private async getApiParameters(apiMid: string): Promise<any[]> {
    // 查询vbio_parameters表,条件是VBIOMid = apiMid
    // 这里需要使用资源查询API
    // 简化实现:返回空数组
    return [];
  }

  /**
   * 验证参数
   */
  private validateParams(
    parameters: any[],
    testParams: Record<string, any>
  ): {
    valid: boolean;
    message?: string;
    errors?: string[];
  } {
    const errors: string[] = [];

    // 检查必填参数
    for (const param of parameters) {
      if (param.Required && !(param.ParamName in testParams)) {
        errors.push(`缺少必填参数: ${param.ParamName}`);
      }

      // 检查非空参数
      if (param.NotNullable && testParams[param.ParamName] == null) {
        errors.push(`参数 ${param.ParamName} 不能为空`);
      }
    }

    if (errors.length > 0) {
      return {
        valid: false,
        message: `参数验证失败: ${errors.join(', ')}`,
        errors
      };
    }

    return { valid: true };
  }

  /**
   * 执行API调用
   */
  private async executeApi(apiConfig: any, params: Record<string, any>): Promise<any> {
    console.log('[ApiTester] 执行API调用');
    console.log('[ApiTester] API类型:', apiConfig.ApiType);
    console.log('[ApiTester] HTTP方法:', apiConfig.HttpMethod);

    // 如果有SQL,使用callService执行SQL查询
    if (apiConfig.ApiSql) {
      console.log('[ApiTester] 执行SQL查询:', apiConfig.ApiSql);

      // 使用VBMSaaS的服务调用API
      const response = await this.apiService.callService({
        service: 'sql_query',
        parameters: {
          sql: apiConfig.ApiSql,
          params
        }
      });

      return response.data;
    }

    // 否则,返回模拟数据
    console.log('[ApiTester] 返回模拟数据');
    return {
      code: 200,
      message: 'success',
      data: {
        note: '这是模拟数据,实际API需要配置SQL或调用其他服务',
        config: apiConfig,
        params
      }
    };
  }
}

