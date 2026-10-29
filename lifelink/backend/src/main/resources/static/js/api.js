// LifeLink - API Client
const API_BASE_URL = (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin.includes(':8080')) 
  ? '/api' 
  : 'http://localhost:8080/api';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  getToken() {
    return localStorage.getItem('lifelink_token');
  }

  setToken(token) {
    if (token) {
      localStorage.setItem('lifelink_token', token);
    } else {
      localStorage.removeItem('lifelink_token');
    }
  }

  getHeaders(isJson = true) {
    const headers = {};
    if (isJson) {
      headers['Content-Type'] = 'application/json';
    }
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const isJson = !(options.body instanceof FormData);
    const headers = { ...this.getHeaders(isJson), ...options.headers };

    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Token expired or invalid
          if (endpoint !== '/auth/login' && endpoint !== '/auth/register') {
            console.warn('Unauthorized access. Redirecting to login if necessary.');
          }
        }
        throw new Error(data.message || 'API request failed');
      }
      return data;
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // Auth
  async login(email, password) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (res.data && res.data.token) {
      this.setToken(res.data.token);
      localStorage.setItem('lifelink_user', JSON.stringify(res.data.user));
    }
    return res.data;
  }

  async register(userData) {
    const res = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    if (res.data && res.data.token) {
      this.setToken(res.data.token);
      localStorage.setItem('lifelink_user', JSON.stringify(res.data.user));
    }
    return res.data;
  }

  async getCurrentUser() {
    return (await this.request('/auth/me')).data;
  }

  // Hospitals
  async getHospitals(city = '') {
    const q = city ? `?city=${encodeURIComponent(city)}` : '';
    return (await this.request(`/hospitals${q}`)).data;
  }

  async getPublicHospitals() {
    return (await this.request('/hospitals/public')).data;
  }

  // Cases
  async getCases(status = '') {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return (await this.request(`/cases${q}`)).data;
  }

  async getCaseById(id) {
    return (await this.request(`/cases/${id}`)).data;
  }

  async createCase(caseData) {
    return (await this.request('/cases', {
      method: 'POST',
      body: JSON.stringify(caseData)
    })).data;
  }

  async updateWorkflow(id, workflowStatus, notes = '') {
    return (await this.request(`/cases/${id}/workflow`, {
      method: 'PATCH',
      body: JSON.stringify({ workflowStatus, notes })
    })).data;
  }

  // Assessments
  async getAssessments(caseId) {
    return (await this.request(`/cases/${caseId}/assessments`)).data;
  }

  async updateAssessment(id, assessmentData) {
    return (await this.request(`/assessments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(assessmentData)
    })).data;
  }

  // Consent
  async getConsent(caseId) {
    return (await this.request(`/cases/${caseId}/consent`)).data;
  }

  async updateConsent(caseId, consentData) {
    return (await this.request(`/cases/${caseId}/consent`, {
      method: 'PUT',
      body: JSON.stringify(consentData)
    })).data;
  }

  // Transports
  async getTransports() {
    return (await this.request('/transports')).data;
  }

  async getTransportById(id) {
    return (await this.request(`/transports/${id}`)).data;
  }

  async trackPublicTransport(trackingNumber) {
    return (await this.request(`/transports/public/track/${trackingNumber}`)).data;
  }

  async createTransport(transportData) {
    return (await this.request('/transports', {
      method: 'POST',
      body: JSON.stringify(transportData)
    })).data;
  }

  async updateLocation(id, locationData) {
    return (await this.request(`/transports/${id}/location`, {
      method: 'POST',
      body: JSON.stringify(locationData)
    })).data;
  }

  async updateTransportStatus(id, statusData) {
    return (await this.request(`/transports/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(statusData)
    })).data;
  }

  async getTelemetry(id) {
    return (await this.request(`/transports/${id}/telemetry`)).data;
  }

  // Funding
  async getCampaigns() {
    return (await this.request('/funding/campaigns')).data;
  }

  async getPublicCampaigns() {
    return (await this.request('/funding/public/campaigns')).data;
  }

  async getCampaignById(id) {
    return (await this.request(`/funding/campaigns/${id}`)).data;
  }

  async getCampaignBudgets(id) {
    return (await this.request(`/funding/campaigns/${id}/budgets`)).data;
  }

  async getCampaignTransactions(id) {
    return (await this.request(`/funding/campaigns/${id}/transactions`)).data;
  }

  async getCampaignExpenses(id) {
    return (await this.request(`/funding/campaigns/${id}/expenses`)).data;
  }

  async contribute(contributionData) {
    return (await this.request('/funding/contribute', {
      method: 'POST',
      body: JSON.stringify(contributionData)
    })).data;
  }

  async verifyPayment(verificationData) {
    return (await this.request('/funding/verify', {
      method: 'POST',
      body: JSON.stringify(verificationData)
    })).data;
  }

  async verifyReceiptHash(hash) {
    return (await this.request(`/funding/receipts/verify-hash/${hash}`)).data;
  }

  async getReceiptByNumber(number) {
    return (await this.request(`/funding/receipts/${number}`)).data;
  }

  async submitExpense(expenseData) {
    return (await this.request('/funding/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseData)
    })).data;
  }

  async auditExpense(id, auditData) {
    return (await this.request(`/funding/expenses/${id}/audit`, {
      method: 'PATCH',
      body: JSON.stringify(auditData)
    })).data;
  }

  async getReconciliations() {
    return (await this.request('/funding/reconciliations')).data;
  }

  // Notifications
  async getNotifications() {
    return (await this.request('/notifications')).data;
  }

  async markAllNotificationsRead() {
    return (await this.request('/notifications/mark-read', { method: 'POST' })).data;
  }

  // Reports
  async getDashboardStats() {
    return (await this.request('/reports/dashboard-stats')).data;
  }
}

const api = new ApiClient();
