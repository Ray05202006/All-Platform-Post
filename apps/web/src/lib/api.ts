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

  // ==================== Schedule endpoints ====================

  async updateSchedule(postId: string, scheduledAt: Date): Promise<Post> {
    return this.fetch(`/posts/${postId}/schedule`, {
      method: 'PUT',
      body: JSON.stringify({ scheduledAt: scheduledAt.toISOString() }),
    });
  }

  async cancelSchedule(postId: string): Promise<Post> {
    return this.fetch(`/posts/${postId}/schedule`, {
      method: 'DELETE',
    });
  }

  async getScheduleStatus(postId: string): Promise<ScheduleStatus> {
    return this.fetch(`/posts/${postId}/schedule-status`);
  }

  async getPendingSchedules(): Promise<PendingJob[]> {
    return this.fetch('/scheduler/pending');
  }

  // ==================== Media endpoints ====================

  async uploadMedia(file: File): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);

    const token = this.getToken();
    const response = await fetch(`${this.baseUrl}/api/media/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async uploadMultipleMedia(files: File[]): Promise<{ success: boolean; files: MediaFile[] }> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const token = this.getToken();
    const response = await fetch(`${this.baseUrl}/api/media/upload-multiple`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async validateMedia(filename: string, platforms: string[]): Promise<MediaValidation> {
    return this.fetch('/media/validate', {
      method: 'POST',
      body: JSON.stringify({ filename, platforms }),
    });
  }

  async deleteMedia(filename: string): Promise<void> {
    return this.fetch(`/media/${filename}`, { method: 'DELETE' });
  }

  getMediaUrl(filename: string): string {
    return `${this.baseUrl}/uploads/media/${filename}`;
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

export interface ScheduleStatus {
  exists: boolean;
  status?: string;
  scheduledFor?: string;
}

export interface PendingJob {
  id: string;
  postId: string;
  userId: string;
  delay: number;
  scheduledFor: string;
  attemptsMade: number;
}

export interface MediaFile {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
  url: string;
  width?: number;
  height?: number;
  thumbnail?: string;
}

export interface UploadResult {
  success: boolean;
  file: MediaFile;
}

export interface MediaValidation {
  valid: boolean;
  errors: Record<string, string[]>;
  file: MediaFile;
}

export const api = new ApiClient(API_URL);
