import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('smartprice_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error?.response?.data?.detail ||
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error.message ||
      'Request failed';
    return Promise.reject(new Error(message));
  }
);

function detectSite(url = '') {
  const u = String(url).toLowerCase();
  if (u.includes('amazon')) return 'amazon';
  if (u.includes('flipkart')) return 'flipkart';
  if (u.includes('myntra')) return 'myntra';
  return 'other';
}

/** Normalize backend snake_case product -> frontend camelCase (keeps both). */
export function normalizeProduct(p = {}) {
  if (!p || typeof p !== 'object') return p;
  const original = p.originalPrice ?? p.original_price ?? p.mrp ?? null;
  return {
    ...p,
    id: p.id ?? p._id,
    _id: p._id ?? p.id,
    currentPrice: p.currentPrice ?? p.current_price ?? p.price ?? null,
    price: p.price ?? p.current_price ?? p.currentPrice ?? null,
    desiredPrice: p.desiredPrice ?? p.desired_price ?? null,
    desired_price: p.desired_price ?? p.desiredPrice ?? null,
    current_price: p.current_price ?? p.currentPrice ?? p.price ?? null,
    originalPrice: original,
    original_price: original,
    mrp: original,
    lastChecked: p.lastChecked ?? p.last_checked ?? p.updatedAt ?? null,
    last_checked: p.last_checked ?? p.lastChecked ?? null,
    createdAt: p.createdAt ?? p.created_at ?? null,
    updatedAt: p.updatedAt ?? p.updated_at ?? null,
    image: p.image ?? p.image_url ?? null,
    image_url: p.image_url ?? p.image ?? null,
    site: p.site || detectSite(p.url || ''),
    dropPercent: p.dropPercent ?? p.price_drop_pct ?? 0,
  };
}

function normalizeStats(s = {}) {
  const lowest = s.lowest_price_product || s.lowestPriceProduct || null;
  return {
    ...s,
    totalProducts: s.totalProducts ?? s.total_products ?? 0,
    total_products: s.total_products ?? s.totalProducts ?? 0,
    avgPrice: s.avgPrice ?? s.avg_price ?? 0,
    avg_price: s.avg_price ?? s.avgPrice ?? 0,
    lowestPrice: s.lowestPrice ?? lowest?.current_price ?? lowest?.currentPrice ?? null,
    recentDrops: s.recentDrops ?? s.recent_drops_count ?? 0,
    recent_drops_count: s.recent_drops_count ?? s.recentDrops ?? 0,
    recentDropsList: s.recentDropsList ?? s.recent_drops ?? [],
    lowestPriceProduct: lowest,
  };
}

export const getProducts = async (params = {}) => {
  const { data } = await api.get('/products', { params });
  const list = data?.data ?? data ?? [];
  const arr = Array.isArray(list) ? list : list?.products ?? [];
  return arr.map(normalizeProduct);
};

export const getProduct = async (id) => {
  const { data } = await api.get(`/products/${id}`);
  return normalizeProduct(data?.data ?? data);
};

export const createProduct = async (payload) => {
  // Backend expects snake_case: desired_price
  const body = {
    name: payload.name,
    url: payload.url,
    desired_price: payload.desired_price ?? payload.desiredPrice,
    email: payload.email,
  };
  if (payload.current_price != null || payload.currentPrice != null) {
    body.current_price = payload.current_price ?? payload.currentPrice;
  }
  if (payload.original_price != null || payload.originalPrice != null || payload.mrp != null) {
    body.original_price = payload.original_price ?? payload.originalPrice ?? payload.mrp;
  }
  if (payload.image_url || payload.image) {
    body.image_url = payload.image_url || payload.image;
  }
  const { data } = await api.post('/products', body);
  return normalizeProduct(data?.data ?? data);
};

export const updateProduct = async (id, payload) => {
  const body = { ...payload };
  if (payload.desiredPrice != null && payload.desired_price == null) {
    body.desired_price = payload.desiredPrice;
  }
  if (payload.currentPrice != null && payload.current_price == null) {
    body.current_price = payload.currentPrice;
  }
  if (payload.originalPrice != null && payload.original_price == null) {
    body.original_price = payload.originalPrice;
  }
  if (payload.mrp != null && payload.original_price == null) {
    body.original_price = payload.mrp;
  }
  if (payload.image && !payload.image_url) {
    body.image_url = payload.image;
  }
  const { data } = await api.put(`/products/${id}`, body);
  return normalizeProduct(data?.data ?? data);
};

export const checkAllPrices = async () => {
  const { data } = await api.post('/products/check-all');
  return data;
};

export const seedDemoProducts = async () => {
  const { data } = await api.post('/products/seed-demo');
  return data;
};

export const getEmailStatus = async () => {
  const { data } = await api.get('/email/status');
  return data;
};

export const sendTestEmail = async (toEmail) => {
  const { data } = await api.post('/email/test', null, { params: { to_email: toEmail } });
  return data;
};



export const deleteProduct = async (id) => {
  const { data } = await api.delete(`/products/${id}`);
  return data;
};

export const checkPrice = async (id) => {
  // Canonical backend route is POST /check-price/{id}; nested alias also exists.
  try {
    const { data } = await api.post(`/check-price/${id}`);
    return data?.data ?? data;
  } catch (err) {
    if (err?.response?.status === 404) {
      const { data } = await api.post(`/products/${id}/check`);
      return data?.data ?? data;
    }
    throw err;
  }
};

export const getPriceHistory = async (id, limit = 50) => {
  const normalizeHistory = (h = {}) => ({
    ...h,
    checkedAt: h.checkedAt ?? h.checked_at ?? h.createdAt ?? h.created_at ?? h.date ?? null,
    checked_at: h.checked_at ?? h.checkedAt ?? null,
    createdAt: h.createdAt ?? h.created_at ?? h.checkedAt ?? h.checked_at ?? null,
  });
  const normalizeList = (list) => {
    const arr = Array.isArray(list) ? list : list?.history ?? list?.data ?? [];
    return arr.map(normalizeHistory);
  };
  try {
    const { data } = await api.get(`/price-history/${id}`, { params: { limit } });
    return normalizeList(data?.data ?? data ?? []);
  } catch (err) {
    if (err?.response?.status === 404) {
      const { data } = await api.get(`/products/${id}/history`, { params: { limit } });
      return normalizeList(data?.data ?? data ?? []);
    }
    throw err;
  }
};

export const getStats = async () => {
  const { data } = await api.get('/stats');
  return normalizeStats(data?.data ?? data ?? {});
};

function clientSideCSV(products) {
  const header = ['id', 'name', 'url', 'current_price', 'desired_price', 'email', 'last_checked'];
  const rows = products.map((p) => [
    p.id ?? p._id ?? '',
    `"${String(p.name || '').replace(/"/g, '""')}"`,
    p.url || '',
    p.current_price ?? p.currentPrice ?? '',
    p.desired_price ?? p.desiredPrice ?? '',
    p.email || '',
    p.last_checked ?? p.lastChecked ?? '',
  ]);
  return [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

function downloadText(text, filename, mime = 'text/csv') {
  const blob = new Blob([text], { type: mime });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export const exportCSV = async () => {
  try {
    const response = await api.get('/products/export/csv', { responseType: 'blob' });
    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smartprice-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    // Fallback: build CSV client-side from product list
    if (err?.response?.status === 404) {
      const products = await getProducts();
      downloadText(clientSideCSV(products), `smartprice-export-${new Date().toISOString().slice(0, 10)}.csv`);
      return;
    }
    throw err;
  }
};

export const registerUser = async (payload) => {
  const { data } = await api.post('/auth/register', payload);
  return data;
};

export const loginUser = async (payload) => {
  const { data } = await api.post('/auth/login', payload);
  return data;
};

export const getMe = async () => {
  const { data } = await api.get('/auth/me');
  return data;
};

export default api;
