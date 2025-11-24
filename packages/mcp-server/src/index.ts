#!/usr/bin/env node

/**
 * VBMSaaS MCP Server Entry Point
 *
 * This is the main entry point for the MCP server
 */

import { VBMSaaSMcpServer } from './server.js';
import { ServerConfig } from './types.js';
import fs from 'fs';
import path from 'path';

// Setup logging to file
const logFile = path.join(process.cwd(), 'mcp-server.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Override console.log and console.error to write to both stderr and file
const originalLog = console.log;
const originalError = console.error;

console.log = (...args: any[]) => {
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
  const timestamp = new Date().toISOString();
  logStream.write(`[${timestamp}] [LOG] ${message}\n`);
  originalError(`[LOG] ${message}`);  // Use stderr for MCP
};

console.error = (...args: any[]) => {
  const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)).join(' ');
  const timestamp = new Date().toISOString();
  logStream.write(`[${timestamp}] [ERROR] ${message}\n`);
  originalError(`[ERROR] ${message}`);
};

// Load configuration from environment variables
const config: ServerConfig = {
  name: process.env.SERVER_NAME || 'vbmsaas-mcp-platform',
  version: process.env.SERVER_VERSION || '1.0.0',
  vbmsaasConfig: {
    apiBaseUrl: process.env.VBMSAAS_API_URL || '',
    apiKey: process.env.VBMSAAS_API_KEY,
    accessKey: process.env.VBMSAAS_ACCESS_KEY || '',
    secret: process.env.VBMSAAS_SECRET,  // Signature secret key (optional, for signed requests)
    timeout: parseInt(process.env.API_TIMEOUT || '30000', 10)
  },
  jwtSecret: process.env.JWT_SECRET || 'vbmsaas-default-secret-change-in-production'
};

console.log('========================================');
console.log('VBMSaaS MCP Server Configuration');
console.log('========================================');
console.log('Server Name:', config.name);
console.log('Server Version:', config.version);
console.log('API Base URL:', config.vbmsaasConfig.apiBaseUrl);
console.log('Access Key:', config.vbmsaasConfig.accessKey);
console.log('Secret:', config.vbmsaasConfig.secret ? '***configured***' : 'not set');
console.log('API Timeout:', config.vbmsaasConfig.timeout);
console.log('========================================');

// Create and start server
const server = new VBMSaaSMcpServer(config);

server.start().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

