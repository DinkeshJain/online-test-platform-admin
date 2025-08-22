import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from './ui/button';
import { Home, FileText, Users, BookOpen, BarChart3, Plus, LogOut, ClipboardCheck, Menu, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const AdminNavbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/reports', icon: BarChart3, label: 'Reports' },
    { path: '/courses', icon: BookOpen, label: 'Courses' },
    { path: '/evaluators', icon: ClipboardCheck, label: 'Evaluators' },
    { path: '/students', icon: Users, label: 'Students' },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="w-full px-3 sm:px-4 lg:px-6">
        <div className="flex items-center h-16 gap-4">
          {/* Logo/Brand - Fixed width */}
          <div className="flex items-center flex-shrink-0 min-w-fit">
            <img src="/logo-anu.png" alt="AU" className="mr-3" style={{ height: '40px', width: '40px', objectFit: 'contain' }} />
            <div className="hidden lg:block">
              <h1 className="text-lg font-bold text-gray-900 leading-tight whitespace-nowrap">
                <span className="text-gray-900">Acharya Nagarjuna University</span>
                <br />
                <span className="text-sm text-blue-600 font-semibold">Admin Portal</span>
              </h1>
            </div>
            <div className="hidden md:block lg:hidden">
              <span className="flex items-center"><img src="/logo-anu.png" alt="AU" style={{ height: '24px', width: '24px', objectFit: 'contain', marginRight: '6px' }} /> Admin</span>
            </div>
            <div className="block md:hidden">
              <img src="/logo-anu.png" alt="AU" style={{ height: '32px', width: '32px', objectFit: 'contain' }} />
            </div>
          </div>

          {/* Desktop Navigation Links - Flexible center */}
          <div className="hidden md:flex flex-1 justify-center min-w-0">
            <div className="flex items-center space-x-1 lg:space-x-2 overflow-hidden">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`px-2 lg:px-3 py-2 rounded-lg text-xs lg:text-sm font-medium flex items-center gap-1 lg:gap-1.5 transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                      isActive(item.path)
                        ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="hidden lg:inline">{item.label}</span>
                    <span className="lg:hidden text-xs">{item.label.slice(0, 1)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Desktop User Menu - Fixed width */}
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            <div className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1.5 rounded-lg whitespace-nowrap max-w-32 truncate">
              <span className="text-blue-600">{user?.name || 'Admin'}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-1 text-xs px-2 py-1.5 border-gray-300 hover:border-red-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200 whitespace-nowrap flex-shrink-0"
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              <span className="hidden lg:inline">Logout</span>
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-3">
            <div className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
              {user?.name || 'Admin'}
            </div>
            <button
              onClick={toggleMobileMenu}
              className="inline-flex items-center justify-center p-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-3 pt-4 pb-4 space-y-2 border-t border-gray-200 bg-gradient-to-b from-gray-50 to-white">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      closeMobileMenu();
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg text-base font-medium flex items-center gap-3 transition-all duration-200 ${
                      isActive(item.path)
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </button>
                );
              })}
              
              {/* Mobile Logout Button */}
              <div className="pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => {
                    handleLogout();
                    closeMobileMenu();
                  }}
                  className="w-full flex items-center gap-3 text-base font-medium justify-start px-4 py-3 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 transition-all duration-200"
                >
                  <LogOut className="h-5 w-5" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default AdminNavbar;
