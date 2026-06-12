const { S3Client, ListBucketsCommand, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

// Parse .env manually
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

async function testR2() {
  const env = loadEnv();
  const accessKeyId = env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const endpoint = env.CLOUDFLARE_R2_ENDPOINT;
  const bucketName = env.CLOUDFLARE_R2_BUCKET_NAME || 'all-platform-post-media';

  console.log('--- Testing Cloudflare R2 Connection ---');
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Bucket: ${bucketName}`);

  if (!accessKeyId || !secretAccessKey || !endpoint) {
    console.error('\n❌ Error: Cloudflare R2 credentials missing in .env');
    return;
  }

  try {
    const s3 = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    // 1. List buckets to verify credentials
    console.log('\n[1/4] Verifying credentials by listing buckets...');
    const listRes = await s3.send(new ListBucketsCommand({}));
    console.log('Successfully connected! Available buckets:', listRes.Buckets.map(b => b.Name).join(', ') || '(none)');

    // 2. Upload a small test file
    console.log('\n[2/4] Uploading test file...');
    const testKey = 'test_connection_file.txt';
    const testContent = `R2 connection test at ${new Date().toISOString()}`;
    await s3.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain',
    }));
    console.log(`Test file "${testKey}" uploaded successfully.`);

    // 3. Construct and print URL
    console.log('\n[3/4] Testing URL construction...');
    const publicUrl = env.CLOUDFLARE_R2_PUBLIC_URL;
    if (publicUrl) {
      const baseUrl = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl;
      const fileUrl = `${baseUrl}/${testKey}`;
      console.log(`Public R2 URL: ${fileUrl}`);
      console.log('👉 Try opening the URL above in a browser to check if public access is enabled.');
    } else {
      const fileUrl = `${endpoint}/${bucketName}/${testKey}`;
      console.log(`Fallback endpoint URL: ${fileUrl}`);
      console.log('⚠️ Warning: CLOUDFLARE_R2_PUBLIC_URL is not set. Social media platforms might not be able to fetch the media files.');
    }

    // 4. Clean up the test file
    console.log('\n[4/4] Deleting test file to clean up...');
    await s3.send(new DeleteObjectCommand({
      Bucket: bucketName,
      Key: testKey,
    }));
    console.log('Test file deleted successfully. Cleanup complete.');
    
    console.log('\n✅ Cloudflare R2 storage connection is working perfectly!');

  } catch (error) {
    console.error('\n❌ R2 Connection Test Failed!');
    console.error('Error details:', error.message);
  }
}

testR2();
