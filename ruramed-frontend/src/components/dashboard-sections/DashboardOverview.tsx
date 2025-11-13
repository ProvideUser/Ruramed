import { orderService } from '@/services/order.service';
import { Order } from '@/types';
import { useState, useEffect, useRef } from 'react';
import { useDashboardStore } from '@/store/dashboard.store';
import { useAuthStore } from '@/store/auth.store';
import { Loader2, TrendingUp, Clock, CheckCircle2, DollarSign } from 'lucide-react';

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalSpent: number;
}

export function DashboardOverview() {
  const { setLoading, setError } = useDashboardStore();
  const { user } = useAuthStore();

  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalSpent: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLocalLoading] = useState(true);

  // Prevent duplicate fetches and endless loops
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (hasFetchedRef.current) {
      return;
    }

    const fetchDashboardData = async () => {
      if (!user?.id) return;

      try {
        hasFetchedRef.current = true; // Prevent concurrent fetches
        setLoading(true);
        setLocalLoading(true);

        console.log('🔄 Fetching dashboard data...');

        const ordersResponse = await orderService.getOrders();

        console.log('✅ Orders response:', ordersResponse);

        if (ordersResponse?.data) {
          const orders = ordersResponse.data;

          const totalOrders = orders.length;
          const pendingOrders = orders.filter(
            (o) => o.status === 'pending' || o.status === 'confirmed' || o.status === 'processing'
          ).length;
          const completedOrders = orders.filter((o) => o.status === 'delivered').length;
          const totalSpent = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

          setStats({
            totalOrders,
            pendingOrders,
            completedOrders,
            totalSpent,
          });

          setRecentOrders(orders.slice(0, 5));
        }
        setError(null);
      } catch (err: any) {
        console.error('❌ Error fetching dashboard data:', err);
        console.error('Error response:', err.response?.data);

        // Avoid retry storm:
        // Only reset fetch flag for errors other than rate limit or network issues
        if (err.response?.status !== 429 && err.message !== 'Network Error') {
          hasFetchedRef.current = false;
        }

        if (err.response?.status === 429) {
          setError('Too many requests. Please wait and try again later.');
        } else if (err.message === 'Network Error') {
          setError('Network error occurred. Please check your connection.');
        } else {
          setError(err.message || 'Failed to load dashboard data');
        }

        setStats({
          totalOrders: 0,
          pendingOrders: 0,
          completedOrders: 0,
          totalSpent: 0,
        });
      } finally {
        setLoading(false);
        setLocalLoading(false);
      }
    };

    fetchDashboardData();

    return () => {
      // Optional: Reset fetch flag on unmount if desired
      // hasFetchedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        <p className="ml-3 text-slate-600 dark:text-slate-400">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Dashboard Overview</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Here's your health summary</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Orders */}
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 border border-blue-200 dark:border-blue-700">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total Orders</p>
              <p className="mt-2 text-3xl font-bold text-blue-900 dark:text-blue-100">{stats.totalOrders}</p>
            </div>
            <div className="p-3 bg-blue-200 dark:bg-blue-700 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-300" />
            </div>
          </div>
        </div>

        {/* Pending Orders */}
        <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/30 border border-yellow-200 dark:border-yellow-700">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">Pending Orders</p>
              <p className="mt-2 text-3xl font-bold text-yellow-900 dark:text-yellow-100">{stats.pendingOrders}</p>
            </div>
            <div className="p-3 bg-yellow-200 dark:bg-yellow-700 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-300" />
            </div>
          </div>
        </div>

        {/* Completed Orders */}
        <div className="card bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 border border-green-200 dark:border-green-700">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">Completed Orders</p>
              <p className="mt-2 text-3xl font-bold text-green-900 dark:text-green-100">{stats.completedOrders}</p>
            </div>
            <div className="p-3 bg-green-200 dark:bg-green-700 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-300" />
            </div>
          </div>
        </div>

        {/* Total Spent */}
        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 border border-purple-200 dark:border-purple-700">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Total Spent</p>
              <p className="mt-2 text-3xl font-bold text-purple-900 dark:text-purple-100">Rs{stats.totalSpent.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-purple-200 dark:bg-purple-700 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-300" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Recent Orders</h2>
          <a href="#" onClick={() => {}} className="text-primary-600 dark:text-primary-400 text-sm font-medium hover:underline">
            View All
          </a>
        </div>
        {recentOrders.length > 0 ? (
          <div className="space-y-4">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-slate-900 dark:text-white">
                    Order #{order.orderNumber || `ORD-${String(order.id).padStart(8, '0')}`}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900 dark:text-white">Rs{order.totalAmount.toFixed(2)}</p>
                  <span
                    className={`inline-block text-xs font-medium px-2 py-1 rounded mt-1 ${
                      order.status === 'delivered'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : order.status === 'cancelled'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                    }`}
                  >
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-600 dark:text-slate-400">No orders yet. Start shopping now!</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button className="card text-center hover:shadow-lg transition-shadow hover:scale-105 transform duration-200">
          <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          </div>
          <p className="font-medium text-slate-900 dark:text-white text-sm">Buy Medicines</p>
        </button>
        <button className="card text-center hover:shadow-lg transition-shadow hover:scale-105 transform duration-200">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="font-medium text-slate-900 dark:text-white text-sm">Book Doctor</p>
        </button>
        <button className="card text-center hover:shadow-lg transition-shadow hover:scale-105 transform duration-200">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <p className="font-medium text-slate-900 dark:text-white text-sm">My Orders</p>
        </button>
        <button className="card text-center hover:shadow-lg transition-shadow hover:scale-105 transform duration-200">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mx-auto mb-3">
            <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="font-medium text-slate-900 dark:text-white text-sm">Prescriptions</p>
        </button>
      </div>
    </div>
  );
}
