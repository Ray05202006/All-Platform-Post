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

function getR2Config() {
  return {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
    bucketName: process.env.CLOUDFLARE_R2_BUCKET_NAME || 'media',
    publicUrl: process.env.CLOUDFLARE_R2_PUBLIC_URL,
  };
}

let s3Client: S3Client | null = null;
let s3ClientInitialized = false;

function getS3Client(): S3Client | null {
  if (s3ClientInitialized) return s3Client;

  const config = getR2Config();
  if (config.accessKeyId && config.secretAccessKey && config.endpoint) {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: true,
      requestChecksumCalculation: "WHEN_REQUIRED",
    });
  }
  s3ClientInitialized = true;
  return s3Client;
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
  const s3 = getS3Client();
  if (s3) {
    const config = getR2Config();
    const command = new PutObjectCommand({
      Bucket: config.bucketName,
      Key: filename,
      Body: buffer,
      ContentType: contentType,
      ContentLength: buffer.length,
    });
    await s3.send(command);
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
  const s3 = getS3Client();
  if (s3) {
    const config = getR2Config();
    const command = new DeleteObjectCommand({
      Bucket: config.bucketName,
      Key: filename,
    });
    await s3.send(command);
    return;
  }

  const blobServiceClient = getBlobServiceClient();
  const containerClient = blobServiceClient.getContainerClient(getContainerName());
  const blockBlobClient = containerClient.getBlockBlobClient(filename);
  await blockBlobClient.deleteIfExists();
}

export function getBlobUrl(filename: string): string {
  const s3 = getS3Client();
  if (s3) {
    const config = getR2Config();
    if (config.publicUrl) {
      const baseUrl = config.publicUrl.endsWith('/') ? config.publicUrl.slice(0, -1) : config.publicUrl;
      return `${baseUrl}/${filename}`;
    }
    // Fallback if no public URL configured
    return `${config.endpoint}/${config.bucketName}/${filename}`;
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

  const s3 = getS3Client();
  const config = getR2Config();

  // For R2, if we have a public URL configured and the URL already starts with it, it is already public/signed
  if (s3 && config.publicUrl && urlOrFilename.startsWith(config.publicUrl)) {
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
  if (s3 && !config.publicUrl && config.endpoint && urlOrFilename.includes(config.endpoint)) {
    const parts = urlOrFilename.split(`/${config.bucketName}/`);
    if (parts.length > 1) {
      filename = parts[1];
    }
  }

  filename = decodeURIComponent(filename);
  return getBlobUrl(filename);
}

