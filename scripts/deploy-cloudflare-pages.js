#!/usr/bin/env node

/**
 * Deployment script for Cloudflare Pages
 * Builds and deploys the application to Cloudflare Pages
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Deploying GNUS DAO to Cloudflare Pages...\n');

// Validate required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID',
  'NEXT_PUBLIC_SEPOLIA_GNUS_DAO_ADDRESS',
];

const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.warn('⚠️  Warning: Missing environment variables:', missingVars.join(', '));
  console.warn('   Deployment may succeed but runtime will fail\n');
}

// Step 1: Build the application
console.log('📦 Building application...');
try {
  execSync('node scripts/build-cloudflare-pages.js', {
    stdio: 'inherit',
    cwd: process.cwd()
  });
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Step 1.5: Validate build output
console.log('\n🔍 Validating build output...');
const outDir = path.join(process.cwd(), 'out');
const requiredFiles = ['index.html', '_headers', '_redirects'];
const missingFiles = requiredFiles.filter(f => !fs.existsSync(path.join(outDir, f)));

if (missingFiles.length > 0) {
  console.error('❌ Missing required files:', missingFiles.join(', '));
  process.exit(1);
}
console.log('✅ Build validation passed\n');

// Step 2: Check if wrangler config exists and temporarily rename it
const wranglerConfig = path.join(process.cwd(), 'wrangler.jsonc');
const wranglerBackup = path.join(process.cwd(), 'wrangler.jsonc.backup');
let configRenamed = false;

if (fs.existsSync(wranglerConfig)) {
  console.log('📝 Temporarily renaming wrangler config for Pages deployment...');
  try {
    fs.renameSync(wranglerConfig, wranglerBackup);
    configRenamed = true;
    console.log('✅ Config renamed\n');
  } catch (error) {
    console.warn('⚠️  Warning: Could not rename wrangler config:', error.message);
  }
}

// Step 3: Deploy to Cloudflare Pages
console.log('🌐 Deploying to Cloudflare Pages...');
try {
  const deployCommand = 'wrangler pages deploy out --project-name=gnus-dao-web --commit-dirty=true';
  console.log(`Running: ${deployCommand}\n`);
  
  execSync(deployCommand, {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  console.log('\n✅ Deployment completed successfully!');
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  
  // Restore config file if it was renamed
  if (configRenamed && fs.existsSync(wranglerBackup)) {
    try {
      fs.renameSync(wranglerBackup, wranglerConfig);
      console.log('🔄 Restored wrangler config');
    } catch (restoreError) {
      console.warn('⚠️  Warning: Could not restore wrangler config:', restoreError.message);
    }
  }
  
  process.exit(1);
}

// Step 4: Restore wrangler config
if (configRenamed && fs.existsSync(wranglerBackup)) {
  console.log('\n🔄 Restoring wrangler config...');
  try {
    fs.renameSync(wranglerBackup, wranglerConfig);
    console.log('✅ Config restored');
  } catch (error) {
    console.warn('⚠️  Warning: Could not restore wrangler config:', error.message);
  }
}

console.log('\n🎉 Deployment process completed!');
console.log('📋 Your application should now be live on Cloudflare Pages');