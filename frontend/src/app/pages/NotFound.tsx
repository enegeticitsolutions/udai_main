import React from "react";
import { Link } from "react-router";

export function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#fbf5ee] text-[#d96d4b] font-bold text-3xl mb-6 shadow-sm border border-[#e8d5c4]">
        404
      </div>
      <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#2d2926] mb-3">
        Page Not Found
      </h1>
      <p className="text-base sm:text-lg text-[#66605b] max-w-md mb-8">
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      <div className="flex flex-wrap gap-4 justify-center">
        <Link
          to="/"
          className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-white bg-[#d96d4b] hover:bg-[#c45a39] rounded-full transition-all duration-200 shadow-md hover:shadow-lg"
        >
          Return Home
        </Link>
        <Link
          to="/contact"
          className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-[#2d2926] bg-[#f5efe6] hover:bg-[#ede3d5] rounded-full transition-all duration-200"
        >
          Contact Us
        </Link>
      </div>
    </div>
  );
}

export function RouteErrorBoundary() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-50 text-red-600 font-bold text-2xl mb-6 border border-red-200">
        ⚠️
      </div>
      <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#2d2926] mb-3">
        Something Went Wrong
      </h1>
      <p className="text-base sm:text-lg text-[#66605b] max-w-md mb-8">
        An unexpected error occurred while loading this page. Please try refreshing or return to the home page.
      </p>
      <Link
        to="/"
        className="inline-flex items-center justify-center px-6 py-3 text-sm font-semibold text-white bg-[#d96d4b] hover:bg-[#c45a39] rounded-full transition-all duration-200 shadow-md hover:shadow-lg"
      >
        Go to Home
      </Link>
    </div>
  );
}
