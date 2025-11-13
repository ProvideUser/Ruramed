'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Pill, Stethoscope, Package, Shield, Clock, Heart } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { Carousel } from '@/components/Carousel';

// ✅ Simple carousel with just images
const carouselSlides = [
  {
    id: 1,
    image: '/Image1.jpg',
  },
  {
    id: 2,
    image: '/Image2.jpg',
  },
  {
    id: 3,
    image: '/Image3.jpg',
  },
];

export default function HomePage() {
  const { isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-slate-900 dark:to-slate-800 py-20">
        <div className="section-container">
          <div className="text-center max-w-3xl mx-auto space-y-6 animate-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 dark:text-white">
              Welcome to <span className="text-primary-600 dark:text-primary-400">RuraMed</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300">
              Your Trusted Healthcare Partner — Order medicines, consult top doctors, 
              and manage your health records. All in one place, available 24/7.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              {isAuthenticated ? (
                <Link href="/dashboard" className="btn-primary text-lg px-8 py-3">
                  Go to Dashboard
                </Link>
              ) : (
                <Link href="/login" className="btn-primary text-lg px-8 py-3">
                  Get Started
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Carousel Section */}
      <section className="py-12 bg-white dark:bg-slate-900">
        <div className="flex justify-center px-4">
          <div className="w-full max-w-[300px] sm:max-w-[400px] md:max-w-[500px]">
            <Carousel slides={carouselSlides} autoPlay autoPlayInterval={5000} />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section-container">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Why Choose RuraMed?
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Healthcare made simple, accessible, and reliable
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="card group hover:shadow-strong animate-slide-up">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Pill className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Order Medicines Online
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Browse thousands of medicines from verified pharmacies. 
              Genuine products with guaranteed quality and fast delivery.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="card group hover:shadow-strong animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="w-12 h-12 bg-secondary-100 dark:bg-secondary-900/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Stethoscope className="w-6 h-6 text-secondary-600 dark:text-secondary-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Consult Top Doctors
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Connect with experienced doctors online via video, audio, or chat. 
              Get expert medical advice from the comfort of your home.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="card group hover:shadow-strong animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="w-12 h-12 bg-success-100 dark:bg-success-900/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Package className="w-6 h-6 text-success-600 dark:text-success-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Track Orders Easily
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Real-time order tracking with detailed status updates. 
              Know exactly when your medicines will arrive at your doorstep.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="card group hover:shadow-strong animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Shield className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              100% Genuine Products
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              All medicines sourced from licensed pharmacies. 
              Quality assured with proper certifications and authenticity.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="card group hover:shadow-strong animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <div className="w-12 h-12 bg-secondary-100 dark:bg-secondary-900/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Clock className="w-6 h-6 text-secondary-600 dark:text-secondary-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              24/7 Availability
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Order anytime, anywhere. Our platform is available round the clock 
              for your healthcare emergencies and routine needs.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="card group hover:shadow-strong animate-slide-up" style={{ animationDelay: '0.5s' }}>
            <div className="w-12 h-12 bg-success-100 dark:bg-success-900/20 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Heart className="w-6 h-6 text-success-600 dark:text-success-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Health Records Management
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              Store prescriptions, consultation history, and medical records securely. 
              Access your health data anytime you need it.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-primary-600 to-secondary-600 dark:from-primary-800 dark:to-secondary-800 py-16">
        <div className="section-container text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Ready to Take Control of Your Health?
          </h2>
          <p className="text-lg text-white/90 max-w-2xl mx-auto">
            Join thousands of users who trust RuraMed for their healthcare needs. 
            Start your journey to better health today.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            {isAuthenticated ? (
              <Link 
                href="/dashboard" 
                className="bg-white text-primary-600 hover:bg-slate-100 font-medium px-8 py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Go to Dashboard
              </Link>
            ) : (
              <Link 
                href="/register" 
                className="bg-white text-primary-600 hover:bg-slate-100 font-medium px-8 py-3 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Sign Up Now
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
