import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} from '@azure/storage-blob';

// R2 Config
const r2AccessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const r2Endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;
const r2BucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'media';
const r2PublicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL;

let s3Client: S3Client | null = null;

if (r2AccessKeyId && r2SecretAccessKey && r2Endpoint) {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: r2Endpoint,
    credentials: {
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
    },
  });
}

function getBlobServiceClient(): BlobServiceClient {
  const connectionString = process.env.STORAGE_CONNECTION_STRING || process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING is not configured');
  }
  return BlobServiceClient.fromConnectionString(connectionString);
}

function getContainerName(): string {
  return process.env.AZURE_STORAGE_CONTAINER || 'media';
}

export async function uploadToBlob(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<string> {
  if (s3Client) {
    const command = new PutObjectCommand({
      Bucket: r2BucketName,
      Key: filename,
      Body: buffer,
      ContentType: contentType,
    });
    await s3Client.send(command);
    return getBlobUrl(filename);
  }

  const blobServiceClient = getBlobServiceClient();
  const containerClient = blobServiceClient.getContainerClient(getContainerName());
  await containerClient.createIfNotExists();

  const blockBlobClient = containerClient.getBlockBlobClient(filename);
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: contentType },
  });

  return getBlobUrl(filename);
}

export async function deleteFromBlob(filename: string): Promise<void> {
  if (s3Client) {
    const command = new DeleteObjectCommand({
      Bucket: r2BucketName,
      Key: filename,
    });
    await s3Client.send(command);
    return;
  }

  const blobServiceClient = getBlobServiceClient();
  const containerClient = blobServiceClient.getContainerClient(getContainerName());
  const blockBlobClient = containerClient.getBlockBlobClient(filename);
  await blockBlobClient.deleteIfExists();
}

export function getBlobUrl(filename: string): string {
  if (s3Client) {
    if (r2PublicUrl) {
      const baseUrl = r2PublicUrl.endsWith('/') ? r2PublicUrl.slice(0, -1) : r2PublicUrl;
      return `${baseUrl}/${filename}`;
    }
    // Fallback if no public URL configured
    return `${r2Endpoint}/${r2BucketName}/${filename}`;
  }

  const blobServiceClient = getBlobServiceClient();
  const containerClient = blobServiceClient.getContainerClient(getContainerName());
  const blobClient = containerClient.getBlobClient(filename);

  // Generate SAS URL with 1 hour expiry
  const credential = blobServiceClient.credential as StorageSharedKeyCredential;
  const sasToken = generateBlobSASQueryParameters(
    {
      containerName: getContainerName(),
      blobName: filename,
      permissions: BlobSASPermissions.parse('r'),
      startsOn: new Date(),
      expiresOn: new Date(Date.now() + 60 * 60 * 1000),
    },
    credential,
  ).toString();

  return `${blobClient.url}?${sasToken}`;
}

export function signUrl(urlOrFilename: string): string {
  if (!urlOrFilename) return urlOrFilename;

  // For R2, if we have a public URL configured and the URL already starts with it, it is already public/signed
  if (s3Client && r2PublicUrl && urlOrFilename.startsWith(r2PublicUrl)) {
    return urlOrFilename;
  }

  const containerName = getContainerName();
  const marker = `/${containerName}/`;
  const markerIndex = urlOrFilename.indexOf(marker);

  let filename = urlOrFilename;
  if (markerIndex !== -1) {
    const pathAndQuery = urlOrFilename.substring(markerIndex + marker.length);
    const queryIndex = pathAndQuery.indexOf('?');
    filename = queryIndex !== -1 ? pathAndQuery.substring(0, queryIndex) : pathAndQuery;
  }

  // Also handle R2 fallback endpoint URL format to extract the filename
  if (s3Client && !r2PublicUrl && r2Endpoint && urlOrFilename.includes(r2Endpoint)) {
    const parts = urlOrFilename.split(`/${r2BucketName}/`);
    if (parts.length > 1) {
      filename = parts[1];
    }
  }

  filename = decodeURIComponent(filename);
  return getBlobUrl(filename);
}

