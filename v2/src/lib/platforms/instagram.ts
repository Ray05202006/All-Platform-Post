import axios from 'axios';
import type { PlatformResult } from '@/lib/types';

const GRAPH_API_URL = 'https://graph.facebook.com/v19.0';

export async function getInstagramBusinessAccount(
  accessToken: string,
  pageId: string,
): Promise<string | null> {
  try {
    const response = await axios.get(`${GRAPH_API_URL}/${pageId}`, {
      params: {
        fields: 'instagram_business_account',
        access_token: accessToken,
      },
    });
    return response.data.instagram_business_account?.id || null;
  } catch {
    return null;
  }
}

export async function publishImagePost(
  igUserId: string,
  accessToken: string,
  imageUrl: string,
  caption: string,
): Promise<PlatformResult> {
  try {
    // Step 1: Create container
    const containerResponse = await axios.post(
      `${GRAPH_API_URL}/${igUserId}/media`,
      { image_url: imageUrl, caption },
      { params: { access_token: accessToken } },
    );
    const containerId = containerResponse.data.id;

    // Step 2: Publish container
    const publishResponse = await axios.post(
      `${GRAPH_API_URL}/${igUserId}/media_publish`,
      { creation_id: containerId },
      { params: { access_token: accessToken } },
    );
    const mediaId = publishResponse.data.id;
    return {
      postId: mediaId,
      url: `https://www.instagram.com/p/${mediaId}/`,
    };
  } catch (error: any) {
    return {
      error: error.response?.data?.error?.message || error.message,
    };
  }
}
