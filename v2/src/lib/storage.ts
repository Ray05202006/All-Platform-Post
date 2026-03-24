import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} from '@azure/storage-blob';

function getBlobServiceClient(): BlobServiceClient {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
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
  const blobServiceClient = getBlobServiceClient();
  const containerClient = blobServiceClient.getContainerClient(getContainerName());
  await containerClient.createIfNotExists({ access: 'blob' });

  const blockBlobClient = containerClient.getBlockBlobClient(filename);
  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: contentType },
  });

  return blockBlobClient.url;
}

export async function deleteFromBlob(filename: string): Promise<void> {
  const blobServiceClient = getBlobServiceClient();
  const containerClient = blobServiceClient.getContainerClient(getContainerName());
  const blockBlobClient = containerClient.getBlockBlobClient(filename);
  await blockBlobClient.deleteIfExists();
}

export function getBlobUrl(filename: string): string {
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
