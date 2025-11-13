'use client';

import { useState, useEffect } from 'react';
import { ShoppingCart, Search, Filter, Eye, Download, Truck, Loader2 } from 'lucide-react';
import { Order } from '@/types';
import { userService } from '@/services/user.service';
import toast from 'react-hot-toast';

const ORDER_STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', icon: '⏳' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', icon: '✓' },
  processing: { label: 'Processing', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300', icon: '⚙️' },
  shipped: { label: 'Shipped', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300', icon: '📦' },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: '✓' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: '✕' },
};

export function OrdersSection() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  // ✅ Fetch orders from API
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await userService.getUserOrders(currentPage, 10);
        
        setOrders(response.data);
        setTotalPages(response.pagination.totalPages);
        setTotalOrders(response.pagination.totalItems);
      } catch (error: any) {
        console.error('Failed to fetch orders:', error);
        toast.error(error.message || 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [currentPage]);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.shippingAddress.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        <span className="ml-2 text-slate-600 dark:text-slate-400">Loading orders...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          My Orders
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Track and manage your orders ({totalOrders} total)
        </p>
      </div>

      {/* Search and Filter */}
      <div className="card space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by order number or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-field"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length > 0 ? (
          <>
            {filteredOrders.map((order) => (
              <div key={order.id} className="card">
                {/* Order Header */}
                <button
                  onClick={() =>
                    setExpandedOrder(expandedOrder === order.id ? null : order.id)
                  }
                  className="w-full flex items-center justify-between hover:opacity-80 transition-opacity"
                >
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {order.orderNumber}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          {new Date(order.createdAt).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          ORDER_STATUS_CONFIG[order.status as keyof typeof ORDER_STATUS_CONFIG]?.color
                        }`}
                      >
                        {
                          ORDER_STATUS_CONFIG[order.status as keyof typeof ORDER_STATUS_CONFIG]
                            ?.label
                        }
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-slate-900 dark:text-white text-lg">
                      ₹{order.totalAmount.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </button>

                {/* Order Details (Expandable) */}
                {expandedOrder === order.id && (
                  <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 space-y-4">
                    {/* Items */}
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-3">
                        Order Items
                      </h4>
                      <div className="space-y-2">
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
                          >
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white">
                                {item.medicineName}
                              </p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                Qty: {item.quantity}
                              </p>
                            </div>
                            <p className="font-semibold text-slate-900 dark:text-white">
                              ₹{item.subtotal.toFixed(2)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Shipping Address */}
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-2">
                        Shipping Address
                      </h4>
                      <p className="text-slate-700 dark:text-slate-300">
                        {order.shippingAddress}
                      </p>
                    </div>

                    {/* Payment Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Payment Method
                        </p>
                        <p className="font-medium text-slate-900 dark:text-white capitalize">
                          {order.paymentMethod === 'cod'
                            ? 'Cash on Delivery'
                            : order.paymentMethod === 'online'
                            ? 'Online Payment'
                            : 'Card'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Payment Status
                        </p>
                        <p
                          className={`font-medium capitalize ${
                            order.paymentStatus === 'paid'
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-yellow-600 dark:text-yellow-400'
                          }`}
                        >
                          {order.paymentStatus}
                        </p>
                      </div>
                    </div>

                    {/* Tracking Info */}
                    {order.trackingNumber && (
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Truck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <h4 className="font-semibold text-blue-900 dark:text-blue-200">
                            Tracking Information
                          </h4>
                        </div>
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                          Tracking #: <span className="font-mono">{order.trackingNumber}</span>
                        </p>
                        {order.estimatedDelivery && (
                          <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">
                            Estimated Delivery:{' '}
                            {new Date(order.estimatedDelivery).toLocaleDateString('en-IN')}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-4">
                      <button className="btn-secondary flex items-center gap-2 flex-1">
                        <Eye className="w-4 h-4" />
                        View Invoice
                      </button>
                      <button className="btn-secondary flex items-center gap-2 flex-1">
                        <Download className="w-4 h-4" />
                        Download PDF
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-4 py-2 text-slate-700 dark:text-slate-300">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 card">
            <ShoppingCart className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">
              {searchTerm || filterStatus !== 'all'
                ? 'No orders found matching your criteria'
                : 'No orders yet. Start shopping now!'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
