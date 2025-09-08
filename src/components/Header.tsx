
import React from 'react';
import { Building2, Settings, Bell, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  onSignOut?: () => Promise<void> | void;
}

const Header: React.FC<HeaderProps> = ({ onSignOut }) => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const { logout } = useAuth();

  return (
    <header className="bg-gradient-to-r from-blue-900 to-green-800 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Building2 className="h-8 w-8" />
              <div>
                <h1 className="text-xl font-bold">Government Biometric System</h1>
                <p className="text-blue-100 text-sm">Ministry of Digital Services</p>
              </div>
            </div>
          </div>

          <div className="hidden md:block text-center">
            <p className="text-lg font-semibold">{currentDate}</p>
            <p className="text-blue-100 text-sm">
              {new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
              <Settings className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20"
              onClick={() => (onSignOut ? onSignOut() : logout())}
              aria-label="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
