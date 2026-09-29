import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getProducts } from '../services/api.js';

export default function useProducts(initialParams = {}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProducts = useCallback(async (params = initialParams) => {
    try {
      setLoading(true);
      setError(null);
      const list = await getProducts(params);
      setProducts(Array.isArray(list) ? list : list?.products ?? []);
    } catch (err) {
      setError(err.message);
      toast.error(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, setProducts, loading, error, refetch: fetchProducts };
}
