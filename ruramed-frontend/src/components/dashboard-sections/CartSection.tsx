'use client';

import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft } from 'lucide-react';
import { useCartStore } from '@/store/cart.store';
import Link from 'next/link';
import toast from 'react-hot-toast';

export function CartSection() {
  const { items, updateQuantity, removeItem, clearCart, getTotalPrice } = useCartStore();

  const handleRemoveItem = (medicineId: number, name: string) => {
    removeItem(medicineId);
    toast.success(`${name} removed from cart`);
  };

  const handleClearCart = () => {
    if (confirm('Are you sure you want to clear the cart?')) {
      clearCart();
      toast.success('Cart cleared');
    }
  };

  if (items.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Shopping Cart</h1>
        </div>

        <div className="text-center py-16 card">
          <ShoppingCart className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 text-lg mb-4">Your cart is empty</p>
          <Link href="/dashboard/medicines" className="btn-primary inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Shopping Cart</h1>
        <button onClick={handleClearCart} className="btn-secondary text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
          Clear Cart
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={item.medicineId} className="card flex items-center gap-4">
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 dark:text-white">{item.name}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  ₹{item.price.toFixed(2)} per unit
                </p>
                {item.requires_prescription && (
                  <span className="text-xs text-yellow-600 dark:text-yellow-400">⚠️ Prescription required</span>
                )}
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQuantity(item.medicineId, item.quantity - 1)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center font-medium">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.medicineId, item.quantity + 1)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Subtotal */}
              <div className="text-right">
                <p className="font-bold text-slate-900 dark:text-white">
                  ₹{(item.price * item.quantity).toFixed(2)}
                </p>
              </div>

              {/* Remove Button */}
              <button
                onClick={() => handleRemoveItem(item.medicineId, item.name)}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="card sticky top-4 space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Order Summary</h2>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Subtotal</span>
                <span className="font-medium">₹{getTotalPrice().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Delivery</span>
                <span className="font-medium text-green-600">FREE</span>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between">
                <span className="font-bold text-slate-900 dark:text-white">Total</span>
                <span className="font-bold text-slate-900 dark:text-white">₹{getTotalPrice().toFixed(2)}</span>
              </div>
            </div>

            <button className="btn-primary w-full">Proceed to Checkout</button>
            
            <Link href="/dashboard/medicines" className="btn-secondary w-full flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
