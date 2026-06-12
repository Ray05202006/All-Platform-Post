const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { S3Client, CreateBucketCommand } = require('@aws-sdk/client-s3');
const { execSync } = require('child_process');

// 1. Parse .env manually (no dependency)
function loadEnv() {
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    const key = parts[0].trim();
    let val = parts.slice(1).join('=').trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    env[key] = val;
  });
  return env;
}

function updateEnv(key, value) {
  const envPath = path.join(__dirname, '../.env');
  let content = '';
  if (fs.existsSync(envPath)) {
    content = fs.readFileSync(envPath, 'utf8');
  }
  const lines = content.split('\n');
  let found = false;
  const newLines = lines.map(line => {
    if (line.trim().startsWith(key + '=')) {
      found = true;
      return `${key}="${value}"`;
    }
    return line;
  });
  if (!found) {
    newLines.push(`${key}="${value}"`);
  }
  fs.writeFileSync(envPath, newLines.join('\n'), 'utf8');
  console.log(`Updated .env: ${key}`);
}

async function main() {
  console.log('--- Starting Cloudflare Auto-Configuration ---');
  const env = loadEnv();

  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = env.CLOUDFLARE_API_TOKEN;
  
  if (!accountId || !apiToken) {
    console.error('Error: CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN is missing in .env');
    process.exit(1);
  }

  // 2. Setup Cloudflare Turnstile CAPTCHA
  console.log('\n[1/3] Setting up Cloudflare Turnstile...');
  try {
    const cf = axios.create({
      baseURL: `https://api.cloudflare.com/client/v4`,
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Check if widget already exists
    const listRes = await cf.get(`/accounts/${accountId}/challenges/widgets`);
    let widget = listRes.data.result.find(w => w.name === 'All-Platform-Post Turnstile');
    
    if (widget) {
      console.log('Turnstile widget already exists.');
    } else {
      console.log('Creating new Turnstile widget...');
      const createRes = await cf.post(`/accounts/${accountId}/challenges/widgets`, {
        name: 'All-Platform-Post Turnstile',
        domains: ['localhost', '127.0.0.1', 'ray05202006.github.io'],
        mode: 'managed',
      });
      widget = createRes.data.result;
    }

    console.log(`Site Key: ${widget.sitekey}`);
    updateEnv('NEXT_PUBLIC_TURNSTILE_SITE_KEY', widget.sitekey);
    updateEnv('TURNSTILE_SECRET_KEY', widget.secret);
  } catch (err) {
    console.error('Failed to configure Turnstile:', err.response?.data || err.message);
  }

  // 3. Setup R2 Bucket
  console.log('\n[2/3] Setting up Cloudflare R2 Bucket...');
  const accessKeyId = env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const endpoint = env.CLOUDFLARE_R2_ENDPOINT;
  const bucketName = env.CLOUDFLARE_R2_BUCKET_NAME || 'all-platform-post-media';

  if (accessKeyId && secretAccessKey && endpoint) {
    try {
      const s3 = new S3Client({
        region: 'auto',
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
      });

      console.log(`Creating R2 Bucket: ${bucketName}...`);
      await s3.send(new CreateBucketCommand({ Bucket: bucketName }));
      console.log(`Bucket ${bucketName} created successfully.`);
    } catch (err) {
      if (err.name === 'BucketAlreadyExists' || err.name === 'BucketAlreadyOwnedByYou' || err.message.includes('DuplicateBucket')) {
        console.log(`Bucket ${bucketName} already exists and is owned by you.`);
      } else {
        console.error('Failed to create R2 bucket:', err.message);
      }
    }
  } else {
    console.log('R2 credentials missing. Skipping bucket creation.');
  }

  // 4. Deploy Scheduler Cloudflare Worker
  console.log('\n[3/3] Deploying Cloudflare Worker Scheduler...');
  try {
    const workerDir = path.join(__dirname, '../cloudflare-scheduler');
    console.log('Deploying via wrangler...');
    
    // Deploy using local wrangler and credentials
    const cmd = `npx wrangler deploy`;
    execSync(cmd, {
      cwd: workerDir,
      env: {
        ...process.env,
        CLOUDFLARE_API_TOKEN: apiToken,
        CLOUDFLARE_ACCOUNT_ID: accountId,
      },
      stdio: 'inherit',
    });
    console.log('Cloudflare Worker Scheduler deployed successfully.');
  } catch (err) {
    console.error('Failed to deploy Cloudflare Worker:', err.message);
  }

  console.log('\n--- Cloudflare Auto-Configuration Finished ---');
}

main();
