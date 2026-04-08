const API_URL = import.meta.env.VITE_API_URL || '';

// Helper to get auth token
const getToken = () => localStorage.getItem('token');

// Generic fetch wrapper
async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const url = `${API_URL}/api${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };
  
  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }
  
  return data;
}

// Auth API
export const authAPI = {
  register: (userData: { email: string; password: string; firstName?: string; lastName?: string; phone?: string }) =>
    fetchAPI('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  
  login: (credentials: { email: string; password: string }) =>
    fetchAPI('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  
  getMe: () =>
    fetchAPI('/auth/me'),
  
  updateProfile: (profileData: Record<string, unknown>) =>
    fetchAPI('/auth/profile', { method: 'PUT', body: JSON.stringify(profileData) }),
  
  changePassword: (passwords: { currentPassword: string; newPassword: string }) =>
    fetchAPI('/auth/password', { method: 'PUT', body: JSON.stringify(passwords) }),
};

// Products API
export const productsAPI = {
  getAll: (params?: { category?: string; featured?: boolean; search?: string; limit?: number; offset?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.featured) queryParams.append('featured', 'true');
    if (params?.search) queryParams.append('search', params.search);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    return fetchAPI(`/products?${queryParams.toString()}`);
  },
  
  getBySlug: (slug: string) =>
    fetchAPI(`/products/${slug}`),
  
  create: (productData: Record<string, unknown>) =>
    fetchAPI('/products', { method: 'POST', body: JSON.stringify(productData) }),
  
  update: (id: string, productData: Record<string, unknown>) =>
    fetchAPI(`/products/${id}`, { method: 'PUT', body: JSON.stringify(productData) }),
  
  delete: (id: string) =>
    fetchAPI(`/products/${id}`, { method: 'DELETE' }),
  
  getCategories: () =>
    fetchAPI('/products/categories/all'),
  
  createCategory: (payload: { name: string; description?: string }) =>
    fetchAPI('/products/categories', { method: 'POST', body: JSON.stringify(payload) }),
  
  updateCategory: (id: string, payload: { name?: string; description?: string }) =>
    fetchAPI(`/products/categories/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  
  deleteCategory: (id: string) =>
    fetchAPI(`/products/categories/${id}`, { method: 'DELETE' }),
  
  updateCategoryImage: (id: string, image: string) =>
    fetchAPI(`/products/categories/${id}/image`, { method: 'PUT', body: JSON.stringify({ image }) }),
  
  updateCategoriesOrder: (order: string[]) =>
    fetchAPI('/products/categories/order', { method: 'PUT', body: JSON.stringify({ order }) }),
  
  getCategoryDetails: (id: string) =>
    fetchAPI(`/products/categories/${id}/details`),
  
  getReviews: (productId: string) =>
    fetchAPI(`/products/reviews/${productId}`),
  
  addReview: (productId: string, payload: { rating: number; comment?: string; imageUrl?: string; orderId?: string }) =>
    fetchAPI(`/products/reviews/${productId}`, { method: 'POST', body: JSON.stringify(payload) }),
};

// Users API (admin only)
export const usersAPI = {
  getAll: (params?: { search?: string; role?: string; limit?: number; offset?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.role) queryParams.append('role', params.role);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    return fetchAPI(`/users?${queryParams.toString()}`);
  },
  
  getById: (id: string) =>
    fetchAPI(`/users/${id}`),
  
  update: (id: string, userData: Record<string, unknown>) =>
    fetchAPI(`/users/${id}`, { method: 'PUT', body: JSON.stringify(userData) }),
  
  delete: (id: string) =>
    fetchAPI(`/users/${id}`, { method: 'DELETE' }),
  
  getStats: () =>
    fetchAPI('/users/stats/overview'),
};

// Orders API
export const ordersAPI = {
  create: (orderData: Record<string, unknown>) =>
    fetchAPI('/orders', { method: 'POST', body: JSON.stringify(orderData) }),
  
  getMyOrders: () =>
    fetchAPI('/orders/my-orders'),
  
  getAll: (params?: { status?: string; limit?: number; offset?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    return fetchAPI(`/orders?${queryParams.toString()}`);
  },
  
  getById: (id: string) =>
    fetchAPI(`/orders/${id}`),
  
  updateStatus: (id: string, statusData: { status?: string; paymentStatus?: string }) =>
    fetchAPI(`/orders/${id}/status`, { method: 'PUT', body: JSON.stringify(statusData) }),
  
  updateStatusWithEta: (id: string, payload: { status?: string; paymentStatus?: string; deliveryWindowStart?: string | null; deliveryWindowEnd?: string | null }) =>
    fetchAPI(`/orders/${id}/status`, { method: 'PUT', body: JSON.stringify(payload) }),
  
  cancel: (id: string) =>
    fetchAPI(`/orders/${id}/cancel`, { method: 'PUT' }),
  
  confirmDelivery: (id: string, payload: { proofUrl: string }) =>
    fetchAPI(`/orders/${id}/confirm-delivery`, { method: 'PUT', body: JSON.stringify(payload) }),
  
  getStats: () =>
    fetchAPI('/orders/stats/overview'),
};

// Settings API
export const settingsAPI = {
  get: () =>
    fetchAPI('/settings'),
  
  update: (settingsData: Record<string, unknown>) =>
    fetchAPI('/settings', { method: 'PUT', body: JSON.stringify(settingsData) }),
};

// Promotions API
export const promotionsAPI = {
  getAll: () =>
    fetchAPI('/promotions'),
  
  getActive: () =>
    fetchAPI('/promotions/active'),
  
  create: (promotionData: Record<string, unknown>) =>
    fetchAPI('/promotions', { method: 'POST', body: JSON.stringify(promotionData) }),
  
  update: (id: string, promotionData: Record<string, unknown>) =>
    fetchAPI(`/promotions/${id}`, { method: 'PUT', body: JSON.stringify(promotionData) }),
  
  delete: (id: string) =>
    fetchAPI(`/promotions/${id}`, { method: 'DELETE' }),
};

// Uploads API (admin only)
export const uploadsAPI = {
  upload: (data: string) =>
    fetchAPI('/uploads', { method: 'POST', body: JSON.stringify({ data }) }),
};

// Health check
export const healthAPI = {
  check: () =>
    fetchAPI('/health'),
};
