#!/usr/bin/env node

/**
 * Script to generate secure environment keys for All-Platform-Post
 * Cross-platform alternative to generate-env-keys.sh
 */

const crypto = require('crypto');

console.log('===================================');
console.log('Environment Key Generator');
console.log('===================================');
console.log('');

console.log('Generating secure keys...');
console.log('');

// Generate ENCRYPTION_KEY (32 bytes = 64 hex characters)
const encryptionKey = crypto.randomBytes(32).toString('hex');
console.log('ENCRYPTION_KEY (64-char hex, 32 bytes):');
console.log(encryptionKey);
console.log('');

// Generate JWT_SECRET (32 bytes = 64 hex characters)
const jwtSecret = crypto.randomBytes(32).toString('hex');
console.log('JWT_SECRET (64-char hex, 32 bytes):');
console.log(jwtSecret);
console.log('');

console.log('===================================');
console.log('Add these to your .env file or deployment environment variables:');
console.log('===================================');
console.log('');
console.log(`ENCRYPTION_KEY="${encryptionKey}"`);
console.log(`JWT_SECRET="${jwtSecret}"`);
console.log('');
console.log('For Zeabur deployment:');
console.log('1. Go to your service settings');
console.log('2. Navigate to "Environment Variables"');
console.log('3. Add both ENCRYPTION_KEY and JWT_SECRET with the values above');
console.log('');
console.log('For local development:');
console.log('1. Copy .env.example to .env');
console.log('2. Replace the placeholder values with the keys above');
console.log('');
