import { invoke } from '@tauri-apps/api/core';
import { Customer, Project, Activity, TimeEntry } from '../store';

export interface KimaiApiError {
  message: string;
  code?: number;
  details?: any;
}

export class KimaiApiClient {
  private baseUrl: string = '';
  private token: string = '';

  constructor(baseUrl?: string, token?: string) {
    if (baseUrl) this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    if (token) this.token = token;
  }

  // Initialize client with credentials from secure storage
  static async fromStorage(): Promise<KimaiApiClient> {
    try {
      // Check if we're in Tauri environment
      if (typeof window !== 'undefined' && '__TAURI__' in window) {
        const credentials = await invoke<[string, string] | null>('load_credentials');
        if (credentials) {
          const [serverUrl, apiToken] = credentials;
          return new KimaiApiClient(serverUrl, apiToken);
        }
      } else {
        // Browser environment - use localStorage as fallback
        const serverUrl = localStorage.getItem('kimai_server_url');
        const apiToken = localStorage.getItem('kimai_api_token');
        if (serverUrl && apiToken) {
          return new KimaiApiClient(serverUrl, apiToken);
        }
      }
      return new KimaiApiClient();
    } catch (error) {
      console.error('Failed to load credentials:', error);
      return new KimaiApiClient();
    }
  }

  // Save credentials to secure storage
  async saveCredentials(serverUrl: string, apiToken: string): Promise<void> {
    try {
      if (typeof window !== 'undefined' && '__TAURI__' in window) {
        await invoke('save_credentials', { serverUrl, apiToken });
      } else {
        // Browser environment - use localStorage as fallback
        localStorage.setItem('kimai_server_url', serverUrl);
        localStorage.setItem('kimai_api_token', apiToken);
      }
      this.baseUrl = serverUrl.replace(/\/$/, '');
      this.token = apiToken;
    } catch (error) {
      throw new Error(`Failed to save credentials: ${error}`);
    }
  }

  // Clear stored credentials
  async clearCredentials(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && '__TAURI__' in window) {
        await invoke('clear_credentials');
      } else {
        // Browser environment - clear localStorage
        localStorage.removeItem('kimai_server_url');
        localStorage.removeItem('kimai_api_token');
      }
      this.baseUrl = '';
      this.token = '';
    } catch (error) {
      throw new Error(`Failed to clear credentials: ${error}`);
    }
  }

  // Check if client is configured
  isConfigured(): boolean {
    return Boolean(this.baseUrl && this.token);
  }

  // Generic API request method
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.baseUrl || !this.token) {
      throw new Error('API client not configured. Please set server URL and API token.');
    }

    // Handle URL construction properly
    let url: string;
    if (this.baseUrl.endsWith('/api')) {
      url = `${this.baseUrl}${endpoint}`;
    } else {
      url = `${this.baseUrl}/api${endpoint}`;
    }
    
    console.log('API Request:', url);
    console.log('Token configured:', this.token ? 'Yes (length: ' + this.token.length + ')' : 'No');
    
    const headers = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        // Special handling for 401 errors
        if (response.status === 401) {
          console.error('401 Unauthorized - Token might be invalid or expired');
          console.error('Request URL:', url);
          console.error('Authorization header:', headers.Authorization ? 'Bearer ***' + this.token.slice(-4) : 'Missing');
          errorMessage = 'Unauthorized: Please check your API token and ensure it has the correct permissions';
        }
        
        // Special handling for 400 errors
        if (response.status === 400) {
          console.error('400 Bad Request - Invalid parameters or data format');
          console.error('Request URL:', url);
          console.error('Error response:', errorText);
          if (url.includes('/timesheets')) {
            console.error('Timesheet API error - check date formats and parameters');
          }
        }
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch {
          // If not JSON, use the raw text
          if (errorText) {
            errorMessage = errorText;
          }
        }

        const error: KimaiApiError = {
          message: errorMessage,
          code: response.status,
        };

        throw error;
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }

      // For non-JSON responses, return as text
      return (await response.text()) as unknown as T;
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        // Re-throw KimaiApiError
        throw error;
      }

      // Network or other errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(`Connection failed: Unable to reach ${this.baseUrl}. Check if the server is running and accessible.`);
      }
      throw new Error(`Network error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Test connection and authentication
  async ping(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/ping');
  }

  // Get API version
  async getVersion(): Promise<{ version: string; candidate: string }> {
    return this.request<{ version: string; candidate: string }>('/version');
  }

  // Customer endpoints
  async getCustomers(): Promise<Customer[]> {
    return this.request<Customer[]>('/customers');
  }

  async getCustomer(id: number): Promise<Customer> {
    return this.request<Customer>(`/customers/${id}`);
  }

  async createCustomer(customer: Omit<Customer, 'id'>): Promise<Customer> {
    return this.request<Customer>('/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    });
  }

  // Project endpoints
  async getProjects(customerId?: number): Promise<Project[]> {
    const query = customerId ? `?customer=${customerId}` : '';
    return this.request<Project[]>(`/projects${query}`);
  }

  async getProject(id: number): Promise<Project> {
    return this.request<Project>(`/projects/${id}`);
  }

  async createProject(project: Omit<Project, 'id'>): Promise<Project> {
    return this.request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(project),
    });
  }

  // Activity endpoints
  async getActivities(projectId?: number): Promise<Activity[]> {
    const query = projectId ? `?project=${projectId}` : '';
    return this.request<Activity[]>(`/activities${query}`);
  }

  async getActivity(id: number): Promise<Activity> {
    return this.request<Activity>(`/activities/${id}`);
  }

  async createActivity(activity: Omit<Activity, 'id'>): Promise<Activity> {
    return this.request<Activity>('/activities', {
      method: 'POST',
      body: JSON.stringify(activity),
    });
  }

  // Timesheet endpoints
  async getTimesheets(params?: {
    user?: number;
    customer?: number;
    project?: number;
    activity?: number;
    begin?: string; // ISO date
    end?: string;   // ISO date
    exported?: boolean;
  }): Promise<TimeEntry[]> {
    const query = params ? '?' + new URLSearchParams(
      Object.entries(params)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [key, String(value)])
    ).toString() : '';
    
    return this.request<TimeEntry[]>(`/timesheets${query}`);
  }

  async getTimesheet(id: number): Promise<TimeEntry> {
    return this.request<TimeEntry>(`/timesheets/${id}`);
  }

  async createTimesheet(timeEntry: {
    begin: string; // HTML5 format: YYYY-MM-DDTHH:mm:ss
    end?: string;
    project: number;
    activity: number;
    description?: string;
  }): Promise<TimeEntry> {
    return this.request<TimeEntry>('/timesheets', {
      method: 'POST',
      body: JSON.stringify(timeEntry),
    });
  }

  async updateTimesheet(id: number, timeEntry: Partial<{
    begin: string;
    end: string;
    project: number;
    activity: number;
    description: string;
  }>): Promise<TimeEntry> {
    return this.request<TimeEntry>(`/timesheets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(timeEntry),
    });
  }

  async deleteTimesheet(id: number): Promise<void> {
    return this.request<void>(`/timesheets/${id}`, {
      method: 'DELETE',
    });
  }

  // Helper method to format dates for Kimai API
  static formatDateForApi(date: Date): string {
    // Kimai expects HTML5 format: YYYY-MM-DDTHH:mm:ss
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  // Helper method to parse ISO dates from API responses
  static parseApiDate(dateString: string): Date {
    return new Date(dateString);
  }
}

// Create a singleton instance that initializes itself
class KimaiApiSingleton {
  private client: KimaiApiClient = new KimaiApiClient();
  private initialized: boolean = false;

  async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      this.client = await KimaiApiClient.fromStorage();
      this.initialized = true;
    }
  }

  // Delegate all methods to the client
  async ping() {
    await this.ensureInitialized();
    return this.client.ping();
  }

  async getVersion() {
    await this.ensureInitialized();
    return this.client.getVersion();
  }

  async getCustomers() {
    await this.ensureInitialized();
    return this.client.getCustomers();
  }

  async getCustomer(id: number) {
    await this.ensureInitialized();
    return this.client.getCustomer(id);
  }

  async createCustomer(customer: any) {
    await this.ensureInitialized();
    return this.client.createCustomer(customer);
  }

  async getProjects(customerId?: number) {
    await this.ensureInitialized();
    return this.client.getProjects(customerId);
  }

  async getProject(id: number) {
    await this.ensureInitialized();
    return this.client.getProject(id);
  }

  async createProject(project: any) {
    await this.ensureInitialized();
    return this.client.createProject(project);
  }

  async getActivities(projectId?: number) {
    await this.ensureInitialized();
    return this.client.getActivities(projectId);
  }

  async getActivity(id: number) {
    await this.ensureInitialized();
    return this.client.getActivity(id);
  }

  async createActivity(activity: any) {
    await this.ensureInitialized();
    return this.client.createActivity(activity);
  }

  async getTimesheets(params?: any) {
    await this.ensureInitialized();
    return this.client.getTimesheets(params);
  }

  async getTimesheet(id: number) {
    await this.ensureInitialized();
    return this.client.getTimesheet(id);
  }

  async createTimesheet(timeEntry: any) {
    await this.ensureInitialized();
    return this.client.createTimesheet(timeEntry);
  }

  async updateTimesheet(id: number, timeEntry: any) {
    await this.ensureInitialized();
    return this.client.updateTimesheet(id, timeEntry);
  }

  async deleteTimesheet(id: number) {
    await this.ensureInitialized();
    return this.client.deleteTimesheet(id);
  }

  async saveCredentials(serverUrl: string, apiToken: string) {
    await this.client.saveCredentials(serverUrl, apiToken);
    // Reinitialize after saving
    this.initialized = false;
    await this.ensureInitialized();
  }

  async clearCredentials() {
    await this.client.clearCredentials();
    this.initialized = false;
  }

  isConfigured(): boolean {
    return this.client.isConfigured();
  }

  // For direct access in debugging
  getClient(): KimaiApiClient {
    return this.client;
  }

  // For testing purposes - expose initialization
  async forceInitialize(): Promise<void> {
    this.initialized = false;
    await this.ensureInitialized();
  }
}

export const kimaiApi = new KimaiApiSingleton();