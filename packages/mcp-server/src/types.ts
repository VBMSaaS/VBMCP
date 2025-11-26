/**
 * VBMSaaS MCP Server Type Definitions
 * 
 * This file contains all type definitions for the MCP server
 */

/**
 * User information
 */
export interface User {
  id: string;
  email: string;
  name: string;
  plan: 'free' | 'professional' | 'enterprise';
  credits: number;
  createdAt: Date;
}

/**
 * Authentication session
 */
export interface Session {
  userId: string;
  token: string;
  secret?: string;  // Signature secret key from login response
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Login request parameters
 */
export interface LoginRequest {
  account: string;  // Phone number or email
  password: string;
}

/**
 * Login response
 */
export interface LoginResponse {
  success: boolean;
  user?: User;
  token?: string;  // Session token for MCP client
  vbmsaasToken?: string;  // VBMSaaS API token
  secret?: string;  // Signature secret key
  message?: string;
}

/**
 * VBMSaaS Partition (Application) information
 * Based on actual API response from /api/user/partition/all
 */
export interface Partition {
  id: string;                           // Partition ID
  code: string;                         // Partition code
  name: string;                         // Partition name
  disabled: boolean;                    // Whether disabled
  extension: any;                       // Extension data (可能包含角色类型等信息)
  funcId: string;                       // Function ID
  grade: number | null;                 // Grade level
  passErrorLimitedDuration: number | null;
  passNonInitialEnabled: boolean | null;
  passRetry: number | null;
  passUpdateCycle: number | null;
  pid: string | null;                   // Parent ID
  serialVersion: number | null;
}

/**
 * Application (extended Partition with additional info)
 */
export interface Application {
  id: string;                    // partitionId
  name: string;                  // partitionName
  code?: string;                 // partitionCode
  description?: string;
  platformId: string;
  level?: number;
  status: 'active' | 'inactive' | 'suspended';
  memberCount: number;           // 成员数量
  onlineMemberCount: number;     // 在线成员数量
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Application member information
 */
export interface ApplicationMember {
  userId: string;
  userName: string;
  mobile?: string;
  email?: string;
  role: string;                  // 角色名称
  roleLevel: number;             // 角色等级
  status: 'online' | 'offline' | 'away';
  lastActiveAt: Date;
  joinedAt: Date;
}

/**
 * Application statistics
 */
export interface ApplicationStats {
  partitionId: string;
  // 数据资源统计
  dataStats: {
    totalStorage: number;        // 总存储空间 (bytes)
    usedStorage: number;         // 已使用存储 (bytes)
    tableCount: number;          // 数据表数量
    documentCount: number;       // 文档数量
  };
  // API统计
  apiStats: {
    totalApis: number;           // 总接口数
    todayCallCount: number;      // 今日调用次数
    avgResponseTime: number;     // 平均响应时间 (ms)
    successRate: number;         // 成功率 (0-1)
  };
  // 用户统计
  userStats: {
    totalUsers: number;          // 总用户数
    onlineUsers: number;         // 在线用户数
    activeUsers: number;         // 活跃用户数
  };
  // 额度统计
  quotaStats: {
    plan: string;                // 套餐名称
    apiQuota: number;            // API调用额度
    apiUsed: number;             // 已使用API调用
    storageQuota: number;        // 存储额度 (bytes)
    storageUsed: number;         // 已使用存储 (bytes)
  };
  updatedAt: Date;
}

/**
 * VBMSaaS initial login request (Step 1)
 */
export interface VBMSaaSInitialLoginRequest {
  account: string;
  password: string;
  roleTag: string;
}

/**
 * VBMSaaS initial login response (Step 1)
 */
export interface VBMSaaSInitialLoginResponse {
  success: boolean;
  userId?: string;
  secret?: string;  // Secret key for request signing
  message?: string;
  data?: any;
}

/**
 * VBMSaaS final login request (Step 4)
 */
export interface VBMSaaSFinalLoginRequest {
  account: string;
  password: string;
  partitionId: string;
  roleTag: string;
}

/**
 * VBMSaaS final login response (Step 4)
 */
export interface VBMSaaSFinalLoginResponse {
  success: boolean;
  user?: any;
  token?: string;
  secret?: string;  // Signature secret key
  message?: string;
  data?: any;
}

/**
 * Service call request parameters
 */
export interface ServiceCallRequest {
  service: string;
  parameters?: Record<string, unknown>;
}

/**
 * Service call response
 */
export interface ServiceCallResponse {
  success: boolean;
  data?: unknown;
  message?: string;
  creditsUsed?: number;
}

/**
 * User info response
 */
export interface UserInfoResponse {
  success: boolean;
  user?: User;
  message?: string;
}

/**
 * VBMSaaS API configuration
 */
export interface VBMSaaSConfig {
  apiBaseUrl: string;
  apiKey?: string;
  accessKey?: string;
  secret?: string;  // Signature secret key (fixed value)
  timeout?: number;
}

/**
 * Server configuration
 */
export interface ServerConfig {
  name: string;
  version: string;
  vbmsaasConfig: VBMSaaSConfig;
  jwtSecret: string;
}

// ============================================
// Message Types (消息类型)
// ============================================

/**
 * Message type enum
 */
export enum MessageType {
  PLATFORM_NOTIFICATION = 'platform_notification',  // 平台通知
  APPLICATION_MESSAGE = 'application_message',      // 应用消息
  TEAM_CHAT = 'team_chat',                         // 团队聊天
  PRIVATE_CHAT = 'private_chat',                   // 私聊
  SYSTEM_ALERT = 'system_alert',                   // 系统告警
}

/**
 * Message priority
 */
export enum MessagePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Base message interface
 */
export interface Message {
  id: string;
  type: MessageType;
  priority: MessagePriority;
  title: string;
  content: string;
  senderId?: string;
  senderName?: string;
  read: boolean;
  createdAt: Date;
}

/**
 * Platform notification
 */
export interface PlatformNotification extends Message {
  type: MessageType.PLATFORM_NOTIFICATION;
  category: 'upgrade' | 'maintenance' | 'announcement' | 'feature';
}

/**
 * Application message
 */
export interface ApplicationMessage extends Message {
  type: MessageType.APPLICATION_MESSAGE;
  partitionId: string;
  category: 'alert' | 'backup' | 'user_request' | 'system';
  actionRequired?: boolean;
  actionUrl?: string;
}

/**
 * Chat message
 */
export interface ChatMessage extends Message {
  type: MessageType.TEAM_CHAT | MessageType.PRIVATE_CHAT;
  partitionId: string;
  channelId: string;
  channelName?: string;
  mentions?: string[];           // @提及的用户ID列表
  messageType: 'text' | 'code' | 'file' | 'image';
  codeLanguage?: string;         // 代码语言（如果是代码片段）
  fileUrl?: string;              // 文件URL（如果是文件）
  replyToId?: string;            // 回复的消息ID
}

// ============================================
// Chat Types (聊天相关类型)
// ============================================

/**
 * Chat channel
 */
export interface ChatChannel {
  id: string;
  partitionId: string;
  name: string;
  description?: string;
  type: 'public' | 'private' | 'direct';
  memberCount: number;
  unreadCount: number;
  lastMessage?: ChatMessage;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Online member status
 */
export interface OnlineMember {
  userId: string;
  userName: string;
  status: 'online' | 'away' | 'busy';
  lastActiveAt: Date;
}

// ============================================
// Knowledge Base Types (知识库类型)
// ============================================

/**
 * Document category
 */
export enum DocumentCategory {
  API_DOC = 'api_doc',           // API文档
  DEV_NOTE = 'dev_note',         // 开发笔记
  DESIGN_DOC = 'design_doc',     // 设计文档
  OPS_MANUAL = 'ops_manual',     // 运维手册
  MEETING_NOTE = 'meeting_note', // 会议记录
}

/**
 * Knowledge base document
 */
export interface KnowledgeDocument {
  id: string;
  partitionId: string;
  title: string;
  category: DocumentCategory;
  content: string;               // Markdown content
  tags: string[];
  authorId: string;
  authorName: string;
  viewCount: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Document version history
 */
export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  content: string;
  authorId: string;
  authorName: string;
  changeDescription?: string;
  createdAt: Date;
}

// ============================================
// Data Resource Types (数据资源类型)
// ============================================

/**
 * Data table information
 */
export interface DataTable {
  id: string;
  partitionId: string;
  name: string;
  description?: string;
  recordCount: number;
  size: number;                  // bytes
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// API Types (API接口类型)
// ============================================

/**
 * API endpoint information
 */
export interface ApiEndpoint {
  id: string;
  partitionId: string;
  name: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  group: string;                 // 接口分组
  description?: string;
  requestSchema?: any;           // JSON Schema
  responseSchema?: any;          // JSON Schema
  callCount: number;             // 调用次数
  avgResponseTime: number;       // 平均响应时间 (ms)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * API call statistics
 */
export interface ApiCallStats {
  endpointId: string;
  date: string;                  // YYYY-MM-DD
  callCount: number;
  successCount: number;
  errorCount: number;
  avgResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
}

// ============================================
// UI State Types (UI状态类型)
// ============================================

/**
 * Current application context
 */
export interface ApplicationContext {
  currentApplication?: Application;
  applications: Application[];
  unreadMessageCount: number;
  onlineMemberCount: number;
}

/**
 * Tree view item type
 */
export enum TreeItemType {
  MESSAGE_CENTER = 'message_center',
  PLATFORM_NOTIFICATION = 'platform_notification',
  APPLICATION_MESSAGE = 'application_message',
  TEAM_CHAT = 'team_chat',
  APPLICATION = 'application',
  DATA_RESOURCE = 'data_resource',
  API_ENDPOINT = 'api_endpoint',
  USER_MANAGEMENT = 'user_management',
  STATISTICS = 'statistics',
  QUOTA_MANAGEMENT = 'quota_management',
  KNOWLEDGE_BASE = 'knowledge_base',
  SHORTCUT = 'shortcut',
  SETTINGS = 'settings',
  RESOURCE_MANAGEMENT = 'resource_management',
}

// ============================================
// Resource Management Types (资源管理类型)
// ============================================

/**
 * Private Resource (私有资源)
 * Based on API: /api/cats/PrivateResource/datas/all
 */
export interface PrivateResource {
  id: string;                    // 资源ID
  name: string;                  // 资源名称
  code?: string;                 // 资源编码
  type?: string;                 // 资源类型
  description?: string;          // 资源描述
  status?: string;               // 资源状态
  owner?: string;                // 所有者
  createdAt?: Date;              // 创建时间
  updatedAt?: Date;              // 更新时间
  [key: string]: any;            // 其他动态字段
}

/**
 * Get resources request
 */
export interface GetResourcesRequest {
  partitionId: string;           // 分区ID
  sf?: number;                   // 参数sf (默认0)
  sd?: number;                   // 参数sd (默认1)
  cst?: number;                  // 参数cst (默认1)
}

/**
 * Get resources response
 */
export interface GetResourcesResponse {
  success: boolean;
  resources?: PrivateResource[];
  total?: number;
  message?: string;
  data?: any;                    // 原始响应数据
  debug?: any;                   // 调试信息
}

/**
 * Resource field extension configuration
 */
export interface ResourceFieldExtension {
  Type: number;                  // 扩展类型
}

/**
 * Resource field definition
 */
export interface ResourceField {
  FieldName: string;             // 字段名称
  MappingName: string;           // 映射名称
  DisplayName: string;           // 显示名称
  Description: string;           // 描述
  DataType: string;              // 数据类型: string, int, numeric, long, bool, timestamp, jsonobject, jsonarray, stringarray, file, image, video, audio, select, datetime, date, time, html
  Extension: ResourceFieldExtension; // 扩展配置
  Searched: boolean;             // 是否可搜索
  enable: boolean;               // 是否启用
  Unique: boolean;               // 是否唯一
  FieldPrefix: string;           // 字段前缀
  FieldSuffix: string;           // 字段后缀
  FieldConvert: string;          // 字段转换
  DefaultValue: any;             // 默认值
  Auto: boolean;                 // 是否自动
  SelResId: string;              // 选择资源ID
  SelResField: string;           // 选择资源字段
  SelResText: string;            // 选择资源文本
  NonEmpty: boolean;             // 是否非空
  EncryptEnabled: boolean;       // 是否启用加密
  EncryptType: number;           // 加密类型
}

/**
 * Add resource request
 */
export interface AddResourceRequest {
  Name: string;                  // 资源名称
  TypeCode: string;              // 类型代码 (如: "common")
  Description: string;           // 资源描述
  Fields: ResourceField[];       // 字段定义数组
}

/**
 * Add resource response
 */
export interface AddResourceResponse {
  success: boolean;
  message?: string;
  data?: any;                    // 原始响应数据
  resourceId?: string;           // 新创建的资源ID
  privateResourceId?: string;    // 新创建的私有资源ID
}

/**
 * Add private resource request
 */
export interface AddPrivateResourceRequest {
  Description: string;           // 资源描述
  Name: string;                  // 资源名称
  Tags: string;                  // 标签 (固定为 "private")
  typeId: string;                // 资源ID (第一步返回的资源ID)
  typeName: string;              // 资源类型名称 (使用资源名称)
  resourceType: string;          // 资源类型 (如 "common")
  partId: string;                // 应用ID
  PartitionId: string;           // 平台分区ID
  inMap: boolean;                // 是否在地图中 (固定为 false)
  inBluePrint: boolean;          // 是否在蓝图中 (固定为 false)
}

/**
 * Add private resource response
 */
export interface AddPrivateResourceResponse {
  success: boolean;
  message?: string;
  data?: any;                    // 原始响应数据
  privateResourceId?: string;    // 私有资源ID
}

/**
 * Delete resource request
 */
export interface DeleteResourceRequest {
  resourceId: string;            // 资源定义ID (typeId)
  privateResourceId: string;     // 私有资源数据ID (mid)
  userid: string;                // 用户ID
}

/**
 * Delete resource response
 */
export interface DeleteResourceResponse {
  success: boolean;
  message?: string;
  data?: {
    resourceDefinitionDeleted?: any;  // 资源定义删除结果
    privateResourceDeleted?: any;     // 私有资源删除结果
  };
}

/**
 * Get resource basic info request
 */
export interface GetResourceBasicInfoRequest {
  mid: string;                       // 私有资源数据ID
  categoryId: string;                // 分类ID
  withQuote?: boolean;               // 是否包含引用 (默认true)
  cst?: number;                      // 固定为1
}

/**
 * Get resource basic info response
 */
export interface GetResourceBasicInfoResponse {
  success: boolean;
  message?: string;
  data?: any;                        // 资源基本信息
}

/**
 * Get resource detail request
 */
export interface GetResourceDetailRequest {
  id: string;                        // 资源定义ID (typeId)
  cst?: number;                      // 固定为1
}

/**
 * Get resource detail response
 */
export interface GetResourceDetailResponse {
  success: boolean;
  message?: string;
  data?: any;                        // 资源详细信息(包含字段定义)
}

/**
 * Update resource field request
 */
export interface UpdateResourceFieldRequest {
  resId: string;                     // 资源ID
  name: string;                      // 字段名称
  fieldData: {
    Auto: boolean;
    ColumnName: string;
    DataType: string;
    DisplayName: string;
    EncryptEnabled: boolean;
    EncryptType: number;
    Extension: { Type: number };
    FieldName: string;
    FieldType: number;
    MappingName: string;
    NonEmpty: boolean;
    Quotation: boolean;
    Searched: boolean;
    TypeSketch: any[];
    Unique: boolean;
    DefaultValue: any;
    FieldValueStyle: any;
    FieldGroup: any;
    FieldPrefix: any;
    FieldSuffix: any;
    FieldConvert: any;
    SelResId: string;
    FieldFormula: any;
    FormulaQuoteFields: any;
    BaseField: any;
    MaxLength: any;
    Decimal: any;
    Description: any;
    isdelete: boolean;
    isbase: boolean;
    _org_name: string;
    _filetype: string;
  };
  cst?: number;                      // 固定为1
}

/**
 * Update resource field response
 */
export interface UpdateResourceFieldResponse {
  success: boolean;
  message?: string;
  data?: any;                        // 更新结果
}

/**
 * Add resource field request
 */
export interface AddResourceFieldRequest {
  resId: string;                     // 资源ID
  fieldData: {
    FieldName: string;               // 字段名称
    MappingName: string;             // 映射名称
    DisplayName: string;             // 显示名称
    Description: string;             // 描述
    DataType: string;                // 数据类型: string, int, numeric, long, bool, timestamp, jsonobject, jsonarray, stringarray, file, image, video, audio, select, datetime, date, time, html
    Extension: { Type: number };     // 扩展配置
    Searched: boolean;               // 是否可搜索
    Unique: boolean;                 // 是否唯一
    FieldPrefix: string;             // 字段前缀
    FieldSuffix: string;             // 字段后缀
    FieldConvert: string;            // 字段转换
    DefaultValue: any;               // 默认值
    Auto: boolean;                   // 是否自动
    SelResId: string;                // 选择资源ID
    NonEmpty: boolean;               // 是否非空
    isdelete: boolean;               // 是否删除
    isbase: boolean;                 // 是否基础字段
    _org_name?: string;              // 原始名称(可选)
  };
  cst?: number;                      // 固定为1
}

/**
 * Add resource field response
 */
export interface AddResourceFieldResponse {
  success: boolean;
  message?: string;
  data?: any;                        // 添加结果
}

/**
 * Delete resource field request
 */
export interface DeleteResourceFieldRequest {
  resId: string;                     // 资源ID
  name: string;                      // 字段名称
  cst?: number;                      // 固定为1
}

/**
 * Delete resource field response
 */
export interface DeleteResourceFieldResponse {
  success: boolean;
  message?: string;
  data?: any;                        // 删除结果
}

/**
 * Menu item structure
 */
export interface MenuItem {
  Id: string;                        // 菜单ID
  Name: string;                      // 菜单名称
  Code?: string;                     // 菜单代码
  Icon?: string;                     // 图标
  Url?: string;                      // 链接地址
  ParentId?: string;                 // 父菜单ID
  OrderNum?: number;                 // 排序号
  MenuType?: number;                 // 菜单类型
  Visible?: boolean;                 // 是否可见
  Children?: MenuItem[];             // 子菜单
  [key: string]: any;                // 其他属性
}

/**
 * Get menu tree request
 */
export interface GetMenuTreeRequest {
  roleId: string;                    // 角色ID
  partId: string;                    // 应用ID (partition ID)
  isPC?: boolean;                    // 是否为PC端菜单 (默认true)
  isMobile?: boolean;                // 是否为移动端菜单 (默认false)
  isMP?: boolean;                    // 是否为小程序菜单 (默认false)
  menuType?: number;                 // 菜单类型 (默认1)
  cst?: number;                      // 坐标系 (默认1)
}

/**
 * Get menu tree response
 */
export interface GetMenuTreeResponse {
  success: boolean;
  message?: string;
  data?: {
    Status: number;
    ErrorCode: number;
    Message: string | null;
    Result: MenuItem[];              // 菜单树数组
  };
  menuTree?: MenuItem[];             // 解析后的菜单树
}

/**
 * Menu data structure for adding/updating menus
 */
export interface MenuData {
  id?: string;                       // 菜单ID (新增时为空字符串)
  pid?: string | null;               // 父菜单ID (一级菜单为null)
  name: string;                      // 菜单名称
  description?: string;              // 描述
  level: number;                     // 菜单层级 (1=一级菜单, 2=二级菜单)
  nodeType: number;                  // 节点类型 (0=目录, 1=菜单)
  pageId?: string;                   // 页面ID
  page?: any;                        // 页面对象
  partId: string;                    // 应用ID
  menuType: number;                  // 菜单类型 (默认1)
  orderNo?: number;                  // 排序号 (默认0)
  isNewPage?: boolean;               // 是否新页面 (默认false)
  iconClass?: string;                // 图标类名
  isPC?: boolean;                    // 是否PC端菜单 (默认true)
  isMobile?: boolean;                // 是否移动端菜单 (默认false)
  isMP?: boolean;                    // 是否小程序菜单 (默认false)
  params?: string;                   // 参数
  tags?: string;                     // 标签
}

/**
 * Add menu request
 */
export interface AddMenuRequest {
  menuData: MenuData;                // 菜单数据
  cst?: number;                      // 坐标系 (默认1)
}

/**
 * Add menu response
 */
export interface AddMenuResponse {
  success: boolean;
  message?: string;
  data?: {
    Status: number;
    ErrorCode: number;
    Message: string | null;
    Result: any;                     // 新增菜单的结果
  };
  menuId?: string;                   // 新增菜单的ID
}

/**
 * Page data structure for adding/updating pages
 */
export interface PageData {
  id?: string;                       // 页面ID (新增时为空字符串)
  name: string;                      // 页面名称
  code: string;                      // 页面代码
  description?: string;              // 描述
  partId: string;                    // 应用ID
  pageType: number;                  // 页面类型 (默认1)
  url: string;                       // 页面URL
  funcId?: string | null;            // 功能ID
  isMap?: boolean;                   // 是否地图页面 (默认false)
  isMulti?: boolean;                 // 是否多实例 (默认false)
  isSys?: boolean;                   // 是否系统页面 (默认false)
}

/**
 * Add page request
 */
export interface AddPageRequest {
  pageData: PageData;                // 页面数据
  cst?: number;                      // 坐标系 (默认1)
}

/**
 * Add page response
 */
export interface AddPageResponse {
  success: boolean;
  message?: string;
  data?: {
    Status: number;
    ErrorCode: number;
    Message: string | null;
    Result: any;                     // 新增页面的结果
  };
  pageId?: string;                   // 新增页面的ID
}

/**
 * Page item structure
 */
export interface PageItem {
  id: string;                        // 页面ID
  name: string;                      // 页面名称
  code: string;                      // 页面代码
  description?: string;              // 描述
  partId: string;                    // 应用ID
  pageType: number;                  // 页面类型
  url: string;                       // 页面URL
  funcId?: string | null;            // 功能ID
  isMap?: boolean;                   // 是否地图页面
  isMulti?: boolean;                 // 是否多实例
  isSys?: boolean;                   // 是否系统页面
  [key: string]: any;                // 其他属性
}

/**
 * Get pages request (with pagination)
 */
export interface GetPagesRequest {
  page?: number;                     // 页码 (从0开始, 默认0)
  size?: number;                     // 每页大小 (默认10)
  partId: string;                    // 应用ID
  pageType?: number;                 // 页面类型 (默认1)
  cst?: number;                      // 坐标系 (默认1)
}

/**
 * Get pages response
 */
export interface GetPagesResponse {
  success: boolean;
  message?: string;
  data?: {
    Status: number;
    ErrorCode: number;
    Message: string | null;
    Result: {
      pageItems: PageItem[];         // 页面列表
      totalCount: number;            // 总记录数
      pageCount: number;             // 总页数
      pageSize: number;              // 每页大小
      pageNo: number;                // 当前页码
      itemCount: number;             // 当前页项目数
      [key: string]: any;            // 其他分页信息
    };
  };
  pages?: PageItem[];                // 解析后的页面列表
  totalElements?: number;            // 总记录数
  totalPages?: number;               // 总页数
}

// ============================================
// API Configuration Types (API配置类型)
// ============================================

/**
 * API parameter definition (vbio_parameters)
 */
export interface ApiParameter {
  ParamName: string;                 // 参数名称
  ParamType: string;                 // 参数类型: string, int, bool, etc.
  ArrayType?: boolean;               // 是否数组
  Required?: boolean;                // 是否必选
  NotNullable?: boolean;             // 是否不可空
  ParamDefault?: string;             // 默认值
  ParamIn?: string;                  // 使用方式: query, body, path, header
  ValidationRule?: string;           // 校验规则
  ParamDesc?: string;                // 参数说明
}

/**
 * API condition definition (vbio_conditions)
 */
export interface ApiCondition {
  CondStatement: string;             // 条件表达式 (如: "age > ?")
  CondConnector?: string;            // 条件连接符: AND, OR
  OpenParenthesis?: string;          // 左圆括弧
  CloseParenthesis?: string;         // 右圆括弧
  ParamName?: string;                // 对应参数名
  OrderNo?: number;                  // 序号
}

/**
 * API column definition (vbio_columns)
 */
export interface ApiColumn {
  ColumnName: string;                // 字段名称
  ColumnDesc?: string;               // 字段描述
  ColumnType: string;                // 数据类型
  ArrayType?: boolean;               // 是否数组
  ColumnFormat?: string;             // 数据类型格式
}

/**
 * API table usage (vbio_column_usage)
 */
export interface ApiTableUsage {
  TableSchema: string;               // 表模式名
  TableName: string;                 // 表名
  ResourceId?: string;               // 资源ID
  ColumnId?: number;                 // 列ID
}

/**
 * Parsed API configuration from description
 */
export interface ParsedApiConfig {
  // vbio 基本信息
  name: string;                      // API名称
  description: string;               // API描述
  apiType?: string;                  // 接口类型
  httpMethod: string;                // HTTP方法: GET, POST, PUT, DELETE
  routePath: string;                 // 路由地址
  resultType?: string;               // 返回结果类型
  authType?: string;                 // 认证类型
  apiSql?: string;                   // SQL语句
  apiSqlOrderBy?: string;            // 排序语句
  countSql?: string;                 // 计数SQL
  apiResponseWrapper?: string;       // 响应结果封装器

  // 关联数据
  parameters?: ApiParameter[];       // 参数列表
  conditions?: ApiCondition[];       // 条件列表
  columns?: ApiColumn[];             // 返回字段列表
  tableUsages?: ApiTableUsage[];     // 使用的表列表
}

/**
 * Create API from description request
 */
export interface CreateApiFromDescriptionRequest {
  description: string;               // API需求的文字描述
  partitionId?: string;              // 分区ID (可选,默认使用当前用户分区)
}

/**
 * Create API from description response
 */
export interface CreateApiFromDescriptionResponse {
  success: boolean;
  message?: string;
  data?: {
    apiMid: string;                  // 创建的API的Mid
    vbioMid: string;                 // vbio记录的Mid
    config: ParsedApiConfig;         // 解析的配置
    savedRecords: {
      vbio: any;                     // vbio记录
      parameters: any[];             // 参数记录
      conditions: any[];             // 条件记录
      columns: any[];                // 字段记录
      tableUsages: any[];            // 表使用记录
    };
  };
}

/**
 * Test API request
 */
export interface TestApiRequest {
  apiMid: string;                    // API的Mid (vbio表的主键)
  testParams?: Record<string, any>;  // 测试参数 (键值对)
}

/**
 * Test API response
 */
export interface TestApiResponse {
  success: boolean;
  message?: string;
  data?: {
    apiConfig: any;                  // API配置信息
    requestInfo: {
      method: string;                // 请求方法
      url?: string;                  // 请求URL
      sql?: string;                  // 执行的SQL
      params: Record<string, any>;   // 请求参数
    };
    response: any;                   // API响应数据
    executionTime: number;           // 执行时间(毫秒)
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

