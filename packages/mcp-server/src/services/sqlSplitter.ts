/**
 * SQL Splitter Service
 * 
 * 将参数化后的SQL拆分为主SQL、WHERE条件数组、ORDER BY子句
 */

import { ApiCondition } from '../types.js';

/**
 * SQL拆分结果
 */
export interface SplitResult {
  mainSql: string;              // 主查询SQL(不含WHERE和ORDER BY)
  conditions: ApiCondition[];   // WHERE条件数组
  orderBy: string;              // ORDER BY子句
  hasWhere: boolean;            // 是否有WHERE子句
  hasOrderBy: boolean;          // 是否有ORDER BY子句
}

export class SqlSplitter {
  /**
   * 拆分SQL语句
   * 
   * @param sql - 参数化后的SQL语句
   * @returns 拆分结果
   */
  splitSql(sql: string): SplitResult {
    console.log('[SqlSplitter] 开始拆分SQL');
    console.log('[SqlSplitter] SQL长度:', sql.length);

    // 1. 提取ORDER BY子句
    const { mainPart, orderBy, hasOrderBy } = this.extractOrderBy(sql);
    console.log('[SqlSplitter] ORDER BY:', orderBy || '无');

    // 2. 提取WHERE子句
    const { selectPart, whereClause, hasWhere } = this.extractWhere(mainPart);
    console.log('[SqlSplitter] WHERE子句长度:', whereClause.length);

    // 3. 解析WHERE条件为数组
    const conditions = hasWhere ? this.parseConditions(whereClause) : [];
    console.log('[SqlSplitter] 条件数量:', conditions.length);

    return {
      mainSql: selectPart.trim(),
      conditions,
      orderBy: orderBy.trim(),
      hasWhere,
      hasOrderBy
    };
  }

  /**
   * 提取ORDER BY子句
   */
  private extractOrderBy(sql: string): {
    mainPart: string;
    orderBy: string;
    hasOrderBy: boolean;
  } {
    // 查找最后一个ORDER BY (不在子查询中)
    const orderByRegex = /\bORDER\s+BY\s+(.+?)$/is;
    const match = sql.match(orderByRegex);

    if (match) {
      const orderByStart = sql.lastIndexOf(match[0]);
      return {
        mainPart: sql.substring(0, orderByStart).trim(),
        orderBy: match[0].trim(),
        hasOrderBy: true
      };
    }

    return {
      mainPart: sql,
      orderBy: '',
      hasOrderBy: false
    };
  }

  /**
   * 提取WHERE子句
   */
  private extractWhere(sql: string): {
    selectPart: string;
    whereClause: string;
    hasWhere: boolean;
  } {
    // 查找WHERE关键字位置
    const whereRegex = /\bWHERE\b/i;
    const match = sql.match(whereRegex);

    if (!match || match.index === undefined) {
      return {
        selectPart: sql,
        whereClause: '',
        hasWhere: false
      };
    }

    const whereStart = match.index;
    const selectPart = sql.substring(0, whereStart).trim();
    const whereClause = sql.substring(whereStart + 5).trim(); // 跳过 "WHERE"

    return {
      selectPart,
      whereClause,
      hasWhere: true
    };
  }

  /**
   * 解析WHERE条件为数组
   */
  private parseConditions(whereClause: string): ApiCondition[] {
    console.log('[SqlSplitter] 开始解析WHERE条件');
    
    const conditions: ApiCondition[] = [];
    
    // 按AND/OR分割条件
    const tokens = this.tokenizeConditions(whereClause);
    console.log('[SqlSplitter] 分词结果:', tokens.length, '个token');

    let currentCondition = '';
    let openParenthesis = '';
    let closeParenthesis = '';
    let connector = 'AND';
    let orderNo = 0;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i].trim();
      
      if (!token) continue;

      // 检查是否是连接符
      if (token.toUpperCase() === 'AND' || token.toUpperCase() === 'OR') {
        // 保存当前条件
        if (currentCondition) {
          const paramName = this.extractParamName(currentCondition);
          conditions.push({
            CondStatement: currentCondition.trim(),
            CondConnector: connector,
            OpenParenthesis: openParenthesis,
            CloseParenthesis: closeParenthesis,
            ParamName: paramName || '',
            OrderNo: orderNo++
          });
          
          currentCondition = '';
          openParenthesis = '';
          closeParenthesis = '';
        }
        
        connector = token.toUpperCase();
        continue;
      }

      // 检查开括号
      const openMatch = token.match(/^(\(+)/);
      if (openMatch) {
        openParenthesis = openMatch[1];
      }

      // 检查闭括号
      const closeMatch = token.match(/(\)+)$/);
      if (closeMatch) {
        closeParenthesis = closeMatch[1];
      }

      // 累积条件语句
      if (currentCondition) {
        currentCondition += ' ' + token;
      } else {
        currentCondition = token;
      }
    }

    // 保存最后一个条件
    if (currentCondition) {
      const paramName = this.extractParamName(currentCondition);
      conditions.push({
        CondStatement: currentCondition.trim(),
        CondConnector: connector,
        OpenParenthesis: openParenthesis,
        CloseParenthesis: closeParenthesis,
        ParamName: paramName || '',
        OrderNo: orderNo
      });
    }

    console.log('[SqlSplitter] 解析完成,条件数量:', conditions.length);
    return conditions;
  }

  /**
   * 分词WHERE条件
   * 将WHERE子句按AND/OR分割,同时保留括号
   */
  private tokenizeConditions(whereClause: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let inString = false;
    let stringChar = '';
    let depth = 0; // 括号深度

    for (let i = 0; i < whereClause.length; i++) {
      const char = whereClause[i];
      const nextChars = whereClause.substring(i, i + 4).toUpperCase();

      // 处理字符串
      if ((char === "'" || char === '"') && whereClause[i - 1] !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
        current += char;
        continue;
      }

      // 在字符串内,直接添加
      if (inString) {
        current += char;
        continue;
      }

      // 处理括号
      if (char === '(') {
        depth++;
        current += char;
        continue;
      }
      if (char === ')') {
        depth--;
        current += char;
        continue;
      }

      // 只在顶层分割AND/OR
      if (depth === 0) {
        if (nextChars.startsWith('AND ')) {
          if (current.trim()) {
            tokens.push(current.trim());
          }
          tokens.push('AND');
          current = '';
          i += 3; // 跳过 "AND "
          continue;
        }
        if (nextChars.startsWith('OR ')) {
          if (current.trim()) {
            tokens.push(current.trim());
          }
          tokens.push('OR');
          current = '';
          i += 2; // 跳过 "OR "
          continue;
        }
      }

      current += char;
    }

    // 添加最后一个token
    if (current.trim()) {
      tokens.push(current.trim());
    }

    return tokens;
  }

  /**
   * 从条件语句中提取参数名
   */
  private extractParamName(condStatement: string): string | null {
    // 匹配 #{paramName} 格式
    const paramRegex = /#\{(\w+)\}/;
    const match = condStatement.match(paramRegex);
    return match ? match[1] : null;
  }

  /**
   * 清理括号
   */
  private cleanParentheses(text: string): {
    cleaned: string;
    openParens: string;
    closeParens: string;
  } {
    let openParens = '';
    let closeParens = '';
    let cleaned = text;

    // 提取开括号
    const openMatch = cleaned.match(/^(\(+)/);
    if (openMatch) {
      openParens = openMatch[1];
      cleaned = cleaned.substring(openParens.length);
    }

    // 提取闭括号
    const closeMatch = cleaned.match(/(\)+)$/);
    if (closeMatch) {
      closeParens = closeMatch[1];
      cleaned = cleaned.substring(0, cleaned.length - closeParens.length);
    }

    return {
      cleaned: cleaned.trim(),
      openParens,
      closeParens
    };
  }
}
