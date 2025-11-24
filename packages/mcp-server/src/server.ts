/**
 * VBMSaaS MCP Server
 * 
 * Main MCP server implementation that handles tool registration and execution
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

import { AuthService } from './services/auth.js';
import { VBMSaaSApiService } from './services/api.js';
import { AuthStorageService } from './services/authStorage.js';
import { CredentialsStorageService } from './services/credentialsStorage.js';
import { ServerConfig, LoginRequest, ServiceCallRequest } from './types.js';

export class VBMSaaSMcpServer {
  private server: Server;
  private authService: AuthService;
  private apiService: VBMSaaSApiService;
  private authStorage: AuthStorageService;
  private credentialsStorage: CredentialsStorageService;
  private config: ServerConfig;
  private currentToken: string | null = null;  // Session token for MCP client
  private vbmsaasToken: string | null = null;  // VBMSaaS API token
  private currentUser: any = null;
  private currentUserId: string | null = null;  // 当前用户ID,由扩展传入

  constructor(config: ServerConfig) {
    this.config = config;

    // Initialize services
    this.apiService = new VBMSaaSApiService(
      config.vbmsaasConfig,
      config.vbmsaasConfig.accessKey
    );
    this.authService = new AuthService(config.jwtSecret, this.apiService);
    this.authStorage = new AuthStorageService();
    this.credentialsStorage = new CredentialsStorageService();

    // Create MCP server instance
    this.server = new Server(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.setupCleanupTimer();
    // Note: loadSavedAuth is async, will be called in start() method
  }

  /**
   * Setup MCP protocol handlers
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: 'vbmsaas_login',
          description: 'Login to VBMSaaS platform with account (phone number or email) and password. Returns user information and authentication token.',
          inputSchema: {
            type: 'object',
            properties: {
              account: {
                type: 'string',
                description: 'User account (phone number or email address)'
              },
              password: {
                type: 'string',
                description: 'User password'
              }
            },
            required: ['account', 'password']
          }
        },
        {
          name: 'vbmsaas_get_user_info',
          description: 'Get current user information including plan, credits, and account details. Requires authentication.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'vbmsaas_call_service',
          description: 'Call a VBMSaaS platform service. Requires authentication. Available services will be documented separately.',
          inputSchema: {
            type: 'object',
            properties: {
              service: {
                type: 'string',
                description: 'Service name to call (e.g., "code_generation", "code_review", "bug_detection")'
              },
              parameters: {
                type: 'object',
                description: 'Service-specific parameters',
                additionalProperties: true
              }
            },
            required: ['service']
          }
        },
        {
          name: 'vbmsaas_logout',
          description: 'Logout from VBMSaaS platform and clear authentication session.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'vbmsaas_get_applications',
          description: 'Get all applications (partitions) that the user can access. Requires authentication.',
          inputSchema: {
            type: 'object',
            properties: {
              userId: {
                type: 'string',
                description: 'User ID to get applications for'
              }
            },
            required: ['userId']
          }
        },
        {
          name: 'vbmsaas_login_with_partition',
          description: 'Final login with selected partition (application). This is step 4 of the login flow.',
          inputSchema: {
            type: 'object',
            properties: {
              account: {
                type: 'string',
                description: 'User account (phone number or email)'
              },
              password: {
                type: 'string',
                description: 'User password'
              },
              partitionId: {
                type: 'string',
                description: 'Selected partition (application) ID'
              },
              platformId: {
                type: 'string',
                description: 'Platform ID'
              },
              roleTag: {
                type: 'string',
                description: 'Role tag (default: empty string)'
              }
            },
            required: ['account', 'password', 'partitionId']
          }
        },
        {
          name: 'vbmsaas_set_auth',
          description: 'Set authentication credentials (called by VSCode extension after login). This allows AI Agent to use resource management tools without handling login.',
          inputSchema: {
            type: 'object',
            properties: {
              token: {
                type: 'string',
                description: 'VBMSaaS API JWT token'
              },
              secret: {
                type: 'string',
                description: 'Secret key for request signing'
              },
              userid: {
                type: 'string',
                description: 'User ID'
              },
              user: {
                type: 'object',
                description: 'User information object'
              }
            },
            required: ['token', 'secret', 'userid']
          }
        },
        {
          name: 'vbmsaas_save_credentials',
          description: 'Save login credentials (account and password) to secure storage for auto-login. This allows Agent to login automatically without entering credentials each time.',
          inputSchema: {
            type: 'object',
            properties: {
              account: {
                type: 'string',
                description: 'User account (phone number or email)'
              },
              password: {
                type: 'string',
                description: 'User password'
              },
              partitionId: {
                type: 'string',
                description: 'Partition (application) ID'
              },
              platformId: {
                type: 'string',
                description: 'Platform ID'
              },
              roleTag: {
                type: 'string',
                description: 'Role tag (default: empty string)'
              }
            },
            required: ['account', 'password', 'partitionId']
          }
        },
        {
          name: 'vbmsaas_clear_credentials',
          description: 'Clear saved login credentials from secure storage.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'vbmsaas_login_auto',
          description: 'Auto-login using saved credentials. Agent can call this to login without providing account/password.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        },
        {
          name: 'vbmsaas_get_resources',
          description: 'Get all private resources for a partition (application). Returns list of resources with details. Authentication is handled by VSCode extension.',
          inputSchema: {
            type: 'object',
            properties: {
              partitionId: {
                type: 'string',
                description: 'Partition (application) ID to get resources for'
              },
              sf: {
                type: 'number',
                description: 'Parameter sf (default: 0)'
              },
              sd: {
                type: 'number',
                description: 'Parameter sd (default: 1)'
              },
              cst: {
                type: 'number',
                description: 'Parameter cst (default: 1)'
              }
            },
            required: ['partitionId']
          }
        },
        {
          name: 'vbmsaas_add_resource',
          description: 'Add a new resource to the platform (two-step process: create resource definition and add to private resources). Authentication is handled by VSCode extension.',
          inputSchema: {
            type: 'object',
            properties: {
              Name: {
                type: 'string',
                description: 'Resource name'
              },
              TypeCode: {
                type: 'string',
                description: 'Resource type code (e.g., "common")'
              },
              Description: {
                type: 'string',
                description: 'Resource description'
              },
              Fields: {
                type: 'array',
                description: 'Array of field definitions',
                items: {
                  type: 'object',
                  properties: {
                    FieldName: { type: 'string' },
                    MappingName: { type: 'string' },
                    DisplayName: { type: 'string' },
                    Description: { type: 'string' },
                    DataType: { type: 'string' },
                    Extension: { type: 'object' },
                    Searched: { type: 'boolean' },
                    enable: { type: 'boolean' },
                    Unique: { type: 'boolean' },
                    FieldPrefix: { type: 'string' },
                    FieldSuffix: { type: 'string' },
                    FieldConvert: { type: 'string' },
                    DefaultValue: {},
                    Auto: { type: 'boolean' },
                    SelResId: { type: 'string' },
                    SelResField: { type: 'string' },
                    SelResText: { type: 'string' },
                    NonEmpty: { type: 'boolean' },
                    EncryptEnabled: { type: 'boolean' },
                    EncryptType: { type: 'number' }
                  }
                }
              },
              partId: {
                type: 'string',
                description: 'Application ID'
              },
              partitionId: {
                type: 'string',
                description: 'Partition ID'
              },
              userid: {
                type: 'string',
                description: 'User ID (optional, will use authenticated user if not provided)'
              }
            },
            required: ['Name', 'TypeCode', 'Description', 'Fields']
          }
        },
        {
          name: 'vbmsaas_delete_resource',
          description: 'Delete a resource from the platform (two-step process: delete private resource data and delete resource definition). Authentication is handled by VSCode extension.',
          inputSchema: {
            type: 'object',
            properties: {
              resourceId: {
                type: 'string',
                description: 'Resource definition ID (typeId from resource creation)'
              },
              privateResourceId: {
                type: 'string',
                description: 'Private resource data ID (mid from private resource)'
              },
              userid: {
                type: 'string',
                description: 'User ID (optional, will use authenticated user if not provided)'
              }
            },
            required: ['resourceId', 'privateResourceId']
          }
        },
        {
          name: 'vbmsaas_get_resource_basic_info',
          description: 'Get basic information of a resource. Requires authentication.',
          inputSchema: {
            type: 'object',
            properties: {
              mid: {
                type: 'string',
                description: 'Private resource data ID'
              },
              categoryId: {
                type: 'string',
                description: 'Category ID'
              },
              withQuote: {
                type: 'boolean',
                description: 'Whether to include quotes (default: true)'
              }
            },
            required: ['mid', 'categoryId']
          }
        },
        {
          name: 'vbmsaas_get_resource_detail',
          description: 'Get detailed information of a resource including field definitions. Requires authentication.',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Resource definition ID (typeId)'
              }
            },
            required: ['id']
          }
        },
        {
          name: 'vbmsaas_update_resource_field',
          description: 'Update a field definition of a resource. Requires authentication.',
          inputSchema: {
            type: 'object',
            properties: {
              resId: {
                type: 'string',
                description: 'Resource ID'
              },
              name: {
                type: 'string',
                description: 'Field name'
              },
              fieldData: {
                type: 'object',
                description: 'Field data object with all field properties'
              }
            },
            required: ['resId', 'name', 'fieldData']
          }
        },
        {
          name: 'vbmsaas_add_resource_field',
          description: 'Add a new field to a resource. Requires authentication.',
          inputSchema: {
            type: 'object',
            properties: {
              resId: {
                type: 'string',
                description: 'Resource ID'
              },
              fieldData: {
                type: 'object',
                description: 'Field data object with field properties',
                properties: {
                  FieldName: { type: 'string', description: 'Field name' },
                  MappingName: { type: 'string', description: 'Mapping name' },
                  DisplayName: { type: 'string', description: 'Display name' },
                  Description: { type: 'string', description: 'Field description' },
                  DataType: { type: 'string', description: 'Data type: string, int, numeric, long, bool, timestamp, jsonobject, jsonarray, stringarray, file, image, video, audio, select, datetime, date, time, html' },
                  Extension: { type: 'object', description: 'Extension configuration' },
                  Searched: { type: 'boolean', description: 'Is searchable' },
                  Unique: { type: 'boolean', description: 'Is unique' },
                  FieldPrefix: { type: 'string', description: 'Field prefix' },
                  FieldSuffix: { type: 'string', description: 'Field suffix' },
                  FieldConvert: { type: 'string', description: 'Field convert' },
                  DefaultValue: { description: 'Default value' },
                  Auto: { type: 'boolean', description: 'Is auto' },
                  SelResId: { type: 'string', description: 'Select resource ID' },
                  NonEmpty: { type: 'boolean', description: 'Is non-empty' },
                  isdelete: { type: 'boolean', description: 'Is delete' },
                  isbase: { type: 'boolean', description: 'Is base field' }
                },
                required: ['FieldName', 'DisplayName', 'DataType']
              }
            },
            required: ['resId', 'fieldData']
          }
        },
        {
          name: 'vbmsaas_delete_resource_field',
          description: 'Delete a field from a resource. Requires authentication.',
          inputSchema: {
            type: 'object',
            properties: {
              resId: {
                type: 'string',
                description: 'Resource ID'
              },
              name: {
                type: 'string',
                description: 'Field name to delete'
              }
            },
            required: ['resId', 'name']
          }
        },
        {
          name: 'vbmsaas_get_menu_tree',
          description: 'Get menu tree for a role. Supports PC, Mobile, and Mini Program menus. Requires authentication.',
          inputSchema: {
            type: 'object',
            properties: {
              roleId: {
                type: 'string',
                description: 'Role ID'
              },
              partId: {
                type: 'string',
                description: 'Application ID (partition ID)'
              },
              isPC: {
                type: 'boolean',
                description: 'Whether to get PC menu (default: true)'
              },
              isMobile: {
                type: 'boolean',
                description: 'Whether to get mobile menu (default: false)'
              },
              isMP: {
                type: 'boolean',
                description: 'Whether to get mini program menu (default: false)'
              },
              menuType: {
                type: 'number',
                description: 'Menu type (default: 1)'
              }
            },
            required: ['roleId', 'partId']
          }
        },
        {
          name: 'vbmsaas_add_menu',
          description: 'Add a new menu to the application. Supports PC, Mobile, and Mini Program menus. Requires authentication.',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Menu name'
              },
              partId: {
                type: 'string',
                description: 'Application ID (partition ID)'
              },
              level: {
                type: 'number',
                description: 'Menu level (1=top level, 2=second level)'
              },
              nodeType: {
                type: 'number',
                description: 'Node type (0=directory, 1=menu)'
              },
              pid: {
                type: 'string',
                description: 'Parent menu ID (null for top level menu)'
              },
              description: {
                type: 'string',
                description: 'Menu description'
              },
              pageId: {
                type: 'string',
                description: 'Page ID'
              },
              menuType: {
                type: 'number',
                description: 'Menu type (default: 1)'
              },
              orderNo: {
                type: 'number',
                description: 'Order number (default: 0)'
              },
              iconClass: {
                type: 'string',
                description: 'Icon class name (e.g., "fa fa-magic")'
              },
              isPC: {
                type: 'boolean',
                description: 'Whether this is a PC menu (default: true)'
              },
              isMobile: {
                type: 'boolean',
                description: 'Whether this is a mobile menu (default: false)'
              },
              isMP: {
                type: 'boolean',
                description: 'Whether this is a mini program menu (default: false)'
              },
              isNewPage: {
                type: 'boolean',
                description: 'Whether to open in new page (default: false)'
              },
              params: {
                type: 'string',
                description: 'Menu parameters'
              },
              tags: {
                type: 'string',
                description: 'Menu tags'
              }
            },
            required: ['name', 'partId', 'level', 'nodeType']
          }
        },
        {
          name: 'vbmsaas_add_page',
          description: 'Add a new page to the application. Requires authentication.',
          inputSchema: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Page name'
              },
              code: {
                type: 'string',
                description: 'Page code (unique identifier)'
              },
              partId: {
                type: 'string',
                description: 'Application ID (partition ID)'
              },
              url: {
                type: 'string',
                description: 'Page URL'
              },
              pageType: {
                type: 'number',
                description: 'Page type (default: 1)'
              },
              description: {
                type: 'string',
                description: 'Page description'
              },
              funcId: {
                type: 'string',
                description: 'Function ID'
              },
              isMap: {
                type: 'boolean',
                description: 'Whether this is a map page (default: false)'
              },
              isMulti: {
                type: 'boolean',
                description: 'Whether this is a multi-instance page (default: false)'
              },
              isSys: {
                type: 'boolean',
                description: 'Whether this is a system page (default: false)'
              }
            },
            required: ['name', 'code', 'partId', 'url']
          }
        },
        {
          name: 'vbmsaas_get_pages',
          description: 'Get pages with pagination. Requires authentication.',
          inputSchema: {
            type: 'object',
            properties: {
              partId: {
                type: 'string',
                description: 'Application ID (partition ID)'
              },
              page: {
                type: 'number',
                description: 'Page number (starts from 0, default: 0)'
              },
              size: {
                type: 'number',
                description: 'Page size (default: 10)'
              },
              pageType: {
                type: 'number',
                description: 'Page type (default: 1)'
              }
            },
            required: ['partId']
          }
        }
      ];

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'vbmsaas_login':
            return await this.handleLogin(args as unknown as LoginRequest);

          case 'vbmsaas_get_user_info':
            return await this.handleGetUserInfo();

          case 'vbmsaas_call_service':
            return await this.handleCallService(args as unknown as ServiceCallRequest);

          case 'vbmsaas_logout':
            return await this.handleLogout();

          case 'vbmsaas_get_applications':
            return await this.handleGetApplications(args as { userId: string });

          case 'vbmsaas_login_with_partition':
            return await this.handleLoginWithPartition(args as { account: string; password: string; partitionId: string; platformId?: string; roleTag?: string });

          case 'vbmsaas_set_auth':
            return await this.handleSetAuth(args as { token: string; secret: string; userid: string; user?: any });

          case 'vbmsaas_save_credentials':
            return await this.handleSaveCredentials(args as { account: string; password: string; partitionId: string; platformId?: string; roleTag?: string });

          case 'vbmsaas_clear_credentials':
            return await this.handleClearCredentials();

          case 'vbmsaas_login_auto':
            return await this.handleLoginAuto();

          case 'vbmsaas_get_resources':
            return await this.handleGetResources(args as { partitionId: string; sf?: number; sd?: number; cst?: number });

          case 'vbmsaas_add_resource':
            return await this.handleAddResource(args as any);

          case 'vbmsaas_delete_resource':
            return await this.handleDeleteResource(args as any);

          case 'vbmsaas_get_resource_basic_info':
            return await this.handleGetResourceBasicInfo(args as any);

          case 'vbmsaas_get_resource_detail':
            return await this.handleGetResourceDetail(args as any);

          case 'vbmsaas_update_resource_field':
            return await this.handleUpdateResourceField(args as any);

          case 'vbmsaas_add_resource_field':
            return await this.handleAddResourceField(args as any);

          case 'vbmsaas_delete_resource_field':
            return await this.handleDeleteResourceField(args as any);

          case 'vbmsaas_get_menu_tree':
            return await this.handleGetMenuTree(args as any);

          case 'vbmsaas_add_menu':
            return await this.handleAddMenu(args as any);

          case 'vbmsaas_add_page':
            return await this.handleAddPage(args as any);

          case 'vbmsaas_get_pages':
            return await this.handleGetPages(args as any);

          default:
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    success: false,
                    message: `Unknown tool: ${name}`
                  })
                }
              ]
            };
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: error instanceof Error ? error.message : 'Tool execution failed'
              })
            }
          ],
          isError: true
        };
      }
    });
  }

  /**
   * Handle login tool call
   */
  private async handleLogin(request: LoginRequest) {
    const response = await this.authService.login(request);

    if (response.success && response.user && response.token && response.vbmsaasToken) {
      // Store both tokens
      this.currentToken = response.token;  // Session token for MCP client
      this.vbmsaasToken = response.vbmsaasToken;  // VBMSaaS API token

      // Set VBMSaaS token and secret for API calls (NOT the session token!)
      // Note: authService.login already sets these, but we set them again here for clarity
      this.apiService.setAuthToken(response.vbmsaasToken, response.secret);

      // Note: Session is already created in authService.login with secret
      // No need to create it again here

      console.log('[Server] Login successful');
      console.log('[Server] Session token:', response.token.substring(0, 50) + '...');
      console.log('[Server] VBMSaaS token:', response.vbmsaasToken.substring(0, 50) + '...');
      if (response.secret) {
        console.log('[Server] Secret key:', response.secret);
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  /**
   * Handle get user info tool call
   */
  private async handleGetUserInfo() {
    if (!this.currentToken) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              message: 'Not authenticated. Please login first.'
            })
          }
        ]
      };
    }

    const tokenData = this.authService.verifyToken(this.currentToken);
    if (!tokenData) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              message: 'Invalid or expired token. Please login again.'
            })
          }
        ]
      };
    }

    const response = await this.apiService.getUserInfo(tokenData.userId);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  /**
   * Handle call service tool call
   */
  private async handleCallService(request: ServiceCallRequest) {
    if (!this.currentToken) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              message: 'Not authenticated. Please login first.'
            })
          }
        ]
      };
    }

    const response = await this.apiService.callService(request);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  /**
   * Handle logout tool call
   */
  private async handleLogout() {
    if (this.currentToken) {
      this.authService.logout(this.currentToken);
      this.apiService.clearAuthToken();
      this.currentToken = null;
      this.vbmsaasToken = null;
      this.currentUser = null;
      this.currentUserId = null;
    }

    // Clear saved authentication
    await this.authStorage.clearAuth();
    console.log('[Server] ✅ Logged out and cleared saved authentication');

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: true,
            message: 'Logged out successfully'
          })
        }
      ]
    };
  }

  /**
   * Handle get applications tool call
   */
  private async handleGetApplications(args: { userId: string }) {
    if (!this.currentToken) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              message: 'Not authenticated. Please login first.'
            })
          }
        ]
      };
    }

    // Get session to retrieve secret and vbmsaasToken
    const session = this.authService.getSession(this.currentToken);
    if (!session) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              message: 'Session expired. Please login again.'
            })
          }
        ]
      };
    }

    // Debug info
    const debugInfo = {
      hasCurrentToken: !!this.currentToken,
      hasVbmsaasToken: !!this.vbmsaasToken,
      hasSessionSecret: !!session.secret,
      sessionSecret: session.secret || 'NULL',
      userId: args.userId
    };

    console.error('[Server] ========================================');
    console.error('[Server] Get Applications - Debug Info:', JSON.stringify(debugInfo, null, 2));
    console.error('[Server] ========================================');

    // Re-set auth token and secret before making API call
    if (this.vbmsaasToken && session.secret) {
      console.error('[Server] ⚠️ Re-setting auth token and secret');
      this.apiService.setAuthToken(this.vbmsaasToken, session.secret);
    } else {
      console.error('[Server] ❌ Missing vbmsaasToken or secret');
      // Return debug info in error response
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              message: 'Missing authentication credentials',
              debug: debugInfo
            })
          }
        ]
      };
    }

    const response = await this.apiService.getAllPartitionUsers(args.userId);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  /**
   * Handle login with partition tool call (Step 4)
   */
  private async handleLoginWithPartition(args: {
    account: string;
    password: string;
    partitionId: string;
    platformId?: string;
    roleTag?: string
  }) {
    const response = await this.apiService.loginUser(
      args.account,
      args.password,
      args.partitionId,
      args.platformId || process.env.VBMSAAS_PLATFORM_ID || '',
      args.roleTag
    );

    if (response.success && response.token) {
      // For loginWithPartition, the token is VBMSaaS token
      this.vbmsaasToken = response.token;
      this.currentUser = response.user;

      // Extract and save user ID
      if (response.user) {
        this.currentUserId = (response.user as any).userId || (response.user as any).id || null;
      }

      // Set VBMSaaS token and secret for API calls
      // Note: apiService.loginUser already sets these, but we set them again here for clarity
      this.apiService.setAuthToken(response.token, response.secret);

      console.log('[Server] ========================================');
      console.log('[Server] Login with partition successful');
      console.log('[Server] VBMSaaS token saved:', this.vbmsaasToken.substring(0, 50) + '...');
      console.log('[Server] User ID saved:', this.currentUserId);
      if (response.secret) {
        console.log('[Server] Secret key:', response.secret);
      }
      console.log('[Server] User data:', JSON.stringify(response.user, null, 2));
      console.log('[Server] User data keys:', Object.keys(response.user || {}));
      console.log('[Server] ========================================');

      // Save authentication to storage for persistence
      if (response.secret && this.currentUserId) {
        await this.saveAuthToStorage(
          response.token,
          response.secret,
          this.currentUserId,
          args.partitionId,
          args.account,
          args.password
        );
      }
    } else {
      console.log('[Server] Login failed or no token received');
      console.log('[Server] Response:', JSON.stringify(response, null, 2));
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response)
        }
      ]
    };
  }

  /**
   * Handle set auth request (called by VSCode extension after login)
   */
  private async handleSetAuth(args: { token: string; secret: string; userid: string; user?: any }) {
    try {
      console.log('[Server] ========================================');
      console.log('[Server] Setting authentication credentials');
      console.log('[Server] User ID:', args.userid);
      console.log('[Server] Token preview:', args.token.substring(0, 50) + '...');
      console.log('[Server] Secret preview:', '***' + args.secret.substring(args.secret.length - 10));
      console.log('[Server] ========================================');

      // Save authentication info
      this.vbmsaasToken = args.token;
      this.currentUserId = args.userid;
      if (args.user) {
        this.currentUser = args.user;
      }

      // Set auth token in API service
      this.apiService.setAuthToken(args.token, args.secret);

      // Save authentication to storage for persistence
      // Note: We don't have account/password here, so we can't save them
      const partitionId = (args.user as any)?.partition?.id || (args.user as any)?.partitionId;
      await this.saveAuthToStorage(
        args.token,
        args.secret,
        args.userid,
        partitionId
      );

      console.log('[Server] ✅ Authentication credentials set successfully');

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'Authentication credentials set successfully',
              userid: args.userid
            })
          }
        ]
      };
    } catch (error) {
      console.error('[Server] Set auth error:', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              message: error instanceof Error ? error.message : 'Failed to set authentication'
            })
          }
        ]
      };
    }
  }

  /**
   * Handle save credentials request
   */
  private async handleSaveCredentials(args: {
    account: string;
    password: string;
    partitionId: string;
    platformId?: string;
    roleTag?: string
  }) {
    try {
      console.log('[Server] ========================================');
      console.log('[Server] Saving login credentials');
      console.log('[Server] Account:', args.account);
      console.log('[Server] Partition ID:', args.partitionId);
      console.log('[Server] ========================================');

      await this.credentialsStorage.saveCredentials({
        account: args.account,
        password: args.password,
        partitionId: args.partitionId,
        platformId: args.platformId,
        roleTag: args.roleTag
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'Login credentials saved successfully. You can now use vbmsaas_login_auto to login automatically.'
            })
          }
        ]
      };
    } catch (error) {
      console.error('[Server] Save credentials error:', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              message: error instanceof Error ? error.message : 'Failed to save credentials'
            })
          }
        ]
      };
    }
  }

  /**
   * Handle clear credentials request
   */
  private async handleClearCredentials() {
    try {
      await this.credentialsStorage.clearCredentials();

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message: 'Login credentials cleared successfully'
            })
          }
        ]
      };
    } catch (error) {
      console.error('[Server] Clear credentials error:', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              message: error instanceof Error ? error.message : 'Failed to clear credentials'
            })
          }
        ]
      };
    }
  }

  /**
   * Handle auto-login request
   */
  private async handleLoginAuto() {
    try {
      console.log('[Server] ========================================');
      console.log('[Server] Auto-login using saved credentials');

      // Load saved credentials
      const credentials = await this.credentialsStorage.loadCredentials();

      if (!credentials) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: 'No saved credentials found. Please use vbmsaas_save_credentials first.'
              })
            }
          ]
        };
      }

      console.log('[Server] Found saved credentials for account:', credentials.account);

      // Perform login
      const response = await this.apiService.loginUser(
        credentials.account,
        credentials.password,
        credentials.partitionId,
        credentials.platformId || process.env.VBMSAAS_PLATFORM_ID || '',
        credentials.roleTag || ''
      );

      if (response.success && response.token) {
        // Save authentication state
        this.vbmsaasToken = response.token;
        this.currentUser = response.user;

        // Extract and save user ID
        if (response.user) {
          this.currentUserId = (response.user as any).userId || (response.user as any).id || null;
        }

        // Set VBMSaaS token and secret for API calls
        this.apiService.setAuthToken(response.token, response.secret);

        // Save to auth storage for persistence
        if (response.secret && this.currentUserId) {
          await this.saveAuthToStorage(
            response.token,
            response.secret,
            this.currentUserId,
            credentials.partitionId,
            credentials.account,
            credentials.password
          );
        }

        console.log('[Server] ✅ Auto-login successful');
        console.log('[Server] User ID:', this.currentUserId);
        console.log('[Server] ========================================');
      } else {
        console.log('[Server] ❌ Auto-login failed');
        console.log('[Server] ========================================');
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response)
          }
        ]
      };
    } catch (error) {
      console.error('[Server] Auto-login error:', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              message: error instanceof Error ? error.message : 'Auto-login failed'
            })
          }
        ]
      };
    }
  }

  /**
   * Handle get resources request
   */
  private async handleGetResources(args: { partitionId: string; sf?: number; sd?: number; cst?: number }) {
    try {
      console.log('[Server] ========================================');
      console.log('[Server] Getting resources for partition:', args.partitionId);
      console.log('[Server] Session token available:', !!this.currentToken);
      console.log('[Server] VBMSaaS token available:', !!this.vbmsaasToken);

      // Debug info to include in response
      const debugInfo: any = {
        hasSessionToken: !!this.currentToken,
        hasVbmsaasToken: !!this.vbmsaasToken,
        sessionTokenPreview: this.currentToken ? this.currentToken.substring(0, 50) + '...' : 'NO SESSION TOKEN',
        vbmsaasTokenPreview: this.vbmsaasToken ? this.vbmsaasToken.substring(0, 50) + '...' : 'NO VBMSAAS TOKEN',
        partitionId: args.partitionId,
        hasAuthHeader: !!this.apiService['client'].defaults.headers.common['Authorization'],
        hasAccessKey: !!this.apiService['client'].defaults.headers.common['Vb-Access-Key'],
        authHeaderPreview: this.apiService['client'].defaults.headers.common['Authorization']
          ? String(this.apiService['client'].defaults.headers.common['Authorization']).substring(0, 50) + '...'
          : 'NO AUTH HEADER',
        accessKey: this.apiService['client'].defaults.headers.common['Vb-Access-Key'] || 'NO ACCESS KEY'
      };

      if (this.vbmsaasToken) {
        console.log('[Server] VBMSaaS token preview:', this.vbmsaasToken.substring(0, 50) + '...');
        console.log('[Server] Re-setting auth token before API call');
        this.apiService.setAuthToken(this.vbmsaasToken);
      } else {
        console.log('[Server] ERROR: No VBMSaaS token available! User may not be logged in.');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: 'DEBUG: Not logged in. Please login first.',
                debug: debugInfo,
                resources: [],
                total: 0
              })
            }
          ]
        };
      }

      const result = await this.apiService.getPrivateResources({
        partitionId: args.partitionId,
        sf: args.sf,
        sd: args.sd,
        cst: args.cst
      });

      console.log('[Server] Get resources result:', result.success ? `Success, ${result.resources?.length || 0} resources` : result.message);

      // Add debug info to result
      (result as any).debug = debugInfo;

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result)
          }
        ]
      };
    } catch (error) {
      console.error('[Server] Get resources error:', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              message: error instanceof Error ? error.message : 'Failed to get resources'
            })
          }
        ]
      };
    }
  }

  /**
   * Setup timer to clean up expired sessions
   */
  private setupCleanupTimer(): void {
    // Clean up expired sessions every hour
    setInterval(() => {
      this.authService.cleanupExpiredSessions();
    }, 60 * 60 * 1000);
  }

  /**
   * Handle add resource request
   */
  private async handleAddResource(args: any) {
    try {
      // Use values from args or throw error if not provided
      if (!args.partId) {
        throw new Error('partId is required');
      }
      if (!args.partitionId) {
        throw new Error('partitionId is required');
      }
      const partId = args.partId;
      const partitionId = args.partitionId;
      const userid = args.userid || this.currentUserId;

      console.log('[Server] ========================================');
      console.log('[Server] Adding new resource (two-step process)');
      console.log('[Server] Resource name:', args.Name);
      console.log('[Server] Type code:', args.TypeCode);
      console.log('[Server] Application ID:', partId, args.partId ? '(provided)' : '(default)');
      console.log('[Server] Partition ID:', partitionId, args.partitionId ? '(provided)' : '(default)');
      console.log('[Server] User ID:', userid, args.userid ? '(provided)' : '(from auth)');
      console.log('[Server] Session token available:', !!this.currentToken);
      console.log('[Server] VBMSaaS token available:', !!this.vbmsaasToken);

      if (!this.vbmsaasToken) {
        console.log('[Server] ERROR: No VBMSaaS token available! User may not be logged in.');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: 'Not authenticated. Please ensure VSCode extension has logged in.'
              })
            }
          ]
        };
      }

      // Validate userid
      if (!userid) {
        console.log('[Server] ERROR: No user ID available (not provided and not authenticated)');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: 'User ID not available. Please ensure VSCode extension has logged in.'
              })
            }
          ]
        };
      }

      // Re-set auth token before API call
      console.log('[Server] Re-setting auth token before API call');
      this.apiService.setAuthToken(this.vbmsaasToken);

      const result = await this.apiService.addResource(
        {
          Name: args.Name,
          TypeCode: args.TypeCode,
          Description: args.Description,
          Fields: args.Fields
        },
        partId,
        partitionId,
        userid
      );

      console.log('[Server] Add resource result:', result.success ? 'Success' : result.message);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result)
          }
        ]
      };
    } catch (error) {
      console.error('[Server] Add resource error:', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              message: error instanceof Error ? error.message : 'Failed to add resource'
            })
          }
        ]
      };
    }
  }

  /**
   * Handle delete resource request
   */
  private async handleDeleteResource(args: { resourceId: string; privateResourceId: string; userid?: string }) {
    try {
      // Use authenticated user ID if not provided
      const userid = args.userid || this.currentUserId;

      console.log('[Server] ========================================');
      console.log('[Server] Deleting resource');
      console.log('[Server] Resource ID:', args.resourceId);
      console.log('[Server] Private Resource ID:', args.privateResourceId);
      console.log('[Server] User ID:', userid, args.userid ? '(provided)' : '(from auth)');

      // Check authentication
      if (!this.vbmsaasToken) {
        console.log('[Server] ERROR: No VBMSaaS token available! User may not be logged in.');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: 'Not authenticated. Please ensure VSCode extension has logged in.'
              })
            }
          ]
        };
      }

      // Validate userid
      if (!userid) {
        console.log('[Server] ERROR: No user ID available (not provided and not authenticated)');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: 'User ID not available. Please ensure VSCode extension has logged in.'
              })
            }
          ]
        };
      }

      // Re-set auth token before API call
      console.log('[Server] Re-setting auth token before API call');
      this.apiService.setAuthToken(this.vbmsaasToken);

      const result = await this.apiService.deleteResource({
        resourceId: args.resourceId,
        privateResourceId: args.privateResourceId,
        userid: userid
      });

      console.log('[Server] Delete resource result:', result.success ? 'Success' : result.message);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result)
          }
        ]
      };
    } catch (error) {
      console.error('[Server] Delete resource error:', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              message: error instanceof Error ? error.message : 'Failed to delete resource'
            })
          }
        ]
      };
    }
  }

  /**
   * Handle get resource basic info request
   */
  private async handleGetResourceBasicInfo(args: { mid: string; categoryId: string; withQuote?: boolean }) {
    try {
      console.log('[Server] ========================================');
      console.log('[Server] Getting resource basic info');
      console.log('[Server] Resource ID (mid):', args.mid);
      console.log('[Server] Category ID:', args.categoryId);

      // Check authentication
      if (!this.vbmsaasToken) {
        console.log('[Server] ERROR: No VBMSaaS token available! User may not be logged in.');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: 'Not logged in. Please login first.'
              })
            }
          ]
        };
      }

      // Re-set auth token before API call
      console.log('[Server] Re-setting auth token before API call');
      this.apiService.setAuthToken(this.vbmsaasToken);

      const result = await this.apiService.getResourceBasicInfo({
        mid: args.mid,
        categoryId: args.categoryId,
        withQuote: args.withQuote
      });

      console.log('[Server] Get resource basic info result:', result.success ? 'Success' : result.message);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result)
          }
        ]
      };
    } catch (error) {
      console.error('[Server] Get resource basic info error:', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              message: error instanceof Error ? error.message : 'Failed to get resource basic info'
            })
          }
        ]
      };
    }
  }

  /**
   * Handle get resource detail request
   */
  private async handleGetResourceDetail(args: { id: string }) {
    try {
      console.log('[Server] ========================================');
      console.log('[Server] Getting resource detail');
      console.log('[Server] Resource ID:', args.id);

      // Check authentication
      if (!this.vbmsaasToken) {
        console.log('[Server] ERROR: No VBMSaaS token available! User may not be logged in.');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: 'Not logged in. Please login first.'
              })
            }
          ]
        };
      }

      // Re-set auth token before API call
      console.log('[Server] Re-setting auth token before API call');
      this.apiService.setAuthToken(this.vbmsaasToken);

      const result = await this.apiService.getResourceDetail({
        id: args.id
      });

      console.log('[Server] Get resource detail result:', result.success ? 'Success' : result.message);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result)
          }
        ]
      };
    } catch (error) {
      console.error('[Server] Get resource detail error:', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              message: error instanceof Error ? error.message : 'Failed to get resource detail'
            })
          }
        ]
      };
    }
  }

  /**
   * Handle update resource field request
   */
  private async handleUpdateResourceField(args: { resId: string; name: string; fieldData: any }) {
    try {
      console.log('[Server] ========================================');
      console.log('[Server] Updating resource field');
      console.log('[Server] Resource ID:', args.resId);
      console.log('[Server] Field name:', args.name);

      // Check authentication
      if (!this.vbmsaasToken) {
        console.log('[Server] ERROR: No VBMSaaS token available! User may not be logged in.');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: 'Not logged in. Please login first.'
              })
            }
          ]
        };
      }

      // Re-set auth token before API call
      console.log('[Server] Re-setting auth token before API call');
      this.apiService.setAuthToken(this.vbmsaasToken);

      const result = await this.apiService.updateResourceField({
        resId: args.resId,
        name: args.name,
        fieldData: args.fieldData
      });

      console.log('[Server] Update resource field result:', result.success ? 'Success' : result.message);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result)
          }
        ]
      };
    } catch (error) {
      console.error('[Server] Update resource field error:', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              message: error instanceof Error ? error.message : 'Failed to update resource field'
            })
          }
        ]
      };
    }
  }

  /**
   * Handle add resource field request
   */
  private async handleAddResourceField(args: { resId: string; fieldData: any }) {
    try {
      console.log('[Server] ========================================');
      console.log('[Server] Adding resource field');
      console.log('[Server] Resource ID:', args.resId);
      console.log('[Server] Field name:', args.fieldData?.FieldName);

      // Check authentication
      if (!this.vbmsaasToken) {
        console.log('[Server] ERROR: No VBMSaaS token available! User may not be logged in.');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: 'Not logged in. Please login first.'
              })
            }
          ]
        };
      }

      // Re-set auth token before API call
      console.log('[Server] Re-setting auth token before API call');
      this.apiService.setAuthToken(this.vbmsaasToken);

      const result = await this.apiService.addResourceField({
        resId: args.resId,
        fieldData: args.fieldData
      });

      console.log('[Server] Add resource field result:', result.success ? 'Success' : result.message);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result)
          }
        ]
      };
    } catch (error) {
      console.error('[Server] Add resource field error:', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              message: error instanceof Error ? error.message : 'Failed to add resource field'
            })
          }
        ]
      };
    }
  }

  /**
   * Handle delete resource field request
   */
  private async handleDeleteResourceField(args: { resId: string; name: string }) {
    try {
      console.log('[Server] ========================================');
      console.log('[Server] Deleting resource field');
      console.log('[Server] Resource ID:', args.resId);
      console.log('[Server] Field name:', args.name);

      // Check authentication
      if (!this.vbmsaasToken) {
        console.log('[Server] ERROR: No VBMSaaS token available! User may not be logged in.');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: 'Not logged in. Please login first.'
              })
            }
          ]
        };
      }

      // Re-set auth token before API call
      console.log('[Server] Re-setting auth token before API call');
      this.apiService.setAuthToken(this.vbmsaasToken);

      const result = await this.apiService.deleteResourceField({
        resId: args.resId,
        name: args.name
      });

      console.log('[Server] Delete resource field result:', result.success ? 'Success' : result.message);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result)
          }
        ]
      };
    } catch (error) {
      console.error('[Server] Delete resource field error:', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              message: error instanceof Error ? error.message : 'Failed to delete resource field'
            })
          }
        ]
      };
    }
  }

  /**
   * Load saved authentication from storage
   */
  private async loadSavedAuth(): Promise<void> {
    try {
      console.log('[Server] ========================================');
      console.log('[Server] Loading saved authentication...');

      const savedAuth = await this.authStorage.loadAuth();

      if (!savedAuth) {
        console.log('[Server] No saved authentication found');
        console.log('[Server] ========================================');
        return;
      }

      // Check if auth is expired
      if (this.authStorage.isAuthExpired(savedAuth)) {
        console.log('[Server] ⚠️ Saved authentication expired (>7 days)');

        // Try to re-login if we have account and password
        if (savedAuth.account && savedAuth.password && savedAuth.partitionId) {
          console.log('[Server] Attempting auto re-login...');
          await this.autoReLogin(savedAuth.account, savedAuth.password, savedAuth.partitionId);
        } else {
          console.log('[Server] Cannot auto re-login: missing credentials');
          await this.authStorage.clearAuth();
        }

        console.log('[Server] ========================================');
        return;
      }

      // Restore authentication state
      this.vbmsaasToken = savedAuth.token;
      this.currentUserId = savedAuth.userId;

      // Set auth token in API service
      this.apiService.setAuthToken(savedAuth.token, savedAuth.secret);

      console.log('[Server] ✅ Authentication restored from storage');
      console.log('[Server] User ID:', this.currentUserId);
      console.log('[Server] Account:', savedAuth.account || 'N/A');
      console.log('[Server] Partition ID:', savedAuth.partitionId || 'N/A');
      console.log('[Server] ========================================');
    } catch (error) {
      console.error('[Server] Failed to load saved auth:', error);
      console.log('[Server] ========================================');
    }
  }

  /**
   * Auto re-login when saved auth is expired
   */
  private async autoReLogin(account: string, password: string, partitionId: string): Promise<void> {
    try {
      console.log('[Server] Auto re-login for account:', account);

      const response = await this.apiService.loginUser(
        account,
        password,
        partitionId,
        process.env.VBMSAAS_PLATFORM_ID || '',
        'PC'
      );

      if (response.success && response.token && response.secret) {
        // Save new authentication
        this.vbmsaasToken = response.token;
        this.currentUserId = (response.user as any)?.userId || (response.user as any)?.id || null;

        this.apiService.setAuthToken(response.token, response.secret);

        // Save to storage
        await this.authStorage.saveAuth({
          token: response.token,
          secret: response.secret,
          userId: this.currentUserId!,
          partitionId: partitionId,
          account: account,
          password: password,
          timestamp: Date.now()
        });

        console.log('[Server] ✅ Auto re-login successful');
      } else {
        console.log('[Server] ❌ Auto re-login failed:', response.message);
        await this.authStorage.clearAuth();
      }
    } catch (error) {
      console.error('[Server] Auto re-login error:', error);
      await this.authStorage.clearAuth();
    }
  }

  /**
   * Save authentication to storage
   */
  private async saveAuthToStorage(
    token: string,
    secret: string,
    userId: string,
    partitionId?: string,
    account?: string,
    password?: string
  ): Promise<void> {
    try {
      await this.authStorage.saveAuth({
        token,
        secret,
        userId,
        partitionId,
        account,
        password,
        timestamp: Date.now()
      });
      console.log('[Server] ✅ Authentication saved to storage');
    } catch (error) {
      console.error('[Server] Failed to save auth to storage:', error);
    }
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    // Load saved authentication before starting
    await this.loadSavedAuth();

    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    // Log to stderr (stdout is used for MCP protocol)
    console.error('VBMSaaS MCP Server started successfully');
    console.error(`Server: ${this.config.name} v${this.config.version}`);
    console.error(`API Base URL: ${this.config.vbmsaasConfig.apiBaseUrl}`);
  }

  /**
   * Handle get menu tree request
   */
  private async handleGetMenuTree(args: {
    roleId: string;
    partId: string;
    isPC?: boolean;
    isMobile?: boolean;
    isMP?: boolean;
    menuType?: number
  }) {
    try {
      console.log('[Server] ========================================');
      console.log('[Server] Getting menu tree');
      console.log('[Server] Role ID:', args.roleId);
      console.log('[Server] Part ID:', args.partId);
      console.log('[Server] Is PC:', args.isPC ?? true);
      console.log('[Server] Is Mobile:', args.isMobile ?? false);
      console.log('[Server] Is MP:', args.isMP ?? false);

      // Check authentication
      if (!this.vbmsaasToken) {
        console.log('[Server] ERROR: No VBMSaaS token available! User may not be logged in.');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: 'Not logged in. Please login first.'
              })
            }
          ]
        };
      }

      // Re-set auth token before API call
      console.log('[Server] Re-setting auth token before API call');
      this.apiService.setAuthToken(this.vbmsaasToken);

      const result = await this.apiService.getMenuTree({
        roleId: args.roleId,
        partId: args.partId,
        isPC: args.isPC,
        isMobile: args.isMobile,
        isMP: args.isMP,
        menuType: args.menuType
      });

      console.log('[Server] Get menu tree result:', result.success ? 'Success' : result.message);
      if (result.success && result.menuTree) {
        console.log('[Server] Menu count:', result.menuTree.length);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result)
          }
        ]
      };
    } catch (error) {
      console.error('[Server] Get menu tree error:', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              message: error instanceof Error ? error.message : 'Failed to get menu tree'
            })
          }
        ]
      };
    }
  }

  /**
   * Handle add menu request
   */
  private async handleAddMenu(args: {
    name: string;
    partId: string;
    level: number;
    nodeType: number;
    pid?: string;
    description?: string;
    pageId?: string;
    menuType?: number;
    orderNo?: number;
    iconClass?: string;
    isPC?: boolean;
    isMobile?: boolean;
    isMP?: boolean;
    isNewPage?: boolean;
    params?: string;
    tags?: string;
  }) {
    try {
      console.log('[Server] ========================================');
      console.log('[Server] Adding menu');
      console.log('[Server] Menu name:', args.name);
      console.log('[Server] Part ID:', args.partId);
      console.log('[Server] Level:', args.level);
      console.log('[Server] Node type:', args.nodeType);

      // Check authentication
      if (!this.vbmsaasToken) {
        console.log('[Server] ERROR: No VBMSaaS token available! User may not be logged in.');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: 'Not logged in. Please login first.'
              })
            }
          ]
        };
      }

      // Re-set auth token before API call
      console.log('[Server] Re-setting auth token before API call');
      this.apiService.setAuthToken(this.vbmsaasToken);

      const result = await this.apiService.addMenu({
        menuData: {
          id: '',
          pid: args.pid || null,
          name: args.name,
          description: args.description,
          level: args.level,
          nodeType: args.nodeType,
          pageId: args.pageId,
          page: null,
          partId: args.partId,
          menuType: args.menuType ?? 1,
          orderNo: args.orderNo ?? 0,
          isNewPage: args.isNewPage ?? false,
          iconClass: args.iconClass,
          isPC: args.isPC ?? true,
          isMobile: args.isMobile ?? false,
          isMP: args.isMP ?? false,
          params: args.params ?? '',
          tags: args.tags ?? ''
        }
      });

      console.log('[Server] Add menu result:', result.success ? 'Success' : result.message);
      if (result.success && result.menuId) {
        console.log('[Server] Menu ID:', result.menuId);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result)
          }
        ]
      };
    } catch (error) {
      console.error('[Server] Add menu error:', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              message: error instanceof Error ? error.message : 'Failed to add menu'
            })
          }
        ]
      };
    }
  }

  /**
   * Handle add page request
   */
  private async handleAddPage(args: {
    name: string;
    code: string;
    partId: string;
    url: string;
    pageType?: number;
    description?: string;
    funcId?: string;
    isMap?: boolean;
    isMulti?: boolean;
    isSys?: boolean;
  }) {
    try {
      console.log('[Server] ========================================');
      console.log('[Server] Adding page');
      console.log('[Server] Page name:', args.name);
      console.log('[Server] Page code:', args.code);
      console.log('[Server] Part ID:', args.partId);
      console.log('[Server] URL:', args.url);

      // Check authentication
      if (!this.vbmsaasToken) {
        console.log('[Server] ERROR: No VBMSaaS token available! User may not be logged in.');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: 'Not logged in. Please login first.'
              })
            }
          ]
        };
      }

      // Re-set auth token before API call
      console.log('[Server] Re-setting auth token before API call');
      this.apiService.setAuthToken(this.vbmsaasToken);

      const result = await this.apiService.addPage({
        pageData: {
          id: '',
          name: args.name,
          code: args.code,
          description: args.description,
          partId: args.partId,
          pageType: args.pageType ?? 1,
          url: args.url,
          funcId: args.funcId || null,
          isMap: args.isMap ?? false,
          isMulti: args.isMulti ?? false,
          isSys: args.isSys ?? false
        }
      });

      console.log('[Server] Add page result:', result.success ? 'Success' : result.message);
      if (result.success && result.pageId) {
        console.log('[Server] Page ID:', result.pageId);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result)
          }
        ]
      };
    } catch (error) {
      console.error('[Server] Add page error:', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              message: error instanceof Error ? error.message : 'Failed to add page'
            })
          }
        ]
      };
    }
  }

  /**
   * Handle get pages request
   */
  private async handleGetPages(args: {
    partId: string;
    page?: number;
    size?: number;
    pageType?: number;
  }) {
    try {
      console.log('[Server] ========================================');
      console.log('[Server] Getting pages');
      console.log('[Server] Part ID:', args.partId);
      console.log('[Server] Page:', args.page ?? 0);
      console.log('[Server] Size:', args.size ?? 10);
      console.log('[Server] Page type:', args.pageType ?? 1);

      // Check authentication
      if (!this.vbmsaasToken) {
        console.log('[Server] ERROR: No VBMSaaS token available! User may not be logged in.');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: 'Not logged in. Please login first.'
              })
            }
          ]
        };
      }

      // Re-set auth token before API call
      console.log('[Server] Re-setting auth token before API call');
      this.apiService.setAuthToken(this.vbmsaasToken);

      const result = await this.apiService.getPages({
        partId: args.partId,
        page: args.page,
        size: args.size,
        pageType: args.pageType
      });

      console.log('[Server] Get pages result:', result.success ? 'Success' : result.message);
      if (result.success) {
        console.log('[Server] Total elements:', result.totalElements);
        console.log('[Server] Total pages:', result.totalPages);
        console.log('[Server] Pages count:', result.pages?.length || 0);
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result)
          }
        ]
      };
    } catch (error) {
      console.error('[Server] Get pages error:', error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              message: error instanceof Error ? error.message : 'Failed to get pages'
            })
          }
        ]
      };
    }
  }
}

