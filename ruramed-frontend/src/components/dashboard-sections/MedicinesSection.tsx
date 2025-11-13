'use client';

import { useState, useEffect } from 'react';
import { Pill, Search, Filter, ShoppingCart, Heart, Loader2, Tag } from 'lucide-react';
import { Medicine } from '@/types';
import { medicineService } from '@/services/medicine.service';
import { useCartStore } from '@/store/cart.store';
import Link from 'next/link';
import toast from 'react-hot-toast';

export function MedicinesSection() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0,
  });

  // ✅ Use cart store
  const { addItem, getTotalItems, getTotalPrice } = useCartStore();

  // Load medicines and categories on mount
  useEffect(() => {
    loadCategories();
    loadMedicines();
  }, []);

  // Reload medicines when filters change
  useEffect(() => {
    if (searchTerm) {
      handleSearch();
    } else {
      loadMedicines();
    }
  }, [filterCategory, pagination.page]);

  const loadCategories = async () => {
    try {
      const cats = await medicineService.getCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadMedicines = async () => {
    try {
      setLoading(true);
      const category = filterCategory === 'all' ? undefined : filterCategory;
      const response = await medicineService.getAllMedicines(pagination.page, pagination.limit, category);
      
      setMedicines(response.medicines);
      setPagination(response.pagination);
    } catch (error: any) {
      console.error('Failed to load medicines:', error);
      toast.error(error.response?.data?.error || 'Failed to load medicines');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim() || searchTerm.length < 2) {
      loadMedicines();
      return;
    }

    try {
      setLoading(true);
      const response = await medicineService.searchMedicines({
        q: searchTerm,
        category: filterCategory === 'all' ? undefined : filterCategory,
        page: pagination.page,
        limit: pagination.limit,
      });

      setMedicines(response.medicines);
      setPagination(response.pagination);
    } catch (error: any) {
      console.error('Search failed:', error);
      toast.error(error.response?.data?.error || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (value.length === 0) {
      loadMedicines();
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  // ✅ Updated to use cart store
  const handleAddToCart = (medicine: Medicine) => {
    addItem({
      medicineId: medicine.id,
      name: medicineService.getDisplayName(medicine),
      price: Number(medicine.price),
      image_url: medicine.image_url || undefined,
      requires_prescription: !!medicine.requires_prescription,
    });
    toast.success('Added to cart!');
  };

  const handleToggleWishlist = (medicineId: number) => {
    if (wishlist.includes(medicineId)) {
      setWishlist(wishlist.filter((id) => id !== medicineId));
      toast.success('Removed from wishlist');
    } else {
      setWishlist([...wishlist, medicineId]);
      toast.success('Added to wishlist');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Buy Medicines
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Browse and purchase quality medicines
          </p>
        </div>
        
        {/* ✅ Clickable Cart Button */}
        <Link
          href="/dashboard/cart"
          className="relative px-4 py-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
        >
          <ShoppingCart className="w-6 h-6 text-primary-600 dark:text-primary-400" />
          {getTotalItems() > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {getTotalItems()}
            </span>
          )}
        </Link>
      </div>

      {/* Search and Filter */}
      <form onSubmit={handleSearchSubmit} className="card space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search medicines (min 2 characters)..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setPagination({ ...pagination, page: 1 });
              }}
              className="input-field"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>
      </form>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          <span className="ml-3 text-slate-600 dark:text-slate-400">Loading medicines...</span>
        </div>
      )}

      {/* Medicines Grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {medicines.length > 0 ? (
            medicines.map((medicine) => {
              const discount = medicineService.getDiscountPercentage(medicine);
              
              return (
                <div
                  key={medicine.id}
                  className="card hover:shadow-xl transition-all duration-200 group flex flex-col h-full relative"
                >
                  {/* Discount Badge */}
                  {discount > 0 && (
                    <div className="absolute top-3 left-3 z-10">
                      <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full flex items-center gap-1 font-bold">
                        <Tag className="w-3 h-3" />
                        {discount}% OFF
                      </span>
                    </div>
                  )}

                  {/* Prescription Badge */}
                  {!!medicine.requires_prescription && (
                    <div className="absolute top-3 right-12 z-10">
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 text-xs rounded-full font-semibold">
                        ℞ Rx
                      </span>
                    </div>
                  )}

                  {/* Wishlist Button */}
                  <button
                    onClick={() => handleToggleWishlist(medicine.id)}
                    className={`absolute top-3 right-3 z-10 p-2 rounded-lg transition-colors ${
                      wishlist.includes(medicine.id)
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                        : 'bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500'
                    } shadow-md`}
                  >
                    <Heart className={`w-4 h-4 ${wishlist.includes(medicine.id) ? 'fill-current' : ''}`} />
                  </button>

                  {/* Card Content */}
                  <div className="flex-1 space-y-3 pt-8">
                    {/* Category */}
                    <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wide">
                      {medicine.category}
                    </p>

                    {/* Name */}
                    <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-2">
                      {medicineService.getDisplayName(medicine)}
                    </h3>

                    {/* Description */}
                    {medicine.short_description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                        {medicine.short_description}
                      </p>
                    )}

                    {/* Details */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Manufacturer:</span>
                        <span className="font-medium text-slate-900 dark:text-white">{medicine.manufacturer}</span>
                      </div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>Form:</span>
                        <span className="font-medium">{medicineService.getFormLabel(medicine.form)}</span>
                      </div>
                      {medicine.generic_name && (
                        <div className="flex justify-between text-slate-600 dark:text-slate-400">
                          <span>Generic:</span>
                          <span className="font-medium text-slate-900 dark:text-white line-clamp-1">{medicine.generic_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Price and Action */}
                  <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">
                          {medicineService.formatPrice(medicine.price)}
                        </p>
                        {discount > 0 && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-through">
                            MRP {medicineService.formatPrice(medicine.mrp)}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleAddToCart(medicine)}
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Add to Cart
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-center py-16 card">
              <Pill className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400 text-lg mb-2">
                No medicines found
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500">
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
            disabled={pagination.page === 1}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Previous
          </button>
          
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Page {pagination.page} of {pagination.pages}
          </span>

          <button
            onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
            disabled={pagination.page === pagination.pages}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* ✅ Updated Cart Summary with Link */}
      {getTotalItems() > 0 && (
        <div className="card bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/30 border border-primary-200 dark:border-primary-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-primary-700 dark:text-primary-300">
                {getTotalItems()} item{getTotalItems() !== 1 ? 's' : ''} in cart
              </p>
              <p className="text-2xl font-bold text-primary-900 dark:text-primary-100">
                ₹{getTotalPrice().toFixed(2)}
              </p>
            </div>
            <Link href="/dashboard/cart" className="btn-primary">
              View Cart
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
