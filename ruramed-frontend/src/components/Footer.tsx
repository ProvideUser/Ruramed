'use client';

import Link from 'next/link';
import { Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 flex items-center justify-center">
                <img 
                  src="/logo.svg" 
                  alt="RuraMed Logo" 
                  className="w-full h-full object-contain rounded-md shadow-md"
                />
              </div>

              <span className="text-xl font-bold text-slate-900 dark:text-white">
                RuraMed
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Your trusted healthcare partner for medicines, consultations, and wellness solutions. 
              Available 24/7 for your health needs.
            </p>
            
            {/* Social Media Links */}
            <div className="flex items-center gap-3">
              {/* Facebook */}
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#1877F2] hover:bg-[#0C63D4] transition-all shadow-sm hover:shadow-md"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5 text-white" />
              </a>
              
              {/* Twitter/X */}
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 transition-all shadow-sm hover:shadow-md"
                aria-label="Twitter"
              >
                <Twitter className="w-5 h-5 text-white dark:text-black" />
              </a>
              
              {/* Instagram */}
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 flex items-center justify-center rounded-lg hover:opacity-90 transition-all shadow-sm hover:shadow-md"
                style={{
                  background: 'linear-gradient(115deg, #f9ce34, #ee2a7b, #6228d7)'
                }}
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5 text-white" />
              </a>

              {/* LinkedIn */}
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#0A66C2] hover:bg-[#004182] transition-all shadow-sm hover:shadow-md"
                aria-label="LinkedIn"
              >
                <Linkedin className="w-5 h-5 text-white" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/"
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link 
                  href="/medicines"
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  Buy Medicines
                </Link>
              </li>
              <li>
                <Link 
                  href="/doctors"
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  Consult Doctors
                </Link>
              </li>
              <li>
                <Link 
                  href="/dashboard"
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link 
                  href="/about"
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  About Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Support</h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/contact"
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link 
                  href="/faq"
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  FAQs
                </Link>
              </li>
              <li>
                <Link 
                  href="/privacy"
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link 
                  href="/terms"
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link 
                  href="/refund"
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  Refund Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Contact Us</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary-600 dark:text-primary-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  123 Healthcare Avenue,<br />
                  Medical District,<br />
                  New Delhi, India - 110001
                </span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                <a 
                  href="tel:+911234567890"
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  +91 123 456 7890
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                <a 
                  href="mailto:support@ruramed.com"
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                >
                  support@ruramed.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center md:text-left">
              © {currentYear} RuraMed. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link
                href="/privacy"
                className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                Terms
              </Link>
              <Link
                href="/sitemap"
                className="text-sm text-slate-600 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
              >
                Sitemap
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
