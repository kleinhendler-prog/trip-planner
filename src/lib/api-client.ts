/**
 * Client-Side API Client
 * Wrapper for fetch with NextAuth session token integration
 * Handles requests to backend API routes
 */

import { getSession } from 'next-auth/react';
import { API_BASE_URL, API_TIMEOUT } from '@/lib/constants';
import type { ApiResponse, ApiError } from '@/types';

// ============= Types =============

export interface FetchOptions extends RequestInit {
  timeout?: number;
  skipAuth?: boolean;
}

export interface ApiClientOptions {
  baseUrl?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

// ============= API Client Class =============

class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private defaultHeaders: Record<string, string>;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl || API_BASE_URL;
    this.timeout = options.timeout || API_TIMEOUT;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
  }

  /**
   * Set authorization header with NextAuth token
   */
  private async getAuthToken(): Promise<string | null> {
    try {
      const session = await getSession();
      return session?.user?.id || null;
    } catch {
      return null;
    }
  }

  /**
   * Make a fetch request with error handling and timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: FetchOptions = {}
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...this.defaultHeaders,
          ...options.headers,
        },
      });

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Parse response and handle errors
   */
  private async parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    if (!response.ok) {
      const error: ApiError = {
        code: `HTTP_${response.status}`,
        message: response.statusText,
      };

      if (isJson) {
        try {
          const errorData = await response.json();
          error.message = errorData.message || error.message;
          error.details = errorData.details;
        } catch {
          // Use default error
        }
      }

      return {
        success: false,
        error: error.message,
      };
    }

    if (!isJson) {
      return {
        success: true,
        data: (await response.text()) as unknown as T,
      };
    }

    try {
      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch {
      return {
        success: true,
        data: null as unknown as T,
      };
    }
  }

  /**
   * GET request
   */
  async get<T = unknown>(
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const fetchOptions: FetchOptions = {
      method: 'GET',
      ...options,
    };

    if (!options.skipAuth) {
      const token = await this.getAuthToken();
      if (token) {
        fetchOptions.headers = {
          ...fetchOptions.headers,
          Authorization: `Bearer ${token}`,
        };
      }
    }

    const response = await this.fetchWithTimeout(url, fetchOptions);
    return this.parseResponse<T>(response);
  }

  /**
   * POST request
   */
  async post<T = unknown>(
    endpoint: string,
    body?: unknown,
    options: FetchOptions = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const fetchOptions: FetchOptions = {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    };

    if (!options.skipAuth) {
      const token = await this.getAuthToken();
      if (token) {
        fetchOptions.headers = {
          ...fetchOptions.headers,
          Authorization: `Bearer ${token}`,
        };
      }
    }

    const response = await this.fetchWithTimeout(url, fetchOptions);
    return this.parseResponse<T>(response);
  }

  /**
   * PUT request
   */
  async put<T = unknown>(
    endpoint: string,
    body?: unknown,
    options: FetchOptions = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const fetchOptions: FetchOptions = {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    };

    if (!options.skipAuth) {
      const token = await this.getAuthToken();
      if (token) {
        fetchOptions.headers = {
          ...fetchOptions.headers,
          Authorization: `Bearer ${token}`,
        };
      }
    }

    const response = await this.fetchWithTimeout(url, fetchOptions);
    return this.parseResponse<T>(response);
  }

  /**
   * PATCH request
   */
  async patch<T = unknown>(
    endpoint: string,
    body?: unknown,
    options: FetchOptions = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const fetchOptions: FetchOptions = {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    };

    if (!options.skipAuth) {
      const token = await this.getAuthToken();
      if (token) {
        fetchOptions.headers = {
          ...fetchOptions.headers,
          Authorization: `Bearer ${token}`,
        };
      }
    }

    const response = await this.fetchWithTimeout(url, fetchOptions);
    return this.parseResponse<T>(response);
  }

  /**
   * DELETE request
   */
  async delete<T = unknown>(
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const fetchOptions: FetchOptions = {
      method: 'DELETE',
      ...options,
    };

    if (!options.skipAuth) {
      const token = await this.getAuthToken();
      if (token) {
        fetchOptions.headers = {
          ...fetchOptions.headers,
          Authorization: `Bearer ${token}`,
        };
      }
    }

    const response = await this.fetchWithTimeout(url, fetchOptions);
    return this.parseResponse<T>(response);
  }

  /**
   * Upload file with FormData
   */
  async uploadFile<T = unknown>(
    endpoint: string,
    file: File,
    options: FetchOptions = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const formData = new FormData();
    formData.append('file', file);

    const fetchOptions: FetchOptions = {
      method: 'POST',
      body: formData,
      headers: {
        // Remove Content-Type to let browser set it with boundary
        ...options.headers,
      },
      ...options,
    };

    // Remove Content-Type for multipart/form-data
    delete (fetchOptions.headers as Record<string, string>)['Content-Type'];

    if (!options.skipAuth) {
      const token = await this.getAuthToken();
      if (token) {
        fetchOptions.headers = {
          ...fetchOptions.headers,
          Authorization: `Bearer ${token}`,
        };
      }
    }

    const response = await this.fetchWithTimeout(url, fetchOptions);
    return this.parseResponse<T>(response);
  }
}

/**
 * Export singleton instance
 */
export const apiClient = new ApiClient();

/**
 * Export class for custom initialization
 */
export default ApiClient;
