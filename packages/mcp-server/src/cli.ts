#!/usr/bin/env node

/**
 * VBMCP CLI - 环境变量配置工具
 * 用于查询和配置 VBMSaaS MCP Server 所需的环境变量
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// 必需的环境变量配置
const REQUIRED_ENV_VARS = [
  {
    name: 'VBMSAAS_API_URL',
    description: 'VBMSaaS API 地址',
    example: 'https://api.vbmsaas.com',
    required: true
  },
  {
    name: 'VBMSAAS_ACCESS_KEY',
    description: 'VBMSaaS 访问密钥',
    example: 'your-access-key-here',
    required: true
  },
  {
    name: 'VBMSAAS_PLATFORM_ID',
    description: 'VBMSaaS 平台ID',
    example: 'your-platform-id-here',
    required: true
  }
];

// 可选的环境变量配置
const OPTIONAL_ENV_VARS = [
  {
    name: 'VBMSAAS_ACCOUNT',
    description: '默认登录账号（仅用于开发/测试，生产环境不推荐）',
    example: 'user@example.com',
    required: false,
    sensitive: true
  },
  {
    name: 'VBMSAAS_PASSWORD',
    description: '默认登录密码（仅用于开发/测试，生产环境不推荐）',
    example: 'your-password',
    required: false,
    sensitive: true
  },
  {
    name: 'VBMSAAS_PARTITION_ID',
    description: '默认分区ID（仅用于开发/测试）',
    example: 'your-partition-id',
    required: false,
    sensitive: false
  },
  {
    name: 'SERVER_NAME',
    description: '服务器名称',
    example: 'vbmsaas-mcp-platform',
    required: false,
    sensitive: false
  },
  {
    name: 'SERVER_VERSION',
    description: '服务器版本',
    example: '1.0.0',
    required: false,
    sensitive: false
  },
  {
    name: 'API_TIMEOUT',
    description: 'API 超时时间（毫秒）',
    example: '30000',
    required: false,
    sensitive: false
  },
  {
    name: 'JWT_SECRET',
    description: 'JWT 密钥',
    example: 'your-jwt-secret',
    required: false,
    sensitive: true
  }
];

// 创建 readline 接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 提示用户输入
function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// 检查环境变量状态
function checkEnvStatus() {
  console.log('\n========================================');
  console.log('VBMCP 环境变量配置状态');
  console.log('========================================\n');

  console.log('必需的环境变量:');
  let allRequired = true;
  REQUIRED_ENV_VARS.forEach((env) => {
    const value = process.env[env.name];
    const status = value ? '✅ 已配置' : '❌ 未配置';
    const displayValue = value ? `(${value.substring(0, 20)}${value.length > 20 ? '...' : ''})` : '';
    console.log(`  ${status} ${env.name}: ${env.description} ${displayValue}`);
    if (!value) allRequired = false;
  });

  console.log('\n可选的环境变量:');
  OPTIONAL_ENV_VARS.forEach((env) => {
    const value = process.env[env.name];
    const status = value ? '✅ 已配置' : '⚪ 未配置';
    let displayValue = '';
    if (value) {
      if (env.sensitive) {
        // 敏感信息只显示前3个字符
        displayValue = `(${value.substring(0, 3)}***)`;
      } else {
        displayValue = `(${value})`;
      }
    }
    console.log(`  ${status} ${env.name}: ${env.description} ${displayValue}`);
  });

  console.log('\n========================================');
  if (allRequired) {
    console.log('✅ 所有必需的环境变量已配置');
  } else {
    console.log('❌ 部分必需的环境变量未配置');
    console.log('   运行 "npm run config" 进行配置');
  }
  console.log('========================================\n');

  return allRequired;
}

// 配置环境变量
async function configureEnv() {
  console.log('\n========================================');
  console.log('VBMCP 环境变量配置向导');
  console.log('========================================\n');
  console.log('此向导将帮助您配置 .env 文件\n');

  const envPath = path.join(__dirname, '..', '.env');
  const envTemplatePath = path.join(__dirname, '..', '.env.template');

  // 读取现有的 .env 文件（如果存在）
  let existingEnv: Record<string, string> = {};
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    content.split('\n').forEach((line) => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        existingEnv[match[1].trim()] = match[2].trim();
      }
    });
  }

  const newEnv: Record<string, string> = {};

  // 配置必需的环境变量
  console.log('配置必需的环境变量:\n');
  for (const env of REQUIRED_ENV_VARS) {
    const current = existingEnv[env.name] || '';
    const currentDisplay = current ? ` [当前: ${current.substring(0, 20)}${current.length > 20 ? '...' : ''}]` : '';
    const answer = await prompt(`${env.description}${currentDisplay}\n  ${env.name} = `);
    newEnv[env.name] = answer || current;
  }

  // 询问是否配置可选的环境变量
  console.log('\n配置可选的环境变量 (直接回车跳过):\n');

  // 先询问是否配置账号密码
  const configAuth = await prompt('是否配置默认登录账号密码？(仅用于开发/测试，生产环境不推荐) [y/N]: ');

  for (const env of OPTIONAL_ENV_VARS) {
    // 如果用户选择不配置账号密码，跳过相关字段
    if (!configAuth.toLowerCase().startsWith('y') &&
        (env.name === 'VBMSAAS_ACCOUNT' || env.name === 'VBMSAAS_PASSWORD' || env.name === 'VBMSAAS_PARTITION_ID')) {
      continue;
    }

    const current = existingEnv[env.name] || '';
    let currentDisplay = '';
    if (current) {
      if (env.sensitive) {
        currentDisplay = ` [当前: ${current.substring(0, 3)}***]`;
      } else {
        currentDisplay = ` [当前: ${current}]`;
      }
    }

    const answer = await prompt(`${env.description}${currentDisplay}\n  ${env.name} = `);
    if (answer || current) {
      newEnv[env.name] = answer || current;
    }
  }

  // 生成 .env 文件内容
  let envContent = '# VBMSaaS MCP Server 环境变量配置\n';
  envContent += '# 由 VBMCP CLI 自动生成\n\n';
  envContent += '# ============================================\n';
  envContent += '# VBMSaaS 平台配置\n';
  envContent += '# ============================================\n\n';

  REQUIRED_ENV_VARS.forEach((env) => {
    envContent += `# ${env.description}\n`;
    envContent += `${env.name}=${newEnv[env.name] || ''}\n\n`;
  });

  envContent += '# ============================================\n';
  envContent += '# 服务器配置（可选）\n';
  envContent += '# ============================================\n\n';

  OPTIONAL_ENV_VARS.forEach((env) => {
    if (newEnv[env.name]) {
      envContent += `# ${env.description}\n`;
      envContent += `${env.name}=${newEnv[env.name]}\n\n`;
    }
  });

  // 写入 .env 文件
  fs.writeFileSync(envPath, envContent, 'utf-8');

  console.log('\n========================================');
  console.log('✅ 配置已保存到 .env 文件');
  console.log('========================================\n');

  rl.close();
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'check' || command === 'status') {
    checkEnvStatus();
    rl.close();
  } else if (command === 'config' || command === 'setup') {
    await configureEnv();
  } else {
    console.log('\nVBMCP CLI - 环境变量配置工具\n');
    console.log('用法:');
    console.log('  npm run env:check   - 检查环境变量配置状态');
    console.log('  npm run env:config  - 配置环境变量\n');
    rl.close();
  }
}

main().catch((error) => {
  console.error('错误:', error);
  rl.close();
  process.exit(1);
});

