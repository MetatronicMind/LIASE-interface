import { getApiBaseUrl } from '../config/api';

export interface LegacyDataItem {
  [key: string]: any;
}

class LegacyDataService {
  private getAuthHeaders() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '';
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  async uploadData(data: any[]) {
    const response = await fetch(`${getApiBaseUrl()}/legacy-data`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ data })
    });
    if (!response.ok) throw new Error('Failed to upload data');
    return response.json();
  }

  async getData() {
    const response = await fetch(`${getApiBaseUrl()}/legacy-data`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to fetch data');
    return response.json();
  }

  async resetData() {
    const response = await fetch(`${getApiBaseUrl()}/legacy-data`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    if (!response.ok) throw new Error('Failed to reset data');
    return response.json();
  }
}

export const legacyDataService = new LegacyDataService();
