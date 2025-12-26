const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

function getHeaders(): HeadersInit {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function request(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  async login(username: string, password: string) {
    const data = await request(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (data.token) localStorage.setItem('token', data.token);
    return data;
  },

  async getUsers() {
    return request(`${API_BASE}/auth/users`, { headers: getHeaders() });
  },

  async addUser(name: string, username: string, password: string) {
    return request(`${API_BASE}/auth/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, username, password })
    });
  },

  async deleteUser(id: string) {
    return request(`${API_BASE}/auth/users/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
  },

  async getContacts(category?: string) {
    const url = category ? `${API_BASE}/contacts?category=${category}` : `${API_BASE}/contacts`;
    return request(url, { headers: getHeaders() });
  },

  async createContact(contact: any) {
    return request(`${API_BASE}/contacts`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(contact)
    });
  },

  async updateContact(id: string, contact: any) {
    return request(`${API_BASE}/contacts/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(contact)
    });
  },

  async deleteContact(id: string) {
    return request(`${API_BASE}/contacts/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
  },

  async getDepartments() {
    return request(`${API_BASE}/settings/departments`, { headers: getHeaders() });
  },

  async addDepartment(name: string) {
    return request(`${API_BASE}/settings/departments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name })
    });
  },

  async getIndustries() {
    return request(`${API_BASE}/settings/industries`, { headers: getHeaders() });
  },

  async addIndustry(name: string) {
    return request(`${API_BASE}/settings/industries`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name })
    });
  },

  async getOutsourceTypes() {
    return request(`${API_BASE}/settings/outsource-types`, { headers: getHeaders() });
  },

  async addOutsourceType(name: string) {
    return request(`${API_BASE}/settings/outsource-types`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name })
    });
  },

  async renameItem(type: string, oldName: string, newName: string) {
    return request(`${API_BASE}/settings/rename`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ type, oldName, newName })
    });
  }
};
