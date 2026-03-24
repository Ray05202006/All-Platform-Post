import axios from 'axios';
import type { PlatformResult } from '@/lib/types';

const API_URL = 'https://graph.threads.net/v1.0';

async function createTextContainer(
  userId: string,
  accessToken: string,
  text: string,
  replyToId?: string,
): Promise<string> {
  const body: any = { media_type: 'TEXT', text };
  if (replyToId) {
    body.reply_to_id = replyToId;
  }

  const response = await axios.post(`${API_URL}/${userId}/threads`, body, {
    params: { access_token: accessToken },
  });
  return response.data.id;
}

async function publishContainer(
  userId: string,
  accessToken: string,
  containerId: string,
): Promise<PlatformResult> {
  try {
    const response = await axios.post(
      `${API_URL}/${userId}/threads_publish`,
      { creation_id: containerId },
      { params: { access_token: accessToken } },
    );
    const threadId = response.data.id;
    return {
      postId: threadId,
      url: `https://www.threads.net/t/${threadId}`,
    };
  } catch (error: any) {
    return {
      error: error.response?.data?.error?.message || error.message,
    };
  }
}

export async function publishTextPost(
  userId: string,
  accessToken: string,
  text: string,
): Promise<PlatformResult> {
  try {
    const containerId = await createTextContainer(userId, accessToken, text);
    return await publishContainer(userId, accessToken, containerId);
  } catch (error: any) {
    return {
      error: error.response?.data?.error?.message || error.message,
    };
  }
}

export async function publishThreadChain(
  userId: string,
  accessToken: string,
  chunks: string[],
): Promise<PlatformResult[]> {
  const results: PlatformResult[] = [];
  let previousThreadId: string | undefined;

  for (const text of chunks) {
    try {
      const containerId = await createTextContainer(userId, accessToken, text, previousThreadId);
      const result = await publishContainer(userId, accessToken, containerId);
      results.push(result);

      if (result.error) break;
      previousThreadId = result.postId;

      // Rate limit delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error: any) {
      results.push({ error: error.message });
      break;
    }
  }

  return results;
}
