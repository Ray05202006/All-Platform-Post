import axios from 'axios';
import type { PlatformResult } from '@/lib/types';

const GRAPH_API_URL = 'https://graph.facebook.com/v19.0';

export async function getPages(accessToken: string): Promise<any[]> {
  const response = await axios.get(`${GRAPH_API_URL}/me/accounts`, {
    params: {
      access_token: accessToken,
      fields: 'id,name,access_token,picture',
    },
  });
  return response.data.data || [];
}

export async function publishTextPost(
  pageId: string,
  pageAccessToken: string,
  message: string,
): Promise<PlatformResult> {
  try {
    const response = await axios.post(
      `${GRAPH_API_URL}/${pageId}/feed`,
      { message, published: true },
      { params: { access_token: pageAccessToken } },
    );
    return {
      postId: response.data.id,
      url: `https://www.facebook.com/${response.data.id}`,
    };
  } catch (error: any) {
    return {
      error: error.response?.data?.error?.message || error.message,
    };
  }
}

export async function publishPhotoPost(
  pageId: string,
  pageAccessToken: string,
  message: string,
  photoUrl: string,
): Promise<PlatformResult> {
  try {
    const response = await axios.post(
      `${GRAPH_API_URL}/${pageId}/photos`,
      { url: photoUrl, caption: message, published: true },
      { params: { access_token: pageAccessToken } },
    );
    return {
      postId: response.data.id,
      url: `https://www.facebook.com/${response.data.id}`,
    };
  } catch (error: any) {
    return {
      error: error.response?.data?.error?.message || error.message,
    };
  }
}
