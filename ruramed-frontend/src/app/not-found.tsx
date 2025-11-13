'use client';

import Link from 'next/link';
import { Home, ArrowLeft, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-slate-900 dark:to-slate-800 px-4">
      <div className="max-w-2xl w-full text-center">
        
        {/* 404 with Anatomical Heart Image */}
        <div className="mb-8 relative">
          <div className="flex items-center justify-center gap-4 md:gap-8">
            {/* First 4 */}
            <span className="text-[120px] md:text-[180px] font-bold text-slate-300 dark:text-slate-700 leading-none">
              4
            </span>
            
            {/* Anatomical Heart Image */}
            <div className="relative w-[110px] h-[110px] md:w-[160px] md:h-[160px]">
            <img
                src="https://user-gen-media-assets.s3.amazonaws.com/seedream_images/1de14263-816c-4157-b829-25690caef5e5.png"
                alt="Anatomical Heart"
                className="w-full h-full object-contain drop-shadow-lg"
                style={{ 
                animation: 'heartbeat 1.3s ease-in-out infinite',
                filter: 'drop-shadow(0 4px 12px rgba(220, 38, 38, 0.25))',
                mixBlendMode: 'multiply' // Removes white background
                }}
            />
            
            {/* Pulse rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div 
                className="w-full h-full rounded-full border-2 border-red-400 opacity-20"
                style={{ animation: 'pulse-ring 1.3s ease-in-out infinite' }}
                ></div>
            </div>
            </div>

            
            {/* Last 4 */}
            <span className="text-[120px] md:text-[180px] font-bold text-slate-300 dark:text-slate-700 leading-none">
              4
            </span>
          </div>
        </div>

        {/* Message */}
        <div className="mb-12 space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
            Page Not Found
          </h2>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Oops! The page you're looking for doesn't exist or hasn't been implemented yet.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          
          {/* Go Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-md hover:shadow-lg border border-slate-200 dark:border-slate-700"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>

          {/* Home Button */}
          <Link
            href="/"
            className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all shadow-md hover:shadow-lg"
          >
            <Home className="w-5 h-5" />
            Go Home
          </Link>

          {/* Search Button */}
          <Link
            href="/medicines"
            className="flex items-center gap-2 px-6 py-3 bg-secondary-600 text-white rounded-lg hover:bg-secondary-700 transition-all shadow-md hover:shadow-lg"
          >
            <Search className="w-5 h-5" />
            Browse Medicines
          </Link>
        </div>

        {/* Helpful Links */}
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            Looking for something specific?
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <Link
              href="/"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 hover:underline"
            >
              Home
            </Link>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <Link
              href="/medicines"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 hover:underline"
            >
              Medicines
            </Link>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <Link
              href="/doctors"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 hover:underline"
            >
              Doctors
            </Link>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <Link
              href="/dashboard"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 hover:underline"
            >
              Dashboard
            </Link>
            <span className="text-slate-300 dark:text-slate-600">•</span>
            <Link
              href="/contact"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 hover:underline"
            >
              Contact
            </Link>
          </div>
        </div>
      </div>

      {/* Custom animations */}
      <style jsx>{`
        @keyframes heartbeat {
          0%, 100% {
            transform: scale(1);
          }
          7% {
            transform: scale(1.05);
          }
          14% {
            transform: scale(1.02);
          }
          21% {
            transform: scale(1.06);
          }
          28% {
            transform: scale(1);
          }
        }
        
        @keyframes pulse-ring {
          0% {
            transform: scale(1);
            opacity: 0.2;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.05;
          }
          100% {
            transform: scale(1);
            opacity: 0.2;
          }
        }
      `}</style>
    </div>
  );
}
