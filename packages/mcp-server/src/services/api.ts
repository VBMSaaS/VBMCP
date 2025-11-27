/**
 * VBMSaaS API Service
 * 
 * Handles communication with VBMSaaS platform backend services
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  VBMSaaSConfig,
  ServiceCallRequest,
  ServiceCallResponse,
  User,
  UserInfoResponse,
  VBMSaaSInitialLoginRequest,
  VBMSaaSInitialLoginResponse,
  VBMSaaSFinalLoginRequest,
  VBMSaaSFinalLoginResponse,
  Partition,
  GetResourcesRequest,
  GetResourcesResponse,
  PrivateResource,
  AddResourceRequest,
  AddResourceResponse,
  AddPrivateResourceRequest,
  AddPrivateResourceResponse,
  DeleteResourceRequest,
  DeleteResourceResponse,
  GetResourceBasicInfoRequest,
  GetResourceBasicInfoResponse,
  GetResourceDetailRequest,
  GetResourceDetailResponse,
  UpdateResourceFieldRequest,
  UpdateResourceFieldResponse,
  AddResourceFieldRequest,
  AddResourceFieldResponse,
  DeleteResourceFieldRequest,
  DeleteResourceFieldResponse,
  GetMenuTreeRequest,
  GetMenuTreeResponse,
  AddMenuRequest,
  AddMenuResponse,
  AddPageRequest,
  AddPageResponse,
  GetPagesRequest,
  GetPagesResponse,
  QueryResourceDataRequest,
  QueryResourceDataResponse,
  GetResourceDataRequest,
  GetResourceDataResponse,
  UpdateResourceDataRequest,
  UpdateResourceDataResponse,
  DeleteResourceDataRequest,
  DeleteResourceDataResponse,
  BatchResourceDataRequest,
  BatchResourceDataResponse
} from '../types.js';
import { SignatureHelper } from '../utils/SignatureHelper.js';

export class VBMSaaSApiService {
  private client: AxiosInstance;
  private config: VBMSaaSConfig;
  private accessKey: string;
  private secret: string | null = null;  // Signature secret key

  constructor(config: VBMSaaSConfig, accessKey?: string) {
    this.config = config;
    this.accessKey = accessKey || process.env.VBMSAAS_ACCESS_KEY || '';

    // Initialize secret from config if provided
    if (config.secret) {
      this.secret = config.secret;
      console.log('[VBMSaaSApiService] Secret key loaded from config');
    }

    console.log('[VBMSaaSApiService] Initializing...');
    console.log('[VBMSaaSApiService] API Base URL:', config.apiBaseUrl);
    console.log('[VBMSaaSApiService] Access Key:', accessKey);
    console.log('[VBMSaaSApiService] Secret:', this.secret ? '***configured***' : 'not set');
    console.log('[VBMSaaSApiService] Timeout:', config.timeout || 30000);

    // Create axios instance with default configuration
    this.client = axios.create({
      baseURL: config.apiBaseUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'VBMSaaS-MCP-Server/1.0.0',
        'Vb-Access-Key': accessKey
      }
    });

    // Add request interceptor for authentication
    this.client.interceptors.request.use(
      (config) => {
        // Ensure Vb-Access-Key is always present
        if (!config.headers) {
          config.headers = {} as any;
        }
        config.headers['Vb-Access-Key'] = this.accessKey;

        if (this.config.apiKey) {
          config.headers['X-API-Key'] = this.config.apiKey;
        }

        // Check if this is a login request
        const isLoginRequest = config.url?.includes('/api/user/login');

        console.error('[VBMSaaSApiService] ========================================');
        console.error('[VBMSaaSApiService] Request Interceptor');
        console.error('[VBMSaaSApiService] URL:', config.url);
        console.error('[VBMSaaSApiService] Is Login Request:', isLoginRequest);
        console.error('[VBMSaaSApiService] Current secret:', this.secret ? '***' + this.secret.substring(this.secret.length - 10) : 'NULL');
        console.error('[VBMSaaSApiService] ========================================');

        // For login requests: DO NOT add token or signature
        if (isLoginRequest) {
          console.error('[VBMSaaSApiService] ⚠️ Login request detected - removing Authorization and skipping signature');
          // Remove Authorization header for login requests
          delete config.headers['Authorization'];
        } else {
          console.error('[VBMSaaSApiService] ⚠️⚠️⚠️ Non-login request - calling addSignatureHeaders');
          // For non-login requests: Add signature if secret is available
          config = this.addSignatureHeaders(config);
          console.error('[VBMSaaSApiService] ✅ addSignatureHeaders returned');
        }

        // Log request details for debugging
        const fullUrl = `${config.baseURL}${config.url}${config.params ? '?' + new URLSearchParams(config.params).toString() : ''}`;
        console.log('[VBMSaaSApiService] ========================================');
        console.log('[VBMSaaSApiService] OUTGOING REQUEST:');
        console.log('[VBMSaaSApiService] Method:', config.method?.toUpperCase());
        console.log('[VBMSaaSApiService] URL:', config.url);
        console.log('[VBMSaaSApiService] Base URL:', config.baseURL);
        console.log('[VBMSaaSApiService] Full URL:', fullUrl);
        console.log('[VBMSaaSApiService] Is Login Request:', isLoginRequest);
        console.log('[VBMSaaSApiService] Params:', JSON.stringify(config.params, null, 2));
        console.log('[VBMSaaSApiService] Body:', typeof config.data === 'string' ? config.data : JSON.stringify(config.data, null, 2));
        console.log('[VBMSaaSApiService] Headers:');
        console.log('[VBMSaaSApiService]   Authorization:', config.headers['Authorization']);
        console.log('[VBMSaaSApiService]   Vb-Access-Key:', config.headers['Vb-Access-Key']);
        console.log('[VBMSaaSApiService]   vb-sign:', config.headers['vb-sign']);
        console.log('[VBMSaaSApiService]   vb-timestamp:', config.headers['vb-timestamp']);
        console.log('[VBMSaaSApiService]   Content-Type:', config.headers['Content-Type']);
        console.log('[VBMSaaSApiService]   All headers:', JSON.stringify(config.headers, null, 2));
        console.log('[VBMSaaSApiService] ========================================');

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log('[VBMSaaSApiService] ========================================');
        console.log('[VBMSaaSApiService] RESPONSE RECEIVED:');
        console.log('[VBMSaaSApiService] Status:', response.status);
        console.log('[VBMSaaSApiService] Status Text:', response.statusText);
        console.log('[VBMSaaSApiService] Data:', JSON.stringify(response.data, null, 2));
        console.log('[VBMSaaSApiService] ========================================');
        return response;
      },
      (error: AxiosError) => {
        console.error('[VBMSaaSApiService] ========================================');
        console.error('[VBMSaaSApiService] RESPONSE ERROR:');
        if (error.response) {
          console.error('[VBMSaaSApiService] Status:', error.response.status);
          console.error('[VBMSaaSApiService] Status Text:', error.response.statusText);
          console.error('[VBMSaaSApiService] Data:', JSON.stringify(error.response.data, null, 2));
          console.error('[VBMSaaSApiService] Headers:', JSON.stringify(error.response.headers, null, 2));
        } else if (error.request) {
          console.error('[VBMSaaSApiService] No response received');
          console.error('[VBMSaaSApiService] Request:', error.request);
        } else {
          console.error('[VBMSaaSApiService] Error:', error.message);
        }
        console.error('[VBMSaaSApiService] ========================================');
        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  /**
   * Set authentication token for API requests
   *
   * @param token - JWT token
   * @param secret - Signature secret key (optional)
   */
  setAuthToken(token: string, secret?: string): void {
    console.log('[VBMSaaSApiService] ========================================');
    console.log('[VBMSaaSApiService] setAuthToken called');
    console.log('[VBMSaaSApiService] Token:', token ? token.substring(0, 50) + '...' : 'NULL');
    console.log('[VBMSaaSApiService] Secret param:', secret ? '***' + secret.substring(secret.length - 10) : 'NULL');
    console.log('[VBMSaaSApiService] Current secret before:', this.secret ? '***' + this.secret.substring(this.secret.length - 10) : 'NULL');
    console.log('[VBMSaaSApiService] ========================================');

    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    this.client.defaults.headers.common['Vb-Access-Key'] = this.accessKey;

    if (secret) {
      this.secret = secret;
      console.log('[VBMSaaSApiService] ✅ Secret key set to:', '***' + secret.substring(secret.length - 10));
    } else {
      console.warn('[VBMSaaSApiService] ⚠️ No secret provided to setAuthToken');
    }

    console.log('[VBMSaaSApiService] Current secret after:', this.secret ? '***' + this.secret.substring(this.secret.length - 10) : 'NULL');
    console.log('[VBMSaaSApiService] Auth token set');
    console.log('[VBMSaaSApiService] Authorization:', `Bearer ${token.substring(0, 50)}...`);
    console.log('[VBMSaaSApiService] Vb-Access-Key:', this.accessKey);
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    delete this.client.defaults.headers.common['Authorization'];
    this.secret = null;
  }

  /**
   * Add signature headers to request config
   *
   * @param config - Axios request config
   * @returns Updated config with signature headers
   */
  private addSignatureHeaders(config: any): any {
    console.log('[VBMSaaSApiService] ========================================');
    console.log('[VBMSaaSApiService] addSignatureHeaders called');
    console.log('[VBMSaaSApiService] Current secret:', this.secret ? '***' + this.secret.substring(this.secret.length - 10) : 'NULL');
    console.log('[VBMSaaSApiService] ========================================');

    if (!this.secret) {
      console.warn('[VBMSaaSApiService] ⚠️ No secret available, skipping signature generation');
      return config;
    }

    // Parse query parameters from URL
    const queryParams: Record<string, any> = {};

    // First, get params from config.params
    if (config.params) {
      Object.assign(queryParams, config.params);
    }

    // Also parse query string from URL if present
    if (config.url && config.url.includes('?')) {
      const urlParts = config.url.split('?');
      if (urlParts.length > 1) {
        const queryString = urlParts[1];
        const pairs = queryString.split('&');
        for (const pair of pairs) {
          const [key, value] = pair.split('=');
          if (key && value) {
            queryParams[decodeURIComponent(key)] = decodeURIComponent(value);
          }
        }
      }
    }

    // Parse body parameters
    const bodyParams: Record<string, any> | null =
      config.data && typeof config.data === 'object' ? config.data : null;

    // Generate timestamp
    const epochMilli = Date.now();

    console.log('[VBMSaaSApiService] Signature generation:');
    console.log('[VBMSaaSApiService]   Query params:', JSON.stringify(queryParams));
    console.log('[VBMSaaSApiService]   Body params:', JSON.stringify(bodyParams));
    console.log('[VBMSaaSApiService]   Timestamp:', epochMilli);

    // Generate signature
    const methodName = (config.method || 'GET').toUpperCase();
    const vbSign = SignatureHelper.sign(
      Object.keys(queryParams).length > 0 ? queryParams : null,
      bodyParams,
      epochMilli,
      methodName,
      this.secret
    );

    // Add signature headers
    if (!config.headers) {
      config.headers = {};
    }
    config.headers['vb-sign'] = vbSign;
    config.headers['vb-timestamp'] = epochMilli.toString();

    console.log('[VBMSaaSApiService] ✅ Signature added:', {
      method: methodName,
      timestamp: epochMilli,
      sign: vbSign
    });

    return config;
  }

  /**
   * Call VBMSaaS platform service
   * 
   * @param request - Service call request
   * @returns Service call response
   */
  async callService(request: ServiceCallRequest): Promise<ServiceCallResponse> {
    try {
      const response = await this.client.post('/api/services/call', {
        service: request.service,
        parameters: request.parameters || {}
      });

      return {
        success: true,
        data: response.data.data,
        creditsUsed: response.data.creditsUsed
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Service call failed'
      };
    }
  }

  /**
   * Get user information from VBMSaaS platform
   * 
   * @param userId - User ID
   * @returns User information
   */
  async getUserInfo(userId: string): Promise<UserInfoResponse> {
    try {
      const response = await this.client.get(`/api/users/${userId}`);
      
      const user: User = {
        id: response.data.id,
        email: response.data.email,
        name: response.data.name,
        plan: response.data.plan,
        credits: response.data.credits,
        createdAt: new Date(response.data.createdAt)
      };

      return {
        success: true,
        user
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get user info'
      };
    }
  }

  /**
   * Direct login with all parameters (simplified single-step login)
   *
   * @param account - User account (phone/email)
   * @param password - User password
   * @param platformId - Platform ID (required)
   * @param partitionId - Partition ID (optional, only for final login)
   * @param roleTag - Role tag (optional, default: "PC")
   * @returns Login response with user info and token
   */
  async loginDirect(
    account: string,
    password: string,
    platformId?: string,
    partitionId?: string,
    roleTag?: string
  ): Promise<VBMSaaSFinalLoginResponse> {
    try {
      // Prepare auth info - only include non-null parameters
      const authInfo: any = {
        account,
        password
      };

      // Add optional parameters only if provided
      if (platformId) {
        authInfo.platformId = platformId;
      }
      if (partitionId) {
        authInfo.partitionId = partitionId;
      }
      if (roleTag) {
        authInfo.roleTag = roleTag;
      }

      // Base64 encode the auth info
      const authInfoBase64 = Buffer.from(JSON.stringify(authInfo)).toString('base64');

      const fullUrl = `${this.client.defaults.baseURL}/api/user/login`;
      console.log('[DEBUG] ========================================');
      console.log('[DEBUG] Direct Login API Call');
      console.log('[DEBUG] ========================================');
      console.log('[DEBUG] Full URL:', fullUrl);
      console.log('[DEBUG] Base URL:', this.client.defaults.baseURL);
      console.log('[DEBUG] Endpoint:', '/api/user/login');
      console.log('[DEBUG] Account:', account);
      console.log('[DEBUG] Platform ID:', platformId);
      console.log('[DEBUG] Partition ID:', partitionId);
      console.log('[DEBUG] Role Tag:', roleTag);
      console.log('[DEBUG] Auth info base64:', authInfoBase64);
      console.log('[DEBUG] Request headers:', this.client.defaults.headers);
      console.log('[DEBUG] ========================================');

      const response = await this.client.post('/api/user/login', {
        authinfo: authInfoBase64
      });

      console.log('[DEBUG] Direct login response status:', response.status);
      console.log('[DEBUG] Direct login response data:', JSON.stringify(response.data, null, 2));

      // Check for error response
      if (response.data?.Status && response.data.Status !== 200) {
        return {
          success: false,
          message: response.data.Message || 'Login failed',
          data: response.data
        };
      }

      // Extract user info, token and secret from response
      const userData = response.data?.Result || response.data?.data || response.data;
      const token = userData?.token || userData?.accessToken || userData?.Token || userData?.AccessToken;
      const secret = userData?.secret || userData?.Secret;

      if (secret) {
        console.log('[DEBUG] Secret key received:', secret);
      }

      // Set auth token and secret for subsequent API calls
      if (token) {
        console.log('[DEBUG] Setting auth token and secret for API service');
        this.setAuthToken(token, secret);
      }

      return {
        success: true,
        user: userData,
        token: token || 'no-token-in-response',
        secret: secret,
        data: response.data
      };
    } catch (error: any) {
      console.error('[DEBUG] Direct login error:', error);
      if (error.response) {
        console.error('[DEBUG] Error response:', JSON.stringify(error.response.data, null, 2));
      }
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Direct login failed',
        data: error.response?.data
      };
    }
  }

  /**
   * Step 1: Initial login to get userId
   *
   * @param account - User account (phone/email)
   * @param password - User password
   * @param platformId - Platform ID
   * @param roleTag - Role tag (default: "PC")
   * @returns Initial login response with userId
   */
  async loginUserInitial(
    account: string,
    password: string,
    platformId: string,
    roleTag: string = 'PC'
  ): Promise<VBMSaaSInitialLoginResponse> {
    try {
      // Prepare auth info without partitionId (Step 1)
      const authInfo = {
        account,
        password,
        platformId,
        roleTag
      };

      // Base64 encode the auth info
      const authInfoBase64 = Buffer.from(JSON.stringify(authInfo)).toString('base64');

      console.log('[DEBUG] Initial login request:', { account, platformId, roleTag });
      console.log('[DEBUG] Auth info base64:', authInfoBase64);

      const response = await this.client.post('/api/user/login', {
        authinfo: authInfoBase64
      });

      console.log('[DEBUG] Initial login response status:', response.status);
      console.log('[DEBUG] Initial login response data:', JSON.stringify(response.data, null, 2));

      // Check for error response (Status === 0 means success)
      if (response.data?.Status !== undefined && response.data.Status !== 0) {
        return {
          success: false,
          message: response.data.Message || 'Login failed',
          data: response.data
        };
      }

      // Extract userId from response - try multiple possible locations
      const userId = response.data?.Result?.userId
        || response.data?.Result?.id
        || response.data?.data?.userId
        || response.data?.userId
        || response.data?.data?.id
        || response.data?.id
        || response.data?.data?.user?.id
        || response.data?.user?.id;

      // Extract secret from response (needed for signing subsequent requests)
      const secret = response.data?.Result?.secret;

      if (!userId) {
        return {
          success: false,
          message: 'Failed to get userId from initial login response',
          data: response.data
        };
      }

      // Save secret if available (needed for signing subsequent requests)
      if (secret) {
        console.log('[DEBUG] Secret received from initial login, saving for request signing');
        this.secret = secret;
      } else {
        console.warn('[WARNING] No secret received from initial login');
      }

      return {
        success: true,
        userId,
        secret,
        data: response.data
      };
    } catch (error: any) {
      console.error('[DEBUG] Initial login error:', error);
      if (error.response) {
        console.error('[DEBUG] Error response:', JSON.stringify(error.response.data, null, 2));
      }
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Initial login failed',
        data: error.response?.data
      };
    }
  }

  /**
   * Step 4: Final login with selected partition
   *
   * @param account - User account (phone or email)
   * @param password - User password
   * @param partitionId - Selected partition ID
   * @param platformId - Platform ID
   * @param roleTag - Role tag (default: "")
   * @returns Final login response with complete user info
   */
  async loginUser(
    account: string,
    password: string,
    partitionId: string,
    platformId: string,
    roleTag: string = 'PC'
  ): Promise<VBMSaaSFinalLoginResponse> {
    try {
      // Prepare auth info with partitionId (Step 4)
      const authInfo = {
        account,
        password,
        platformId,
        partitionId,
        roleTag
      };

      // Base64 encode the auth info
      const authInfoBase64 = Buffer.from(JSON.stringify(authInfo)).toString('base64');

      console.log('[DEBUG] ========================================');
      console.log('[DEBUG] Final Login API Call (Step 4)');
      console.log('[DEBUG] ========================================');
      console.log('[DEBUG] Account:', account);
      console.log('[DEBUG] Platform ID:', platformId);
      console.log('[DEBUG] Partition ID:', partitionId);
      console.log('[DEBUG] Role Tag:', roleTag);
      console.log('[DEBUG] Auth info base64:', authInfoBase64);
      console.log('[DEBUG] ========================================');

      const response = await this.client.post('/api/user/login', {
        authinfo: authInfoBase64
      });

      console.log('[DEBUG] Final login response status:', response.status);
      console.log('[DEBUG] Final login response data:', JSON.stringify(response.data, null, 2));

      // Check for error response (Status === 0 means success)
      if (response.data?.Status !== undefined && response.data.Status !== 0) {
        return {
          success: false,
          message: response.data.Message || 'Final login failed',
          data: response.data
        };
      }

      // Extract user data, token and secret
      const userData = response.data?.Result;

      // Try multiple possible token field names
      const token = userData?.token ||
                    userData?.Token ||
                    userData?.accessToken ||
                    userData?.access_token ||
                    userData?.jwt ||
                    userData?.JWT;

      // Extract secret key
      const secret = userData?.secret || userData?.Secret;

      console.log('[DEBUG] User data keys:', Object.keys(userData || {}));
      console.log('[DEBUG] Extracted token from login response:', token);
      console.log('[DEBUG] Token type:', typeof token);
      console.log('[DEBUG] Token length:', token?.length);
      if (secret) {
        console.log('[DEBUG] Extracted secret:', secret);
      }

      if (!userData || !token) {
        return {
          success: false,
          message: 'Failed to get user data or token from final login response',
          data: response.data
        };
      }

      // Store the token and secret for subsequent API calls
      console.log('[DEBUG] Setting auth token and secret');
      this.setAuthToken(token, secret);

      return {
        success: true,
        user: userData,
        token,
        secret,
        data: response.data
      };
    } catch (error: any) {
      console.error('[DEBUG] Final login error:', error);
      if (error.response) {
        console.error('[DEBUG] Error response:', JSON.stringify(error.response.data, null, 2));
      }
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Final login failed',
        data: error.response?.data
      };
    }
  }

  /**
   * Step 2: Get all partitions (applications) for user
   *
   * @param userId - User ID from step 1
   * @returns List of partitions user can access
   */
  async getAllPartitionUsers(userId: string): Promise<{ success: boolean; partitions?: Partition[]; message?: string; data?: any }> {
    try {
      console.log('[DEBUG] ========================================');
      console.log('[DEBUG] Get All Partitions API Call');
      console.log('[DEBUG] ========================================');
      console.log('[DEBUG] User ID:', userId);
      console.log('[DEBUG] URL:', `/api/user/partition/all?userId=${userId}&cst=1`);
      console.log('[DEBUG] ========================================');

      const response = await this.client.get(`/api/user/partition/all?userId=${userId}&cst=1`);

      console.log('[DEBUG] Get partitions response status:', response.status);
      console.log('[DEBUG] Get partitions response data:', JSON.stringify(response.data, null, 2));

      // Check for error response
      if (response.data?.Status && response.data.Status !== 0) {
        console.error('[ERROR] Get partitions failed with Status:', response.data.Status);
        console.error('[ERROR] Message:', response.data.Message);
        return {
          success: false,
          message: response.data.Message || 'Failed to get partitions',
          data: response.data
        };
      }

      // Extract partitions from Result field
      const partitions: Partition[] = response.data?.Result || [];

      console.log('[DEBUG] Parsed partitions count:', partitions.length);
      if (partitions.length > 0) {
        console.log('[DEBUG] First partition:', JSON.stringify(partitions[0], null, 2));
      } else {
        console.error('[WARNING] No partitions found in response!');
        console.error('[WARNING] Response.data.Result:', response.data?.Result);
        console.error('[WARNING] Response.data keys:', Object.keys(response.data || {}));
      }

      return {
        success: true,
        partitions,
        data: response.data
      };
    } catch (error: any) {
      console.error('[DEBUG] Get partitions error:', error);
      if (error.response) {
        console.error('[DEBUG] Error response:', JSON.stringify(error.response.data, null, 2));
      }
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to get partitions',
        data: error.response?.data
      };
    }
  }

  /**
   * Complete four-step login flow
   *
   * @param account - User account (phone/email)
   * @param password - User password
   * @param partitionSelector - Optional function to select partition when multiple available
   * @returns Login response with user and token
   */
  async login(
    account: string,
    password: string,
    partitionSelector?: (partitions: Partition[]) => Promise<string | null>
  ): Promise<{ user: User; token: string }> {
    // Step 1: Initial login to get userId
    const platformId = process.env.VBMSAAS_PLATFORM_ID || '';
    const initialLogin = await this.loginUserInitial(account, password, platformId);

    if (!initialLogin.success || !initialLogin.userId) {
      throw new Error(initialLogin.message || 'Initial login failed');
    }

    // Step 2: Get all partitions
    const partitionsResult = await this.getAllPartitionUsers(initialLogin.userId);

    if (!partitionsResult.success || !partitionsResult.partitions) {
      throw new Error(partitionsResult.message || 'Failed to get partitions');
    }

    const partitions = partitionsResult.partitions;

    // Step 3: Application selection logic
    let selectedPartitionId: string | null = null;

    if (partitions.length === 0) {
      throw new Error('User has no registered applications');
    } else if (partitions.length === 1) {
      // Single application - auto select
      selectedPartitionId = partitions[0].id;
    } else {
      // Multiple applications - need user selection
      if (partitionSelector) {
        selectedPartitionId = await partitionSelector(partitions);
      } else {
        // Default: select first partition
        selectedPartitionId = partitions[0].id;
      }
    }

    if (!selectedPartitionId) {
      throw new Error('No partition selected');
    }

    // Step 4: Final login with selected partition
    const finalLogin = await this.loginUser(account, password, selectedPartitionId, platformId);

    if (!finalLogin.success || !finalLogin.token) {
      throw new Error(finalLogin.message || 'Final login failed');
    }

    // Convert VBMSaaS user data to our User type
    const userData = finalLogin.user;
    const user: User = {
      id: userData?.userId || userData?.id || initialLogin.userId,
      email: account,
      name: userData?.userName || userData?.name || account,
      plan: 'professional', // Default plan, can be adjusted based on actual data
      credits: userData?.credits || 0,
      createdAt: new Date()
    };

    return {
      user,
      token: finalLogin.token
    };
  }

  /**
   * Handle API errors and convert to user-friendly messages
   * 
   * @param error - Axios error
   * @returns Error object
   */
  private handleApiError(error: AxiosError): Error {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data as { message?: string };
      
      switch (status) {
        case 401:
          return new Error('Authentication failed. Please login again.');
        case 403:
          return new Error('Access denied. Insufficient permissions.');
        case 404:
          return new Error('Service not found.');
        case 429:
          return new Error('Rate limit exceeded. Please try again later.');
        case 500:
          return new Error('Server error. Please try again later.');
        default:
          return new Error(data.message || `API error: ${status}`);
      }
    } else if (error.request) {
      // Request was made but no response received
      return new Error('Network error. Please check your connection.');
    } else {
      // Error in request configuration
      return new Error(error.message || 'Request failed');
    }
  }

  /**
   * Get all private resources for a partition
   *
   * @param request - Get resources request with partitionId and optional parameters
   * @returns Get resources response with resource list
   */
  async getPrivateResources(request: GetResourcesRequest): Promise<GetResourcesResponse> {
    try {
      const { partitionId, sf = 0, sd = 1, cst = 1 } = request;

      console.log('[VBMSaaSApiService] ========================================');
      console.log('[VBMSaaSApiService] Getting private resources for partition:', partitionId);
      console.log('[VBMSaaSApiService] Request params:', { sf, sd, cst });

      // Log all headers
      console.log('[VBMSaaSApiService] ========================================');
      console.log('[VBMSaaSApiService] CURRENT HEADERS:');
      console.log('[VBMSaaSApiService] Authorization:', this.client.defaults.headers.common['Authorization']);
      console.log('[VBMSaaSApiService] Vb-Access-Key:', this.client.defaults.headers.common['Vb-Access-Key']);
      console.log('[VBMSaaSApiService] Content-Type:', this.client.defaults.headers.common['Content-Type']);
      console.log('[VBMSaaSApiService] All common headers:', JSON.stringify(this.client.defaults.headers.common, null, 2));
      console.log('[VBMSaaSApiService] ========================================');

      // Use platformId as partitionId parameter, and send actual partitionId in POST body
      const platformId = process.env.VBMSAAS_PLATFORM_ID || '';

      // Prepare request config
      const requestConfig = {
        params: {
          partitionId: platformId,
          sf,
          sd,
          cst
        }
      };

      const requestBody = {
        dataArgs: [
          {
            partId: partitionId,
            resourceType: '@<>@configuration'
          }
        ]
      };

      // Log complete request details
      const fullUrl = `${this.client.defaults.baseURL}/api/cats/PrivateResource/datas/all?partitionId=${platformId}&sf=${sf}&sd=${sd}&cst=${cst}`;
      console.log('[VBMSaaSApiService] ========================================');
      console.log('[VBMSaaSApiService] COMPLETE REQUEST DETAILS:');
      console.log('[VBMSaaSApiService] Full URL:', fullUrl);
      console.log('[VBMSaaSApiService] Method: POST');
      console.log('[VBMSaaSApiService] Request body:', JSON.stringify(requestBody, null, 2));
      console.log('[VBMSaaSApiService] Request config:', JSON.stringify(requestConfig, null, 2));
      console.log('[VBMSaaSApiService] ========================================');

      const response = await this.client.post('/api/cats/PrivateResource/datas/all', requestBody, requestConfig);

      console.log('[VBMSaaSApiService] Get resources response status:', response.status);
      console.log('[VBMSaaSApiService] Get resources response data:', JSON.stringify(response.data, null, 2));

      // Check for error response
      if (response.data?.Status && response.data.Status !== 200) {
        const debugInfo = {
          hasAuthHeader: !!this.client.defaults.headers.common['Authorization'],
          hasAccessKey: !!this.client.defaults.headers.common['Vb-Access-Key'],
          authHeaderPreview: this.client.defaults.headers.common['Authorization']
            ? String(this.client.defaults.headers.common['Authorization']).substring(0, 50) + '...'
            : 'NOT SET',
          accessKey: this.client.defaults.headers.common['Vb-Access-Key'] || 'NOT SET',
          requestUrl: '/api/cats/PrivateResource/datas/all',
          requestMethod: 'POST',
          requestBody: requestBody,
          requestParams: requestConfig.params,
          responseStatus: response.status,
          responseStatusCode: response.data.Status,
          responseMessage: response.data.Message
        };

        return {
          success: false,
          message: response.data.Message || 'Failed to get resources',
          data: response.data,
          debug: debugInfo
        };
      }

      // Parse response data
      // The actual data structure may vary, adjust based on real API response
      let resources: PrivateResource[] = [];
      let total = 0;

      if (response.data?.Result) {
        // If Result is an array
        if (Array.isArray(response.data.Result)) {
          resources = response.data.Result.map((item: any) => ({
            id: item.id || item.Id || item.ID || '',
            name: item.name || item.Name || item.title || item.Title || '',
            code: item.code || item.Code || '',
            type: item.type || item.Type || '',
            description: item.description || item.Description || item.desc || '',
            status: item.status || item.Status || '',
            owner: item.owner || item.Owner || item.createdBy || '',
            createdAt: item.createdAt || item.CreatedAt || item.createTime ? new Date(item.createdAt || item.CreatedAt || item.createTime) : undefined,
            updatedAt: item.updatedAt || item.UpdatedAt || item.updateTime ? new Date(item.updatedAt || item.UpdatedAt || item.updateTime) : undefined,
            ...item // Keep all original fields
          }));
          total = resources.length;
        } else if (response.data.Result.items && Array.isArray(response.data.Result.items)) {
          // If Result contains items array
          resources = response.data.Result.items.map((item: any) => ({
            id: item.id || item.Id || item.ID || '',
            name: item.name || item.Name || item.title || item.Title || '',
            code: item.code || item.Code || '',
            type: item.type || item.Type || '',
            description: item.description || item.Description || item.desc || '',
            status: item.status || item.Status || '',
            owner: item.owner || item.Owner || item.createdBy || '',
            createdAt: item.createdAt || item.CreatedAt || item.createTime ? new Date(item.createdAt || item.CreatedAt || item.createTime) : undefined,
            updatedAt: item.updatedAt || item.UpdatedAt || item.updateTime ? new Date(item.updatedAt || item.UpdatedAt || item.updateTime) : undefined,
            ...item // Keep all original fields
          }));
          total = response.data.Result.total || response.data.Result.Total || resources.length;
        }
      } else if (Array.isArray(response.data)) {
        // If response.data is directly an array
        resources = response.data.map((item: any) => ({
          id: item.id || item.Id || item.ID || '',
          name: item.name || item.Name || item.title || item.Title || '',
          code: item.code || item.Code || '',
          type: item.type || item.Type || '',
          description: item.description || item.Description || item.desc || '',
          status: item.status || item.Status || '',
          owner: item.owner || item.Owner || item.createdBy || '',
          createdAt: item.createdAt || item.CreatedAt || item.createTime ? new Date(item.createdAt || item.CreatedAt || item.createTime) : undefined,
          updatedAt: item.updatedAt || item.UpdatedAt || item.updateTime ? new Date(item.updatedAt || item.UpdatedAt || item.updateTime) : undefined,
          ...item // Keep all original fields
        }));
        total = resources.length;
      }

      console.log('[VBMSaaSApiService] Parsed resources count:', resources.length);

      return {
        success: true,
        resources,
        total,
        data: response.data
      };
    } catch (error) {
      console.error('[VBMSaaSApiService] Get resources error:', error);

      let errorMessage = 'Failed to get resources';
      let errorData: any = undefined;

      // Prepare request info for debugging
      const platformId = process.env.VBMSAAS_PLATFORM_ID || '';
      const requestBody = {
        dataArgs: [
          {
            partId: request.partitionId,
            resourceType: '@<>@configuration'
          }
        ]
      };
      const requestParams = {
        partitionId: platformId,
        sf: request.sf || 0,
        sd: request.sd || 1,
        cst: request.cst || 1
      };

      let debugInfo: any = {
        hasAuthHeader: !!this.client.defaults.headers.common['Authorization'],
        hasAccessKey: !!this.client.defaults.headers.common['Vb-Access-Key'],
        authHeaderPreview: this.client.defaults.headers.common['Authorization']
          ? String(this.client.defaults.headers.common['Authorization']).substring(0, 50) + '...'
          : 'NOT SET',
        accessKey: this.client.defaults.headers.common['Vb-Access-Key'] || 'NOT SET',
        requestUrl: '/api/cats/PrivateResource/datas/all',
        requestMethod: 'POST',
        requestBody: requestBody,
        requestParams: requestParams
      };

      if (error instanceof AxiosError) {
        console.error('[VBMSaaSApiService] Error response status:', error.response?.status);
        console.error('[VBMSaaSApiService] Error response data:', JSON.stringify(error.response?.data, null, 2));
        console.error('[VBMSaaSApiService] Error response headers:', error.response?.headers);
        console.error('[VBMSaaSApiService] Error config:', error.config);

        errorMessage = error.response?.data?.Message || error.message;
        errorData = error.response?.data;

        debugInfo.responseStatus = error.response?.status;
        debugInfo.responseStatusCode = error.response?.data?.Status;
        debugInfo.responseMessage = error.response?.data?.Message;
        debugInfo.errorType = 'AxiosError';
        debugInfo.hasResponse = !!error.response;
        debugInfo.hasConfig = !!error.config;
      } else if (error instanceof Error) {
        errorMessage = error.message;
        debugInfo.errorType = 'Error';
        debugInfo.errorName = error.name;
      } else {
        debugInfo.errorType = typeof error;
      }

      return {
        success: false,
        message: errorMessage,
        data: errorData,
        debug: debugInfo
      };
    }
  }

  /**
   * Add a new resource (two-step process)
   * Step 1: Create resource definition
   * Step 2: Add to private resources
   *
   * @param request - Add resource request with resource details
   * @param partId - Application ID
   * @param partitionId - Partition ID (platformId)
   * @param userid - User ID
   * @returns Add resource response
   */
  async addResource(
    request: AddResourceRequest,
    partId: string,
    partitionId: string,
    userid: string
  ): Promise<AddResourceResponse> {
    try {
      console.log('[VBMSaaSApiService] ========================================');
      console.log('[VBMSaaSApiService] Starting two-step resource creation');
      console.log('[VBMSaaSApiService] Resource name:', request.Name);
      console.log('[VBMSaaSApiService] Type code:', request.TypeCode);
      console.log('[VBMSaaSApiService] Fields count:', request.Fields.length);
      console.log('[VBMSaaSApiService] Application ID:', partId);
      console.log('[VBMSaaSApiService] Partition ID:', partitionId);
      console.log('[VBMSaaSApiService] User ID:', userid);

      // Step 1: Create resource definition
      console.log('[VBMSaaSApiService] Step 1: Creating resource definition...');
      const response = await this.client.post('/api/resources/add', request, {
        params: {
          cst: 1
        }
      });

      console.log('[VBMSaaSApiService] Step 1 response:', response.data);

      // Check response status (Status: 0 means success, ErrorCode: 0 means no error)
      if (response.data.Status !== 0 || response.data.ErrorCode !== 0) {
        console.error('[VBMSaaSApiService] ❌ Step 1 failed:', response.data.Message);
        return {
          success: false,
          message: response.data.Message || 'Failed to create resource definition',
          data: response.data
        };
      }

      console.log('[VBMSaaSApiService] ✅ Step 1 completed successfully');

      // Extract resource ID from response (Result contains the resource ID)
      const resourceId = response.data.Result;
      console.log('[VBMSaaSApiService] Resource ID:', resourceId);

      // Step 2: Add to private resources
      console.log('[VBMSaaSApiService] Step 2: Adding to private resources...');
      const privateResourceRequest: AddPrivateResourceRequest = {
        Description: request.Description,
        Name: request.Name,
        Tags: 'private',
        typeId: resourceId,
        typeName: request.Name,
        resourceType: request.TypeCode,
        partId: partId,
        PartitionId: process.env.VBMSAAS_PLATFORM_ID || '',  // 平台ID
        inMap: false,
        inBluePrint: false
      };

      const privateResourceResult = await this.addPrivateResource(
        privateResourceRequest,
        process.env.VBMSAAS_PLATFORM_ID || '',  // 使用平台ID,不是应用分区ID
        userid
      );

      if (!privateResourceResult.success) {
        console.error('[VBMSaaSApiService] ❌ Step 2 failed:', privateResourceResult.message);
        return {
          success: false,
          message: `Resource created but failed to add to private resources: ${privateResourceResult.message}`,
          data: privateResourceResult.data,
          resourceId
        };
      }

      console.log('[VBMSaaSApiService] ✅ Step 2 completed successfully');
      console.log('[VBMSaaSApiService] ✅ Two-step resource creation completed!');

      return {
        success: true,
        message: 'Resource created and added to private resources successfully',
        data: {
          resourceDefinition: response.data,
          privateResource: privateResourceResult.data
        },
        resourceId,
        privateResourceId: privateResourceResult.privateResourceId
      };
    } catch (error) {
      console.error('[VBMSaaSApiService] Add resource error:', error);

      let errorMessage = 'Failed to add resource';
      let errorData: any = undefined;

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          console.error('[VBMSaaSApiService] Error response:', axiosError.response.data);
          errorMessage = (axiosError.response.data as any)?.Message || axiosError.message;
          errorData = axiosError.response.data;
        } else {
          errorMessage = axiosError.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        success: false,
        message: errorMessage,
        data: errorData
      };
    }
  }

  /**
   * Add resource to private resources
   *
   * @param request - Add private resource request
   * @param partitionId - Partition ID (platformId)
   * @param userid - User ID
   * @returns Add private resource response
   */
  async addPrivateResource(
    request: AddPrivateResourceRequest,
    partitionId: string,
    userid: string
  ): Promise<AddPrivateResourceResponse> {
    try {
      console.log('[VBMSaaSApiService] ========================================');
      console.log('[VBMSaaSApiService] Adding resource to private resources');
      console.log('[VBMSaaSApiService] Resource name:', request.Name);
      console.log('[VBMSaaSApiService] Type ID:', request.typeId);
      console.log('[VBMSaaSApiService] Partition ID:', partitionId);
      console.log('[VBMSaaSApiService] User ID:', userid);

      // Make API call to add private resource
      const response = await this.client.post('/api/data/add', request, {
        params: {
          category: 'PrivateResource',
          partitionId,
          userid,
          cst: 1
        }
      });

      console.log('[VBMSaaSApiService] Add private resource response:', response.data);

      // Check response status (Status: 0 means success, ErrorCode: 0 means no error)
      if (response.data.Status === 0 && response.data.ErrorCode === 0) {
        console.log('[VBMSaaSApiService] ✅ Private resource added successfully');

        // Extract private resource ID from response
        const privateResourceId = response.data.Result;

        return {
          success: true,
          message: response.data.Message || 'Private resource added successfully',
          data: response.data,
          privateResourceId
        };
      } else {
        console.error('[VBMSaaSApiService] ❌ Failed to add private resource:', response.data.Message);
        return {
          success: false,
          message: response.data.Message || 'Failed to add private resource',
          data: response.data
        };
      }
    } catch (error) {
      console.error('[VBMSaaSApiService] Add private resource error:', error);

      let errorMessage = 'Failed to add private resource';
      let errorData: any = undefined;

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          console.error('[VBMSaaSApiService] Error response:', axiosError.response.data);
          errorMessage = (axiosError.response.data as any)?.Message || axiosError.message;
          errorData = axiosError.response.data;
        } else {
          errorMessage = axiosError.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        success: false,
        message: errorMessage,
        data: errorData
      };
    }
  }

  /**
   * Delete a resource (two-step process)
   * Step 1: Delete resource definition (基础资源)
   * Step 2: Delete private resource data (私有资源)
   *
   * @param request - Delete resource request with resource IDs and user ID
   * @returns Delete resource response
   */
  async deleteResource(request: DeleteResourceRequest): Promise<DeleteResourceResponse> {
    try {
      console.log('[VBMSaaSApiService] ========================================');
      console.log('[VBMSaaSApiService] Starting two-step resource deletion');
      console.log('[VBMSaaSApiService] Resource ID (typeId):', request.resourceId);
      console.log('[VBMSaaSApiService] Private Resource ID (mid):', request.privateResourceId);
      console.log('[VBMSaaSApiService] User ID:', request.userid);

      // Step 1: Delete resource definition (基础资源)
      console.log('[VBMSaaSApiService] Step 1: Deleting resource definition (基础资源)...');
      const resourceResponse = await this.client.delete('/api/resources/deletebyid', {
        params: {
          id: request.resourceId,
          cst: 1
        }
      });

      console.log('[VBMSaaSApiService] Resource definition delete response:', resourceResponse.data);

      // Check if step 1 succeeded
      if (resourceResponse.data.Status !== 0 || resourceResponse.data.ErrorCode !== 0) {
        console.error('[VBMSaaSApiService] ❌ Step 1 failed:', resourceResponse.data.Message);
        return {
          success: false,
          message: `Failed to delete resource definition: ${resourceResponse.data.Message}`,
          data: {
            resourceDefinitionDeleted: resourceResponse.data
          }
        };
      }

      console.log('[VBMSaaSApiService] ✅ Step 1 completed successfully');

      // Step 2: Delete private resource data (私有资源) - Use GET method
      console.log('[VBMSaaSApiService] Step 2: Deleting private resource data (私有资源)...');
      const privateResourceResponse = await this.client.get('/api/data/delete', {
        params: {
          mid: request.privateResourceId,
          force: false,
          userid: request.userid,
          cst: 1
        }
      });

      console.log('[VBMSaaSApiService] Private resource delete response:', privateResourceResponse.data);

      // Check if step 2 succeeded
      if (privateResourceResponse.data.Status !== 0 || privateResourceResponse.data.ErrorCode !== 0) {
        console.error('[VBMSaaSApiService] ❌ Step 2 failed:', privateResourceResponse.data.Message);
        return {
          success: false,
          message: `Resource definition deleted but failed to delete private resource: ${privateResourceResponse.data.Message}`,
          data: {
            resourceDefinitionDeleted: resourceResponse.data,
            privateResourceDeleted: privateResourceResponse.data
          }
        };
      }

      console.log('[VBMSaaSApiService] ✅ Step 2 completed successfully');
      console.log('[VBMSaaSApiService] ✅ Two-step resource deletion completed!');

      return {
        success: true,
        message: 'Resource deleted successfully',
        data: {
          resourceDefinitionDeleted: resourceResponse.data,
          privateResourceDeleted: privateResourceResponse.data
        }
      };
    } catch (error) {
      console.error('[VBMSaaSApiService] Delete resource error:', error);

      let errorMessage = 'Failed to delete resource';
      let errorData: any = undefined;

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          console.error('[VBMSaaSApiService] Error response:', axiosError.response.data);
          errorMessage = (axiosError.response.data as any)?.Message || axiosError.message;
          errorData = axiosError.response.data;
        } else {
          errorMessage = axiosError.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        success: false,
        message: errorMessage,
        data: errorData
      };
    }
  }

  /**
   * Get resource basic info
   *
   * @param request - Get resource basic info request
   * @returns Get resource basic info response
   */
  async getResourceBasicInfo(request: GetResourceBasicInfoRequest): Promise<GetResourceBasicInfoResponse> {
    try {
      console.log('[VBMSaaSApiService] ========================================');
      console.log('[VBMSaaSApiService] Getting resource basic info');
      console.log('[VBMSaaSApiService] Resource ID (mid):', request.mid);
      console.log('[VBMSaaSApiService] Category ID:', request.categoryId);

      const response = await this.client.get('/api/data/get', {
        params: {
          mid: request.mid,
          categoryId: request.categoryId,
          withQuote: request.withQuote !== undefined ? request.withQuote : true,
          cst: request.cst || 1
        }
      });

      console.log('[VBMSaaSApiService] Get resource basic info response:', response.data);

      if (response.data.Status === 0 && response.data.ErrorCode === 0) {
        console.log('[VBMSaaSApiService] ✅ Resource basic info retrieved successfully');
        return {
          success: true,
          message: response.data.Message || 'Resource basic info retrieved successfully',
          data: response.data
        };
      } else {
        console.error('[VBMSaaSApiService] ❌ Failed to get resource basic info:', response.data.Message);
        return {
          success: false,
          message: response.data.Message || 'Failed to get resource basic info',
          data: response.data
        };
      }
    } catch (error) {
      console.error('[VBMSaaSApiService] Get resource basic info error:', error);

      let errorMessage = 'Failed to get resource basic info';
      let errorData: any = undefined;

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          console.error('[VBMSaaSApiService] Error response:', axiosError.response.data);
          errorMessage = (axiosError.response.data as any)?.Message || axiosError.message;
          errorData = axiosError.response.data;
        } else {
          errorMessage = axiosError.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        success: false,
        message: errorMessage,
        data: errorData
      };
    }
  }

  /**
   * Get resource detail (including field definitions)
   *
   * @param request - Get resource detail request
   * @returns Get resource detail response
   */
  async getResourceDetail(request: GetResourceDetailRequest): Promise<GetResourceDetailResponse> {
    try {
      console.log('[VBMSaaSApiService] ========================================');
      console.log('[VBMSaaSApiService] Getting resource detail');
      console.log('[VBMSaaSApiService] Resource ID:', request.id);

      const response = await this.client.get('/api/resources/getbyid', {
        params: {
          id: request.id,
          cst: request.cst || 1
        }
      });

      console.log('[VBMSaaSApiService] Get resource detail response:', response.data);

      if (response.data.Status === 0 && response.data.ErrorCode === 0) {
        console.log('[VBMSaaSApiService] ✅ Resource detail retrieved successfully');
        return {
          success: true,
          message: response.data.Message || 'Resource detail retrieved successfully',
          data: response.data
        };
      } else {
        console.error('[VBMSaaSApiService] ❌ Failed to get resource detail:', response.data.Message);
        return {
          success: false,
          message: response.data.Message || 'Failed to get resource detail',
          data: response.data
        };
      }
    } catch (error) {
      console.error('[VBMSaaSApiService] Get resource detail error:', error);

      let errorMessage = 'Failed to get resource detail';
      let errorData: any = undefined;

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          console.error('[VBMSaaSApiService] Error response:', axiosError.response.data);
          errorMessage = (axiosError.response.data as any)?.Message || axiosError.message;
          errorData = axiosError.response.data;
        } else {
          errorMessage = axiosError.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        success: false,
        message: errorMessage,
        data: errorData
      };
    }
  }

  /**
   * Update resource field
   *
   * @param request - Update resource field request
   * @returns Update resource field response
   */
  async updateResourceField(request: UpdateResourceFieldRequest): Promise<UpdateResourceFieldResponse> {
    try {
      console.log('[VBMSaaSApiService] ========================================');
      console.log('[VBMSaaSApiService] Updating resource field');
      console.log('[VBMSaaSApiService] Resource ID:', request.resId);
      console.log('[VBMSaaSApiService] Field name:', request.name);

      const response = await this.client.post('/api/resources/field-update', request.fieldData, {
        params: {
          resId: request.resId,
          name: request.name,
          cst: request.cst || 1
        }
      });

      console.log('[VBMSaaSApiService] Update resource field response:', response.data);

      if (response.data.Status === 0 && response.data.ErrorCode === 0) {
        console.log('[VBMSaaSApiService] ✅ Resource field updated successfully');
        return {
          success: true,
          message: response.data.Message || 'Resource field updated successfully',
          data: response.data
        };
      } else {
        console.error('[VBMSaaSApiService] ❌ Failed to update resource field:', response.data.Message);
        return {
          success: false,
          message: response.data.Message || 'Failed to update resource field',
          data: response.data
        };
      }
    } catch (error) {
      console.error('[VBMSaaSApiService] Update resource field error:', error);

      let errorMessage = 'Failed to update resource field';
      let errorData: any = undefined;

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          console.error('[VBMSaaSApiService] Error response:', axiosError.response.data);
          errorMessage = (axiosError.response.data as any)?.Message || axiosError.message;
          errorData = axiosError.response.data;
        } else {
          errorMessage = axiosError.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        success: false,
        message: errorMessage,
        data: errorData
      };
    }
  }

  /**
   * Add resource field
   *
   * @param request - Add resource field request
   * @returns Add resource field response
   */
  async addResourceField(request: AddResourceFieldRequest): Promise<AddResourceFieldResponse> {
    try {
      console.log('[VBMSaaSApiService] ========================================');
      console.log('[VBMSaaSApiService] Adding resource field');
      console.log('[VBMSaaSApiService] Resource ID:', request.resId);
      console.log('[VBMSaaSApiService] Field name:', request.fieldData.FieldName);

      const response = await this.client.post('/api/resources/field-add', request.fieldData, {
        params: {
          resId: request.resId,
          cst: request.cst || 1
        }
      });

      console.log('[VBMSaaSApiService] Add resource field response:', response.data);

      if (response.data.Status === 0 && response.data.ErrorCode === 0) {
        console.log('[VBMSaaSApiService] ✅ Resource field added successfully');
        return {
          success: true,
          message: response.data.Message || 'Resource field added successfully',
          data: response.data
        };
      } else {
        console.error('[VBMSaaSApiService] ❌ Failed to add resource field:', response.data.Message);
        return {
          success: false,
          message: response.data.Message || 'Failed to add resource field',
          data: response.data
        };
      }
    } catch (error) {
      console.error('[VBMSaaSApiService] Add resource field error:', error);

      let errorMessage = 'Failed to add resource field';
      let errorData: any = undefined;

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          console.error('[VBMSaaSApiService] Error response:', axiosError.response.data);
          errorMessage = (axiosError.response.data as any)?.Message || axiosError.message;
          errorData = axiosError.response.data;
        } else {
          errorMessage = axiosError.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        success: false,
        message: errorMessage,
        data: errorData
      };
    }
  }

  /**
   * Delete a resource field
   *
   * @param request - Delete resource field request
   * @returns Delete resource field response
   */
  async deleteResourceField(request: DeleteResourceFieldRequest): Promise<DeleteResourceFieldResponse> {
    try {
      console.log('[VBMSaaSApiService] ========================================');
      console.log('[VBMSaaSApiService] Deleting resource field');
      console.log('[VBMSaaSApiService] Resource ID:', request.resId);
      console.log('[VBMSaaSApiService] Field name:', request.name);

      const response = await this.client.delete('/api/resources/field-delete', {
        params: {
          resId: request.resId,
          name: request.name,
          cst: request.cst || 1
        }
      });

      console.log('[VBMSaaSApiService] Delete resource field response:', response.data);

      if (response.data.Status === 0 && response.data.ErrorCode === 0) {
        console.log('[VBMSaaSApiService] ✅ Resource field deleted successfully');
        return {
          success: true,
          message: response.data.Message || 'Resource field deleted successfully',
          data: response.data
        };
      } else {
        console.error('[VBMSaaSApiService] ❌ Failed to delete resource field:', response.data.Message);
        return {
          success: false,
          message: response.data.Message || 'Failed to delete resource field',
          data: response.data
        };
      }
    } catch (error) {
      console.error('[VBMSaaSApiService] Delete resource field error:', error);

      let errorMessage = 'Failed to delete resource field';
      let errorData: any = undefined;

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          console.error('[VBMSaaSApiService] Error response:', axiosError.response.data);
          errorMessage = (axiosError.response.data as any)?.Message || axiosError.message;
          errorData = axiosError.response.data;
        } else {
          errorMessage = axiosError.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        success: false,
        message: errorMessage,
        data: errorData
      };
    }
  }

  /**
   * Get menu tree for a role
   *
   * @param request - Get menu tree request
   * @returns Get menu tree response
   */
  async getMenuTree(request: GetMenuTreeRequest): Promise<GetMenuTreeResponse> {
    try {
      console.log('[VBMSaaSApiService] ========================================');
      console.log('[VBMSaaSApiService] Getting menu tree');
      console.log('[VBMSaaSApiService] Role ID:', request.roleId);
      console.log('[VBMSaaSApiService] Part ID:', request.partId);
      console.log('[VBMSaaSApiService] Is PC:', request.isPC ?? true);
      console.log('[VBMSaaSApiService] Is Mobile:', request.isMobile ?? false);
      console.log('[VBMSaaSApiService] Is MP:', request.isMP ?? false);

      const response = await this.client.get('/api/role/menu/tree', {
        params: {
          roleId: request.roleId,
          partId: request.partId,
          isPC: request.isPC ?? true,
          isMobile: request.isMobile ?? false,
          isMP: request.isMP ?? false,
          menuType: request.menuType ?? 1,
          cst: request.cst ?? 1
        }
      });

      console.log('[VBMSaaSApiService] Get menu tree response:', response.data);

      if (response.data.Status === 0 && response.data.ErrorCode === 0) {
        console.log('[VBMSaaSApiService] ✅ Menu tree retrieved successfully');
        console.log('[VBMSaaSApiService] Menu count:', response.data.Result?.length || 0);

        return {
          success: true,
          message: response.data.Message || 'Menu tree retrieved successfully',
          data: response.data,
          menuTree: response.data.Result || []
        };
      } else {
        console.error('[VBMSaaSApiService] ❌ Failed to get menu tree:', response.data.Message);
        return {
          success: false,
          message: response.data.Message || 'Failed to get menu tree',
          data: response.data
        };
      }
    } catch (error) {
      console.error('[VBMSaaSApiService] Get menu tree error:', error);

      let errorMessage = 'Failed to get menu tree';
      let errorData: any = undefined;

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          console.error('[VBMSaaSApiService] Error response:', axiosError.response.data);
          errorMessage = (axiosError.response.data as any)?.Message || axiosError.message;
          errorData = axiosError.response.data;
        } else {
          errorMessage = axiosError.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        success: false,
        message: errorMessage,
        data: errorData
      };
    }
  }

  /**
   * Add a new menu to the application
   *
   * @param request - Add menu request
   * @returns Add menu response
   */
  async addMenu(request: AddMenuRequest): Promise<AddMenuResponse> {
    try {
      console.log('[VBMSaaSApiService] ========================================');
      console.log('[VBMSaaSApiService] Adding menu');
      console.log('[VBMSaaSApiService] Menu name:', request.menuData.name);
      console.log('[VBMSaaSApiService] Part ID:', request.menuData.partId);
      console.log('[VBMSaaSApiService] Menu type:', request.menuData.menuType);
      console.log('[VBMSaaSApiService] Level:', request.menuData.level);
      console.log('[VBMSaaSApiService] Node type:', request.menuData.nodeType);

      const response = await this.client.post('/api/appmenu/add', request.menuData, {
        params: {
          cst: request.cst ?? 1
        }
      });

      console.log('[VBMSaaSApiService] Add menu response:', response.data);

      if (response.data.Status === 0 && response.data.ErrorCode === 0) {
        console.log('[VBMSaaSApiService] ✅ Menu added successfully');
        console.log('[VBMSaaSApiService] Menu ID:', response.data.Result?.id || response.data.Result);

        return {
          success: true,
          message: response.data.Message || 'Menu added successfully',
          data: response.data,
          menuId: response.data.Result?.id || response.data.Result
        };
      } else {
        console.error('[VBMSaaSApiService] ❌ Failed to add menu:', response.data.Message);
        return {
          success: false,
          message: response.data.Message || 'Failed to add menu',
          data: response.data
        };
      }
    } catch (error) {
      console.error('[VBMSaaSApiService] Add menu error:', error);

      let errorMessage = 'Failed to add menu';
      let errorData: any = undefined;

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          console.error('[VBMSaaSApiService] Error response:', axiosError.response.data);
          errorMessage = (axiosError.response.data as any)?.Message || axiosError.message;
          errorData = axiosError.response.data;
        } else {
          errorMessage = axiosError.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        success: false,
        message: errorMessage,
        data: errorData
      };
    }
  }

  /**
   * Add a new page to the application
   *
   * @param request - Add page request
   * @returns Add page response
   */
  async addPage(request: AddPageRequest): Promise<AddPageResponse> {
    try {
      console.log('[VBMSaaSApiService] ========================================');
      console.log('[VBMSaaSApiService] Adding page');
      console.log('[VBMSaaSApiService] Page name:', request.pageData.name);
      console.log('[VBMSaaSApiService] Page code:', request.pageData.code);
      console.log('[VBMSaaSApiService] Part ID:', request.pageData.partId);
      console.log('[VBMSaaSApiService] Page type:', request.pageData.pageType);

      const response = await this.client.post('/api/apppage/add', request.pageData, {
        params: {
          cst: request.cst ?? 1
        }
      });

      console.log('[VBMSaaSApiService] Add page response:', response.data);

      if (response.data.Status === 0 && response.data.ErrorCode === 0) {
        console.log('[VBMSaaSApiService] ✅ Page added successfully');
        console.log('[VBMSaaSApiService] Page ID:', response.data.Result?.id || response.data.Result);

        return {
          success: true,
          message: response.data.Message || 'Page added successfully',
          data: response.data,
          pageId: response.data.Result?.id || response.data.Result
        };
      } else {
        console.error('[VBMSaaSApiService] ❌ Failed to add page:', response.data.Message);
        return {
          success: false,
          message: response.data.Message || 'Failed to add page',
          data: response.data
        };
      }
    } catch (error) {
      console.error('[VBMSaaSApiService] Add page error:', error);

      let errorMessage = 'Failed to add page';
      let errorData: any = undefined;

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          console.error('[VBMSaaSApiService] Error response:', axiosError.response.data);
          errorMessage = (axiosError.response.data as any)?.Message || axiosError.message;
          errorData = axiosError.response.data;
        } else {
          errorMessage = axiosError.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        success: false,
        message: errorMessage,
        data: errorData
      };
    }
  }

  /**
   * Get pages with pagination
   *
   * @param request - Get pages request
   * @returns Get pages response
   */
  async getPages(request: GetPagesRequest): Promise<GetPagesResponse> {
    try {
      console.log('[VBMSaaSApiService] ========================================');
      console.log('[VBMSaaSApiService] Getting pages');
      console.log('[VBMSaaSApiService] Part ID:', request.partId);
      console.log('[VBMSaaSApiService] Page:', request.page ?? 0);
      console.log('[VBMSaaSApiService] Size:', request.size ?? 10);
      console.log('[VBMSaaSApiService] Page type:', request.pageType ?? 1);

      const response = await this.client.get('/api/apppage/page', {
        params: {
          page: request.page ?? 0,
          size: request.size ?? 10,
          partId: request.partId,
          pageType: request.pageType ?? 1,
          cst: request.cst ?? 1
        }
      });

      console.log('[VBMSaaSApiService] Get pages response:', response.data);

      if (response.data.Status === 0 && response.data.ErrorCode === 0) {
        console.log('[VBMSaaSApiService] ✅ Pages retrieved successfully');
        console.log('[VBMSaaSApiService] Total count:', response.data.Result?.totalCount || 0);
        console.log('[VBMSaaSApiService] Page count:', response.data.Result?.pageCount || 0);
        console.log('[VBMSaaSApiService] Current page:', response.data.Result?.pageNo || 0);
        console.log('[VBMSaaSApiService] Page size:', response.data.Result?.pageSize || 0);
        console.log('[VBMSaaSApiService] Item count:', response.data.Result?.itemCount || 0);

        return {
          success: true,
          message: response.data.Message || 'Pages retrieved successfully',
          data: response.data,
          pages: response.data.Result?.pageItems || [],
          totalElements: response.data.Result?.totalCount || 0,
          totalPages: response.data.Result?.pageCount || 0
        };
      } else {
        console.error('[VBMSaaSApiService] ❌ Failed to get pages:', response.data.Message);
        return {
          success: false,
          message: response.data.Message || 'Failed to get pages',
          data: response.data
        };
      }
    } catch (error) {
      console.error('[VBMSaaSApiService] Get pages error:', error);

      let errorMessage = 'Failed to get pages';
      let errorData: any = undefined;

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          console.error('[VBMSaaSApiService] Error response:', axiosError.response.data);
          errorMessage = (axiosError.response.data as any)?.Message || axiosError.message;
          errorData = axiosError.response.data;
        } else {
          errorMessage = axiosError.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        success: false,
        message: errorMessage,
        data: errorData
      };
    }
  }

  /**
   * Add resource data (添加资源数据)
   *
   * @param request - Add resource data request
   * @returns Add resource data response
   */
  async addResourceData(request: {
    categoryId: string;
    data: Record<string, any>;
    cst?: number;
    partitionId?: string;
    userid?: string;
  }): Promise<{
    success: boolean;
    message?: string;
    data?: any;
    mid?: string;
  }> {
    try {
      console.log('[VBMSaaSApiService] ========================================');
      console.log('[VBMSaaSApiService] Adding resource data');
      console.log('[VBMSaaSApiService] Category ID:', request.categoryId);
      console.log('[VBMSaaSApiService] Data:', JSON.stringify(request.data, null, 2));

      // 构建请求参数
      const params: Record<string, any> = {
        category: request.categoryId,
        cst: request.cst || 1
      };

      // 如果提供了partitionId和userid,添加到参数中
      if (request.partitionId) {
        params.partitionId = request.partitionId;
      }
      if (request.userid) {
        params.userid = request.userid;
      }

      const response = await this.client.post('/api/data/add', request.data, {
        params
      });

      console.log('[VBMSaaSApiService] Add resource data response:', response.data);

      if (response.data.Status === 0 && response.data.ErrorCode === 0) {
        console.log('[VBMSaaSaaS] ✅ Resource data added successfully');
        const mid = response.data.Result?.mid || response.data.Result;
        return {
          success: true,
          message: response.data.Message || 'Resource data added successfully',
          data: response.data.Result,
          mid
        };
      } else {
        console.error('[VBMSaaSApiService] ❌ Failed to add resource data:', response.data.Message);
        return {
          success: false,
          message: response.data.Message || 'Failed to add resource data',
          data: response.data
        };
      }
    } catch (error) {
      console.error('[VBMSaaSApiService] ❌ Error adding resource data:', error);

      let errorMessage = 'Unknown error occurred';
      let errorData = undefined;

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          errorMessage = (axiosError.response.data as any)?.Message || axiosError.message;
          errorData = axiosError.response.data;
        } else {
          errorMessage = axiosError.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        success: false,
        message: errorMessage,
        data: errorData
      };
    }
  }

  /**
   * Query resource data (查询资源数据)
   *
   * @param request - Query resource data request
   * @returns Query resource data response
   */
  async queryResourceData(request: QueryResourceDataRequest): Promise<QueryResourceDataResponse> {
    try {
      console.log('[VBMSaaSApiService] ========================================');
      console.log('[VBMSaaSApiService] Querying resource data');
      console.log('[VBMSaaSApiService] Category ID:', request.categoryId);
      console.log('[VBMSaaSApiService] Page:', request.page || 1);
      console.log('[VBMSaaSApiService] Page Size:', request.pageSize || 10);

      // 构建查询参数
      const params: Record<string, any> = {
        category: request.categoryId,
        page: request.page || 1,
        pageSize: request.pageSize || 10,
        cst: request.cst || 1
      };

      // 添加排序参数
      if (request.orderBy) {
        params.orderBy = request.orderBy;
        params.orderDirection = request.orderDirection || 'asc';
      }

      // 添加字段过滤
      if (request.fields && request.fields.length > 0) {
        params.fields = request.fields.join(',');
      }

      // 添加查询条件
      if (request.conditions && Object.keys(request.conditions).length > 0) {
        params.conditions = JSON.stringify(request.conditions);
      }

      const response = await this.client.get('/api/data/query', { params });

      console.log('[VBMSaaSApiService] Query resource data response:', response.data);

      if (response.data.Status === 0 && response.data.ErrorCode === 0) {
        console.log('[VBMSaaSApiService] ✅ Resource data queried successfully');
        const result = response.data.Result || {};
        const items = result.items || result.list || [];
        const total = result.total || result.count || 0;
        const page = request.page || 1;
        const pageSize = request.pageSize || 10;
        const totalPages = Math.ceil(total / pageSize);

        return {
          success: true,
          message: response.data.Message || 'Resource data queried successfully',
          data: {
            items,
            total,
            page,
            pageSize,
            totalPages
          }
        };
      } else {
        console.error('[VBMSaaSApiService] ❌ Failed to query resource data:', response.data.Message);
        return {
          success: false,
          message: response.data.Message || 'Failed to query resource data'
        };
      }
    } catch (error) {
      console.error('[VBMSaaSApiService] ❌ Error querying resource data:', error);

      let errorMessage = 'Unknown error occurred';
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          errorMessage = (axiosError.response.data as any)?.Message || axiosError.message;
        } else {
          errorMessage = axiosError.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        success: false,
        message: errorMessage
      };
    }
  }

  /**
   * Get resource data (获取单条资源数据)
   *
   * @param request - Get resource data request
   * @returns Get resource data response
   */
  async getResourceData(request: GetResourceDataRequest): Promise<GetResourceDataResponse> {
    try {
      console.log('[VBMSaaSApiService] ========================================');
      console.log('[VBMSaaSApiService] Getting resource data');
      console.log('[VBMSaaSApiService] Data ID (mid):', request.mid);
      console.log('[VBMSaaSApiService] Category ID:', request.categoryId);

      const response = await this.client.get('/api/data/get', {
        params: {
          mid: request.mid,
          categoryId: request.categoryId,
          withQuote: request.withQuote !== undefined ? request.withQuote : true,
          cst: request.cst || 1
        }
      });

      console.log('[VBMSaaSApiService] Get resource data response:', response.data);

      if (response.data.Status === 0 && response.data.ErrorCode === 0) {
        console.log('[VBMSaaSApiService] ✅ Resource data retrieved successfully');
        return {
          success: true,
          message: response.data.Message || 'Resource data retrieved successfully',
          data: response.data.Result
        };
      } else {
        console.error('[VBMSaaSApiService] ❌ Failed to get resource data:', response.data.Message);
        return {
          success: false,
          message: response.data.Message || 'Failed to get resource data'
        };
      }
    } catch (error) {
      console.error('[VBMSaaSApiService] ❌ Error getting resource data:', error);

      let errorMessage = 'Unknown error occurred';
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          errorMessage = (axiosError.response.data as any)?.Message || axiosError.message;
        } else {
          errorMessage = axiosError.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        success: false,
        message: errorMessage
      };
    }
  }

  /**
   * Update resource data (更新资源数据)
   *
   * @param request - Update resource data request
   * @returns Update resource data response
   */
  async updateResourceData(request: UpdateResourceDataRequest): Promise<UpdateResourceDataResponse> {
    try {
      console.log('[VBMSaaSApiService] ========================================');
      console.log('[VBMaaSApiService] Updating resource data');
      console.log('[VBMSaaSApiService] Data ID (mid):', request.mid);
      console.log('[VBMSaaSApiService] Category ID:', request.categoryId);
      console.log('[VBMSaaSApiService] Data:', JSON.stringify(request.data, null, 2));

      const response = await this.client.post('/api/data/update', request.data, {
        params: {
          mid: request.mid,
          category: request.categoryId,
          cst: request.cst || 1
        }
      });

      console.log('[VBMSaaSApiService] Update resource data response:', response.data);

      if (response.data.Status === 0 && response.data.ErrorCode === 0) {
        console.log('[VBMSaaSApiService] ✅ Resource data updated successfully');
        return {
          success: true,
          message: response.data.Message || 'Resource data updated successfully',
          data: response.data.Result
        };
      } else {
        console.error('[VBMSaaSApiService] ❌ Failed to update resource data:', response.data.Message);
        return {
          success: false,
          message: response.data.Message || 'Failed to update resource data'
        };
      }
    } catch (error) {
      console.error('[VBMSaaSApiService] ❌ Error updating resource data:', error);

      let errorMessage = 'Unknown error occurred';
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          errorMessage = (axiosError.response.data as any)?.Message || axiosError.message;
        } else {
          errorMessage = axiosError.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        success: false,
        message: errorMessage
      };
    }
  }

  /**
   * Delete resource data (删除资源数据)
   *
   * @param request - Delete resource data request
   * @returns Delete resource data response
   */
  async deleteResourceData(request: DeleteResourceDataRequest): Promise<DeleteResourceDataResponse> {
    try {
      console.log('[VBMSaaSApiService] ========================================');
      console.log('[VBMSaaSApiService] Deleting resource data');
      console.log('[VBMSaaSApiService] Data ID (mid):', request.mid);

      const params: Record<string, any> = {
        mid: request.mid,
        force: request.force || false,
        cst: request.cst || 1
      };

      if (request.categoryId) {
        params.categoryId = request.categoryId;
      }

      if (request.userid) {
        params.userid = request.userid;
      }

      const response = await this.client.get('/api/data/delete', { params });

      console.log('[VBMSaaSApiService] Delete resource data response:', response.data);

      if (response.data.Status === 0 && response.data.ErrorCode === 0) {
        console.log('[VBMSaaSApiService] ✅ Resource data deleted successfully');
        return {
          success: true,
          message: response.data.Message || 'Resource data deleted successfully',
          data: response.data.Result
        };
      } else {
        console.error('[VBMSaaSApiService] ❌ Failed to delete resource data:', response.data.Message);
        return {
          success: false,
          message: response.data.Message || 'Failed to delete resource data'
        };
      }
    } catch (error) {
      console.error('[VBMSaaSApiService] ❌ Error deleting resource data:', error);

      let errorMessage = 'Unknown error occurred';
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          errorMessage = (axiosError.response.data as any)?.Message || axiosError.message;
        } else {
          errorMessage = axiosError.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        success: false,
        message: errorMessage
      };
    }
  }

  /**
   * Batch resource data operations (批量资源数据操作)
   *
   * @param request - Batch resource data request
   * @returns Batch resource data response
   */
  async batchResourceData(request: BatchResourceDataRequest): Promise<BatchResourceDataResponse> {
    try {
      console.log('[VBMSaaSApiService] ========================================');
      console.log('[VBMSaaSApiService] Batch resource data operations');
      console.log('[VBMSaaSApiService] Category ID:', request.categoryId);
      console.log('[VBMSaaSApiService] Operations count:', request.operations.length);

      const results: any[] = [];
      let successCount = 0;
      let failureCount = 0;

      // 逐个执行操作
      for (const operation of request.operations) {
        try {
          let result: any = null;

          switch (operation.operation) {
            case 'add':
              if (!operation.data) {
                throw new Error('Data is required for add operation');
              }
              result = await this.addResourceData({
                categoryId: request.categoryId,
                data: operation.data,
                cst: request.cst
              });
              break;

            case 'update':
              if (!operation.mid || !operation.data) {
                throw new Error('Mid and data are required for update operation');
              }
              result = await this.updateResourceData({
                mid: operation.mid,
                categoryId: request.categoryId,
                data: operation.data,
                cst: request.cst
              });
              break;

            case 'delete':
              if (!operation.mid) {
                throw new Error('Mid is required for delete operation');
              }
              result = await this.deleteResourceData({
                mid: operation.mid,
                categoryId: request.categoryId,
                cst: request.cst
              });
              break;

            default:
              throw new Error(`Unknown operation type: ${operation.operation}`);
          }

          if (result.success) {
            successCount++;
          } else {
            failureCount++;
          }

          results.push({
            operation: operation.operation,
            mid: operation.mid,
            success: result.success,
            message: result.message,
            data: result.data
          });
        } catch (error) {
          failureCount++;
          results.push({
            operation: operation.operation,
            mid: operation.mid,
            success: false,
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      console.log('[VBMSaaSApiService] ✅ Batch operations completed');
      console.log('[VBMSaaSApiService] Success:', successCount, 'Failure:', failureCount);

      return {
        success: true,
        message: `Batch operations completed: ${successCount} succeeded, ${failureCount} failed`,
        data: {
          results,
          successCount,
          failureCount,
          total: request.operations.length
        }
      };
    } catch (error) {
      console.error('[VBMSaaSApiService] ❌ Error in batch operations:', error);

      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        success: false,
        message: errorMessage
      };
    }
  }
}

