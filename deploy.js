#!/usr/bin/env node

/**
 * Deployment Script for BPO Scorecard
 * 
 * This script helps automate the deployment process by:
 * 1. Validating environment variables
 * 2. Building the application
 * 3. Running pre-deployment checks
 * 4. Deploying to specified platform
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const COLORS = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

function log(message, color = 'reset') {
    console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function exec(command, options = {}) {
    try {
        return execSync(command, { stdio: 'inherit', ...options });
    } catch (error) {
        log(`Error executing: ${command}`, 'red');
        process.exit(1);
    }
}

function checkEnvFile(filePath) {
    if (!fs.existsSync(filePath)) {
        log(`Error: ${filePath} not found!`, 'red');
        log(`Please create it based on ${filePath}.example`, 'yellow');
        return false;
    }
    return true;
}

function validateEnvironment() {
    log('\n🔍 Validating environment...', 'blue');

    // Check Node version
    const nodeVersion = process.version;
    log(`   Node version: ${nodeVersion}`, 'green');

    // Check if .env.production exists
    if (!checkEnvFile('.env.production')) {
        return false;
    }

    // Check if server/.env exists
    if (!checkEnvFile('server/.env')) {
        return false;
    }

    log('   ✓ Environment validation passed', 'green');
    return true;
}

function buildFrontend() {
    log('\n📦 Building frontend...', 'blue');
    exec('npm run build');
    log('   ✓ Frontend build complete', 'green');
}

function buildBackend() {
    log('\n📦 Building backend...', 'blue');
    exec('npm run build', { cwd: 'server' });
    log('   ✓ Backend build complete', 'green');
}

function deployFrontend(platform) {
    log(`\n🚀 Deploying frontend to ${platform}...`, 'blue');

    switch (platform) {
        case 'vercel':
            exec('vercel --prod');
            break;
        case 'netlify':
            exec('netlify deploy --prod --dir=dist');
            break;
        default:
            log(`Unknown platform: ${platform}`, 'red');
            return false;
    }

    log('   ✓ Frontend deployed successfully', 'green');
    return true;
}

function deployBackend(platform) {
    log(`\n🚀 Deploying backend to ${platform}...`, 'blue');

    switch (platform) {
        case 'railway':
            exec('railway up', { cwd: 'server' });
            break;
        case 'heroku':
            exec('git subtree push --prefix server heroku main');
            break;
        default:
            log(`Unknown platform: ${platform}`, 'red');
            return false;
    }

    log('   ✓ Backend deployed successfully', 'green');
    return true;
}

function main() {
    const args = process.argv.slice(2);
    const frontendPlatform = args[0] || 'vercel';
    const backendPlatform = args[1] || 'railway';

    log('\n═══════════════════════════════════════', 'blue');
    log('   BPO Scorecard Deployment Script', 'blue');
    log('═══════════════════════════════════════\n', 'blue');

    log(`Frontend platform: ${frontendPlatform}`, 'yellow');
    log(`Backend platform: ${backendPlatform}\n`, 'yellow');

    // Step 1: Validate environment
    if (!validateEnvironment()) {
        process.exit(1);
    }

    // Step 2: Build frontend
    buildFrontend();

    // Step 3: Build backend
    buildBackend();

    // Step 4: Deploy frontend
    if (!deployFrontend(frontendPlatform)) {
        process.exit(1);
    }

    // Step 5: Deploy backend
    if (!deployBackend(backendPlatform)) {
        process.exit(1);
    }

    // Success!
    log('\n═══════════════════════════════════════', 'green');
    log('   🎉 Deployment Complete!', 'green');
    log('═══════════════════════════════════════\n', 'green');

    log('Next steps:', 'yellow');
    log('1. Test the deployed application', 'yellow');
    log('2. Create initial admin user', 'yellow');
    log('3. Configure monitoring', 'yellow');
    log('4. Share URLs with team\n', 'yellow');
}

// Run the script
main();
