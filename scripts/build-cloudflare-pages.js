#!/usr/bin/env node

/**
 * Build script for Cloudflare Pages deployment
 * Builds Next.js static export and includes Cloudflare Functions
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building GNUS DAO for Cloudflare Pages deployment...\n');

// Step 1: Clean previous build
console.log('🧹 Cleaning previous build...');
try {
  if (fs.existsSync('out')) {
    fs.rmSync('out', { recursive: true, force: true });
  }
  console.log('✅ Cleaned previous build\n');
} catch (error) {
  console.warn('⚠️  Warning: Could not clean previous build:', error.message);
}

// Step 2: Build Next.js static export
console.log('📦 Building Next.js static export...');
try {
  // Build with environment variables
  const envVars = [
    'NODE_ENV=production',
    'STATIC_EXPORT=true',
    'CLOUDFLARE_PAGES=true',
    'NEXT_TELEMETRY_DISABLED=1',
  ];
  
  // Add public env vars if available
  if (process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) {
    envVars.push(`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=${process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID}`);
  }
  if (process.env.NEXT_PUBLIC_SEPOLIA_GNUS_DAO_ADDRESS) {
    envVars.push(`NEXT_PUBLIC_SEPOLIA_GNUS_DAO_ADDRESS=${process.env.NEXT_PUBLIC_SEPOLIA_GNUS_DAO_ADDRESS}`);
  }
  
  execSync(`cross-env ${envVars.join(' ')} next build`, {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  console.log('✅ Next.js static export completed\n');
} catch (error) {
  console.error('❌ Next.js build failed:', error.message);
  process.exit(1);
}

// Step 3: Copy Cloudflare Functions
console.log('⚡ Copying Cloudflare Functions...');
try {
  const functionsSource = path.join(process.cwd(), 'functions');
  const functionsTarget = path.join(process.cwd(), 'out', 'functions');
  
  if (!fs.existsSync(functionsSource)) {
    console.warn('⚠️  Warning: functions directory not found, skipping...');
  } else {
    // Copy functions directory recursively
    copyDirectory(functionsSource, functionsTarget);
    console.log('✅ Cloudflare Functions copied successfully\n');
  }
} catch (error) {
  console.error('❌ Failed to copy Cloudflare Functions:', error.message);
  process.exit(1);
}

// Step 4: Verify build output
console.log('🔍 Verifying build output...');
try {
  const outDir = path.join(process.cwd(), 'out');
  const functionsDir = path.join(outDir, 'functions');
  
  if (!fs.existsSync(outDir)) {
    throw new Error('Output directory not found');
  }
  
  const files = fs.readdirSync(outDir);
  console.log('📁 Build output contents:');
  files.forEach(file => {
    const filePath = path.join(outDir, file);
    const isDir = fs.statSync(filePath).isDirectory();
    console.log(`   ${isDir ? '📂' : '📄'} ${file}`);
  });
  
  if (fs.existsSync(functionsDir)) {
    const functionFiles = getAllFiles(functionsDir);
    console.log(`\n⚡ Functions included: ${functionFiles.length} files`);
    functionFiles.forEach(file => {
      const relativePath = path.relative(outDir, file);
      console.log(`   📄 ${relativePath}`);
    });
  }
  
  console.log('\n✅ Build verification completed');
} catch (error) {
  console.error('❌ Build verification failed:', error.message);
  process.exit(1);
}

console.log('\n🎉 Cloudflare Pages build completed successfully!');
console.log('📋 Next steps:');
console.log('   1. Deploy with: yarn deploy:pages');
console.log('   2. Or manually: wrangler pages deploy out --project-name=gnus-dao-web');

/**
 * Recursively copy directory
 */
function copyDirectory(source, target) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
  
  const files = fs.readdirSync(source);
  
  files.forEach(file => {
    const sourcePath = path.join(source, file);
    const targetPath = path.join(target, file);
    
    if (fs.statSync(sourcePath).isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else {
      fs.copyFileSync(sourcePath, targetPath);
    }
  });
}

/**
 * Get all files recursively
 */
function getAllFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    items.forEach(item => {
      const itemPath = path.join(currentDir, item);
      
      if (fs.statSync(itemPath).isDirectory()) {
        traverse(itemPath);
      } else {
        files.push(itemPath);
      }
    });
  }
  
  traverse(dir);
  return files;
}