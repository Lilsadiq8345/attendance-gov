import React from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, Settings, FileText, Users, BarChart3, Shield, Eye } from 'lucide-react';
import AdminRoute from '@/components/AdminRoute';
import { useAuth } from '@/contexts/AuthContext';

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: BarChart3 },
    { path: '/admin/users', label: 'Users', icon: Users },
    { path: '/admin/reports', label: 'Reports', icon: FileText },
    { path: '/admin/settings', label: 'Settings', icon: Settings },
    { path: '/admin/audit', label: 'Audit', icon: Eye },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <AdminRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Dev Admin Banner */}
        {user?.id === 'admin-local' && (
          <div className="bg-yellow-100 border-b border-yellow-200 px-4 py-2 text-center">
            <p className="text-sm text-yellow-800">
              🚧 <strong>Development Mode:</strong> Using local admin bypass. This will not work in production.
            </p>
          </div>
        )}

        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Shield className="h-8 w-8 text-blue-600 mr-3" />
                <div className="text-lg font-semibold text-gray-900">Admin Panel</div>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Navigation */}
          <nav className="mb-8">
            <div className="flex space-x-1 bg-white p-1 rounded-lg shadow-sm border">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${isActive(item.path)
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Page Content */}
          <main>
            <Outlet />
          </main>
        </div>
      </div>
    </AdminRoute>
  );
};

export default AdminLayout;


