import axios from "axios"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // CSRF: echo XSRF-TOKEN cookie in header
    const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/)
    const csrf = match ? decodeURIComponent(match[1]) : null
    if (csrf) {
      config.headers["X-CSRF-Token"] = csrf
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Response interceptor to handle token refresh and better error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      const url = (originalRequest.url || '') as string
      if (url.includes('/auth/refresh') || url.includes('/auth/login') || url.includes('/auth/register') || url.includes('/auth/me')) {
        return Promise.reject(error)
      }
      originalRequest._retry = true
      try {
        await axios.post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
        return api(originalRequest)
      } catch (refreshError) {
        return Promise.reject(refreshError)
      }
    }

    // Better error message extraction
    const msg =
      error?.response?.data?.error?.message ||
      error?.response?.data?.message ||
      error?.message || "Request failed"
    
    return Promise.reject(new Error(msg))
  },
)

// API functions
export const authAPI = {
  login: (email: string, password: string) => api.post("/auth/login", { email, password }),
  register: (userData: any) => api.post("/auth/register", userData),
  logout: () => api.post("/auth/logout"),
  refreshToken: (refreshToken: string) => api.post("/auth/refresh", { refreshToken }),
  me: () => api.get("/auth/me"),
  forgotPassword: (email: string) => api.post("/auth/forgot-password", { email }),
  resetPassword: (token: string, password: string) => api.post("/auth/reset-password", { token, password }),
}

export const userAPI = {
  getProfile: () => api.get("/users/profile"),
  updateProfile: (data: any) => api.put("/users/profile", data),
  updatePreferences: (data: any) => api.put("/users/preferences", data),
  changePassword: (data: any) => api.put("/users/password", data),
  uploadAvatar: (formData: FormData) =>
    api.post("/users/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  searchUsers: (query: string) => api.get(`/users/search?q=${query}`),
  getBalance: () => api.get("/users/balance"),
  getSessions: () => api.get("/users/sessions"),
  revokeSession: (sessionId: string) => api.delete(`/users/sessions/${sessionId}`),
}

export const friendsAPI = {
  createInvite: (data: { inviteeEmail?: string; message?: string }) => api.post("/friends/invites", data),
  getInvite: (code: string) => api.get(`/friends/invites/${code}`),
  acceptInvite: (code: string) => api.post(`/friends/invites/${code}/accept`),
  revokeInvite: (code: string) => api.post(`/friends/invites/${code}/revoke`),
}

export const conversationAPI = {
  upsertDM: (userId: string) => api.post("/conversations/dm", { userId }),
  upsertGroup: (groupId: string) => api.post("/conversations/group", { groupId }),
  list: () => api.get("/conversations"),
  listMessages: (id: string, params?: { cursor?: string; limit?: number }) =>
    api.get(`/conversations/${id}/messages`, { params }),
  sendMessage: (data: { conversationId: string; text: string; attachments?: any[] }) => api.post("/conversations/messages", data),
}

export const groupAPI = {
  getGroups: (params?: { search?: string; limit?: number; page?: number }) => 
    api.get("/groups", { params }),
  getGroup: (id: string) => api.get(`/groups/${id}`),
  createGroup: (data: FormData) => api.post("/groups", data),
  updateGroup: (id: string, data: FormData) => api.put(`/groups/${id}`, data),
  deleteGroup: (id: string) => api.delete(`/groups/${id}`),
  joinGroup: (inviteCode: string) => api.post("/groups/join", { inviteCode }),
  leaveGroup: (id: string) => api.post(`/groups/${id}/leave`),
  addMember: (groupId: string, userId: string) => api.post(`/groups/${groupId}/members`, { userId }),
  removeMember: (groupId: string, userId: string) => api.delete(`/groups/${groupId}/members/${userId}`),
  updateMemberRole: (groupId: string, userId: string, role: string) => 
    api.put(`/groups/${groupId}/members/${userId}`, { role }),
  getGroupExpenses: (groupId: string, params?: any) => 
    api.get(`/groups/${groupId}/expenses`, { params }),
  getGroupBalance: (groupId: string) => api.get(`/groups/${groupId}/balance`),
  getGroupSettlements: (groupId: string) => api.get(`/groups/${groupId}/settlements`),
  createGroupInvite: (groupId: string, data: any) => 
    api.post(`/groups/${groupId}/invites`, data),
  getGroupInvites: (groupId: string) => api.get(`/groups/${groupId}/invites`),
  acceptGroupInvite: (inviteId: string) => api.post(`/invites/${inviteId}/accept`),
  declineGroupInvite: (inviteId: string) => api.post(`/invites/${inviteId}/decline`),
}

export const expenseAPI = {
  getExpenses: (groupId?: string | { search?: string; limit?: number; page?: number; groupId?: string }) => {
    if (typeof groupId === 'string') {
      return api.get(`/expenses?groupId=${groupId}`)
    } else if (groupId && typeof groupId === 'object') {
      return api.get('/expenses', { params: groupId })
    } else {
      return api.get('/expenses')
    }
  },
  createExpense: (data: any) => api.post("/expenses", data),
  create: (payload: any) => api.post('/expenses', payload).then(r => r.data?.data),
  getExpense: (id: string) => api.get(`/expenses/${id}`),
  updateExpense: (id: string, data: any) => api.put(`/expenses/${id}`, data),
  deleteExpense: (id: string) => api.delete(`/expenses/${id}`),
  settleExpense: (id: string, userId: string) => api.patch(`/expenses/${id}/settle`, { userId }),
  getRecurringExpenses: () => api.get("/expenses/recurring"),
  createRecurringExpense: (data: any) => api.post("/expenses/recurring", data),
  updateRecurringExpense: (id: string, data: any) => api.put(`/expenses/recurring/${id}`, data),
  deleteRecurringExpense: (id: string) => api.delete(`/expenses/recurring/${id}`),
}

export const notificationAPI = {
  getNotifications: () => api.get("/notifications"),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put("/notifications/read-all"),
  deleteNotification: (id: string) => api.delete(`/notifications/${id}`),
  getPreferences: () => api.get("/notifications/preferences"),
  updatePreferences: (data: any) => api.put("/notifications/preferences", data),
}

export const receiptAPI = {
  uploadReceipt: (formData: FormData) =>
    api.post("/receipts/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getReceipts: () => api.get("/receipts"),
  getReceipt: (id: string) => api.get(`/receipts/${id}`),
  updateReceipt: (id: string, data: any) => api.put(`/receipts/${id}`, data),
  linkToExpense: (id: string, expenseId: string) => api.put(`/receipts/${id}/link-expense`, { expenseId }),
  reprocessReceipt: (id: string) => api.post(`/receipts/${id}/reprocess`),
}

export const analyticsAPI = {
  // KPIs and overview
  getKPIs: (filters = {}) => api.get('/analytics/kpis', { params: filters }),
  getSpendOverTime: (filters = {}) => api.get('/analytics/spend-over-time', { params: filters }),
  getCategoryBreakdown: (filters = {}) => api.get('/analytics/category-breakdown', { params: filters }),
  getSpendingOverview: (filters = {}) => api.get('/analytics/spending-overview', { params: filters }),
  getExpenseTrends: (filters = {}) => api.get('/analytics/expense-trends', { params: filters }),
  
  // Partners and relationships
  getTopPartners: (filters = {}) => api.get('/analytics/top-partners', { params: filters }),
  
  // Group-specific analytics
  getBalanceMatrix: (groupId: string) => api.get(`/analytics/balance-matrix?groupId=${groupId}`),
  getSettlementSuggestions: (groupId: string) => api.get(`/analytics/simplify?groupId=${groupId}`),
  
  // Aging and settlements
  getAgingBuckets: (filters = {}) => api.get('/analytics/aging', { params: filters }),
  
  // Data export
  getLedger: (filters = {}) => api.get('/analytics/ledger', { params: filters }),
  exportCSV: (filters = {}) => api.get('/analytics/export/csv', { params: filters }),
  
  // Group health
  getGroupHealth: (groupId: string) => api.get(`/analytics/group-health?groupId=${groupId}`),
  
  // Legacy endpoints for backward compatibility
  getSpendingAnalytics: (period: string) => api.get(`/analytics/spending?period=${period}`),
  getGroupAnalytics: (groupId: string) => api.get(`/analytics/groups/${groupId}`),
  getBalanceOverview: () => api.get("/analytics/balance"),
  exportData: (format: string, period?: string, groupId?: string) => {
    const params = new URLSearchParams({ format })
    if (period) params.append('period', period)
    if (groupId) params.append('groupId', groupId)
    return api.get(`/analytics/export?${params.toString()}`)
  },
  getPredictions: () => api.get("/analytics/predictions"),
}



export const calendarAPI = {
  getMonth: (params: { year: number; month: number; mode?: 'personal' | 'group' | 'all'; groupIds?: string[]; baseCurrency?: string }) => 
    api.get("/calendar/month", { params }),
  getIntegrations: () => api.get("/calendar/integrations"),
  connectProvider: (provider: string, data: any) => api.post(`/calendar/connect/${provider}`, data),
  disconnectProvider: (provider: string) => api.delete(`/calendar/disconnect/${provider}`),
  syncEvents: () => api.post("/calendar/sync"),
  getEvents: () => api.get("/calendar/events"),
}

export const adminAPI = {
  getDashboard: () => api.get("/admin/dashboard"),
  getUsers: (params: any) => api.get("/admin/users", { params }),
  updateUser: (id: string, data: any) => api.put(`/admin/users/${id}`, data),
  getGroups: (params: any) => api.get("/admin/groups", { params }),
  getExpenses: (params: any) => api.get("/admin/expenses", { params }),
  getReports: () => api.get("/admin/reports"),
  getFeatureFlags: () => api.get("/admin/feature-flags"),
  updateFeatureFlag: (id: string, data: any) => api.put(`/admin/feature-flags/${id}`, data),
}
