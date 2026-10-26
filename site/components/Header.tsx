import React from 'react';
import Link from 'next/link';

export default function Header(): React.ReactElement {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-2xl font-black text-emerald-600">
            تایلندگرد
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="text-gray-700 hover:text-emerald-600 font-medium transition-colors">
              صفحه اصلی
            </Link>
            <Link href="/tours" className="text-gray-700 hover:text-emerald-600 font-medium transition-colors">
              تورها
            </Link>
            <Link href="/hotels" className="text-gray-700 hover:text-emerald-600 font-medium transition-colors">
              هتل‌ها
            </Link>
            <Link href="/blog" className="text-gray-700 hover:text-emerald-600 font-medium transition-colors">
              راهنمای سفر
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/contact"
            className="hidden sm:inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-emerald-600 text-emerald-600 hover:bg-emerald-50 font-medium transition-colors"
          >
            تماس با ما
          </Link>
          <Link
            href="/tours"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-medium shadow-sm shadow-emerald-600/20 transition-colors"
          >
            رزرو تور
          </Link>
        </div>
      </div>
    </header>
  );
}
