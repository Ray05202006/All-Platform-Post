const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiOptions extends RequestInit {
  token?: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string) {
    this.token = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  async fetch<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
    const { token, ...fetchOptions } = options;
    const authToken = token || this.getToken();

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (authToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${this.baseUrl}/api${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ==================== Auth endpoints ====================

  async getDevToken(): Promise<{ token: string; user: any }> {
    return this.fetch('/auth/dev-token');
  }

  async getConnections(): Promise<PlatformConnection[]> {
    return this.fetch('/auth/connections');
  }

  async disconnectPlatform(platform: string): Promise<{ success: boolean }> {
    return this.fetch(`/auth/connections/${platform}`, { method: 'DELETE' });
  }

  getOAuthUrl(platform: string): string {
    return `${this.baseUrl}/api/auth/${platform}`;
  }

  // ==================== Post endpoints ====================

  async createPost(data: CreatePostData): Promise<Post> {
    return this.fetch('/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async publishPost(postId: string): Promise<Post> {
    return this.fetch(`/posts/${postId}/publish`, {
      method: 'POST',
    });
  }

  async getPosts(status?: string): Promise<Post[]> {
    const query = status ? `?status=${status}` : '';
    return this.fetch(`/posts${query}`);
  }

  async getPost(postId: string): Promise<Post> {
    return this.fetch(`/posts/${postId}`);
  }

  async deletePost(postId: string): Promise<void> {
    return this.fetch(`/posts/${postId}`, { method: 'DELETE' });
  }

  async previewSplit(content: string, platforms: string[]): Promise<SplitResult[]> {
    return this.fetch('/posts/preview-split', {
      method: 'POST',
      body: JSON.stringify({ content, platforms }),
    });
  }
}

// ==================== Types ====================

export interface PlatformConnection {
  id: string;
  platform: 'facebook' | 'instagram' | 'twitter' | 'threads';
  platformUsername?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePostData {
  content: string;
  platforms: string[];
  mediaUrls?: string[];
  mediaType?: 'image' | 'video';
  scheduledAt?: string;
}

export interface Post {
  id: string;
  content: string;
  platforms: string[];
  mediaUrls: string[];
  mediaType?: string;
  scheduledAt?: string;
  publishedAt?: string;
  status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';
  results?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface SplitResult {
  platform: string;
  chunks: string[];
  needsSplitting: boolean;
}

export const api = new ApiClient(API_URL);
