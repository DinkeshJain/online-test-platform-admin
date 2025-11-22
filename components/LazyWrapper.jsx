import React, { Suspense } from 'react';
import ErrorBoundary from './ErrorBoundary';

// Loading component for lazy-loaded routes
const PageLoader = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

// Enhanced loader with progress indicator for test management components
const TestManagementLoader = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="relative">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 bg-blue-600 rounded-full opacity-20 animate-pulse"></div>
        </div>
      </div>
      <p className="text-gray-700 font-medium mb-1">Loading Test Management</p>
      <p className="text-gray-500 text-sm">Please wait while we prepare your dashboard...</p>
    </div>
  </div>
);

// Higher-order component for lazy loading with error boundary
const LazyWrapper = ({ 
  children, 
  fallback = <PageLoader />,
  enhancedLoader = false 
}) => (
  <ErrorBoundary>
    <Suspense fallback={enhancedLoader ? <TestManagementLoader /> : fallback}>
      {children}
    </Suspense>
  </ErrorBoundary>
);

export default LazyWrapper;
export { PageLoader, TestManagementLoader };