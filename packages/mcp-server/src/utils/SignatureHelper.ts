/**
 * Signature Helper
 * 
 * 基于 VBMSaaS 平台的签名策略实现
 * 使用 HMAC-SHA1 算法对请求进行签名
 */

import crypto from 'crypto';

export class SignatureHelper {
  /**
   * 默认跳过的参数键
   */
  private static readonly DEFAULT_SKIPS = ["Sign", "Signature"];

  /**
   * 额外跳过的参数键
   */
  private static skipKeys: string[] = [];

  /**
   * 设置额外跳过的参数键
   */
  static setSkipKeys(keys: string[]): void {
    this.skipKeys = keys;
  }

  /**
   * 生成签名
   * 
   * @param queryParams - 查询参数对象
   * @param bodyParams - Body 参数对象
   * @param epochMilli - 时间戳（毫秒）
   * @param methodName - HTTP 方法名（GET, POST, PUT, DELETE 等）
   * @param secretKey - 签名密钥
   * @returns Base64 编码的签名字符串
   */
  static sign(
    queryParams: Record<string, any> | null,
    bodyParams: Record<string, any> | null,
    epochMilli: number,
    methodName: string,
    secretKey: string
  ): string {
    let queryString = "";
    if (queryParams) {
      queryString = this.canonicalizeQueryParams(queryParams);
    }

    let bodyString = "";
    if (bodyParams) {
      bodyString = this.canonicalizeBodyParams(bodyParams);
    }

    const signStr = methodName + "&" +
      this.specialUrlEncode("/") + "&" +
      this.specialUrlEncode(queryString) + "&" +
      this.specialUrlEncode(bodyString) + "&" +
      epochMilli;

    return this.signature(this.specialUrlEncode(signStr), secretKey);
  }

  /**
   * HMAC-SHA1 签名
   * 
   * @param stringToSign - 待签名字符串
   * @param secretKey - 签名密钥
   * @returns Base64 编码的签名
   */
  private static signature(stringToSign: string, secretKey: string): string {
    const hmac = crypto.createHmac('sha1', secretKey + "&");
    hmac.update(stringToSign);
    return hmac.digest('base64');
  }

  /**
   * 规范化查询参数
   *
   * @param queryParams - 查询参数对象
   * @returns 规范化后的查询字符串
   */
  private static canonicalizeQueryParams(queryParams: Record<string, any>): string {
    const sortSet = this.sortQueryParams(queryParams);
    let sortQueryString = "";

    for (const key in sortSet) {
      if (this.DEFAULT_SKIPS.indexOf(key) > -1 ||
          (this.skipKeys && this.skipKeys.indexOf(key) > -1)) {
        continue;
      }

      if (sortQueryString.length > 0) {
        sortQueryString += "&";
      }
      sortQueryString += `${this.specialUrlEncode(key)}=${this.specialUrlEncode(sortSet[key])}`;
    }

    return sortQueryString;
  }

  /**
   * 规范化 Body 参数
   * 
   * @param bodyParams - Body 参数对象
   * @returns 规范化后的参数字符串
   */
  private static canonicalizeBodyParams(bodyParams: Record<string, any>): string {
    const sortSet = this.sortQueryParams(bodyParams);
    let sortQueryString = "";

    for (const key in sortSet) {
      if (this.DEFAULT_SKIPS.indexOf(key) > -1 || 
          (this.skipKeys && this.skipKeys.indexOf(key) > -1)) {
        continue;
      }

      if (sortQueryString.length > 0) {
        sortQueryString += "&";
      }
      sortQueryString += `${this.specialUrlEncode(key)}=${this.specialUrlEncode(sortSet[key])}`;
    }

    return sortQueryString;
  }

  /**
   * 特殊 URL 编码
   * 
   * @param value - 待编码的字符串
   * @returns 编码后的字符串
   */
  private static specialUrlEncode(value: string): string {
    if (!value || value.length === 0) {
      return "";
    }
    return encodeURIComponent(value).replace(/\*/g, "%2A");
  }

  /**
   * 排序参数
   * 
   * @param queryParams - 参数对象
   * @returns 排序后的参数对象
   */
  private static sortQueryParams(queryParams: Record<string, any>): Record<string, string> {
    const keys = Object.keys(queryParams).sort();
    const result: Record<string, string> = {};

    keys.forEach(key => {
      const value = queryParams[key];
      if (value == null || value === undefined) {
        result[key] = "";
      } else if (typeof value === 'object') {
        result[key] = JSON.stringify(value).trim();
      } else {
        result[key] = String(value).trim();
      }
    });

    return result;
  }
}

