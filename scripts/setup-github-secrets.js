#!/usr/bin/env node

/**
 * 🔐 Automated GitHub Secrets Setup Script (Node.js)
 * This script reads your .env file and automatically sets GitHub repository secrets
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Colors for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

console.log(`${colors.blue}🚀 PIP AI - Automated GitHub Secrets Setup${colors.reset}`);
console.log('==================================================');

// Check if GitHub CLI is installed
function checkGitHubCLI() {
  try {
    execSync('gh --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    console.log(`${colors.red}❌ GitHub CLI (gh) is not installed${colors.reset}`);
    console.log('Install it with: brew install gh');
    console.log('Then run: gh auth login');
    process.exit(1);
  }
}

// Check if user is authenticated
function checkAuthentication() {
  try {
    execSync('gh auth status', { stdio: 'ignore' });
    return true;
  } catch (error) {
    console.log(`${colors.red}❌ Not authenticated with GitHub${colors.reset}`);
    console.log('Run: gh auth login');
    process.exit(1);
  }
}

// Parse .env file
function parseEnvFile(envPath) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#') && line.includes('=')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=').replace(/^["']|["']$/g, ''); // Remove quotes
      envVars[key.trim()] = value.trim();
    }
  });
  
  return envVars;
}

// Set a GitHub secret
function setSecret(secretName, secretValue) {
  if (!secretValue) {
    console.log(`  ${colors.yellow}⏭️  ${secretName} - SKIPPED (not found in env file)${colors.reset}`);
    return 'skipped';
  }
  
  // Mask the value for display
  const maskedValue = secretValue.substring(0, 4) + '***';
  
  try {
    execSync(`gh secret set "${secretName}" --body "${secretValue}"`, { stdio: 'ignore' });
    console.log(`  ${colors.green}✅ ${secretName} - SET (${maskedValue})${colors.reset}`);
    return 'success';
  } catch (error) {
    console.log(`  ${colors.red}❌ ${secretName} - FAILED${colors.reset}`);
    return 'failed';
  }
}

// Main function
async function main() {
  // Check prerequisites
  checkGitHubCLI();
  checkAuthentication();
  
  // Get env file path from command line argument or default to .env
  const envFilePath = process.argv[2] || '.env';
  
  // Check if env file exists
  if (!fs.existsSync(envFilePath)) {
    console.log(`${colors.red}❌ Environment file '${envFilePath}' not found${colors.reset}`);
    console.log('Usage: node setup-github-secrets.js [path-to-env-file]');
    console.log('Example: node setup-github-secrets.js .env.production');
    process.exit(1);
  }
  
  console.log(`${colors.green}✅ Found environment file: ${envFilePath}${colors.reset}`);
  
  // Required secrets for the CI/CD pipeline
  const requiredSecrets = [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_REGION',
    'AWS_S3_BUCKET_NAME',
    'VERCEL_API_TOKEN',
    'VERCEL_ORG_ID',
    'VERCEL_PROJECT_ID',
    'PULUMI_ACCESS_TOKEN',
    'OPENAI_API_KEY',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'TEMPORAL_ADDRESS',
    'TEMPORAL_NAMESPACE',
    'TEMPORAL_API_KEY',
    'TEMPORAL_TASK_QUEUE'
  ];
  
  // Load environment variables
  console.log(`${colors.blue}📖 Loading environment variables...${colors.reset}`);
  const envVars = parseEnvFile(envFilePath);
  
  // Get repository info
  const repoInfo = execSync('gh repo view --json owner,name --jq ".owner.login + \"/\" + .name"', { encoding: 'utf8' }).trim();
  console.log(`${colors.green}📂 Repository: ${repoInfo}${colors.reset}`);
  
  // Counters
  let secretsSet = 0;
  let secretsFailed = 0;
  let secretsSkipped = 0;
  
  console.log(`${colors.blue}🔐 Setting GitHub repository secrets...${colors.reset}`);
  console.log('');
  
  // Set all required secrets
  for (const secretName of requiredSecrets) {
    const result = setSecret(secretName, envVars[secretName]);
    
    switch (result) {
      case 'success':
        secretsSet++;
        break;
      case 'failed':
        secretsFailed++;
        break;
      case 'skipped':
        secretsSkipped++;
        break;
    }
  }
  
  // Summary
  console.log('');
  console.log('==================================================');
  console.log(`${colors.blue}📊 Summary:${colors.reset}`);
  console.log(`  ${colors.green}✅ Secrets set: ${secretsSet}${colors.reset}`);
  console.log(`  ${colors.yellow}⏭️  Secrets skipped: ${secretsSkipped}${colors.reset}`);
  console.log(`  ${colors.red}❌ Secrets failed: ${secretsFailed}${colors.reset}`);
  
  if (secretsFailed === 0) {
    console.log('');
    console.log(`${colors.green}🎉 All available secrets have been set successfully!${colors.reset}`);
    console.log('');
    console.log(`${colors.blue}📋 Next steps:${colors.reset}`);
    console.log(`1. Verify secrets in GitHub: https://github.com/${repoInfo}/settings/secrets/actions`);
    console.log('2. Create a test PR to trigger preview deployment');
    console.log('3. Push a git tag (v1.0.0) for production release');
    console.log('');
    console.log(`${colors.green}🚀 Your CI/CD pipeline is ready to go!${colors.reset}`);
  } else {
    console.log('');
    console.log(`${colors.yellow}⚠️  Some secrets failed to set. Please check your GitHub permissions.${colors.reset}`);
  }
  
  console.log('');
}

// Run the script
main().catch(error => {
  console.error(`${colors.red}❌ Error:${colors.reset}`, error.message);
  process.exit(1);
}); 