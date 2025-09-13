import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScanLine, Users, BarChart3, Settings, LogOut, Shield, Bell, History } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AttendanceScanner from '@/components/AttendanceScanner';
import AttendanceHistory from '@/components/AttendanceHistory';
import AdminDashboard from '@/components/AdminDashboard';
import UserProfile from '@/components/UserProfile';
import BiometricStatusCard from '@/components/BiometricStatusCard';
import Header from '@/components/Header';
import { useToast } from '@/hooks/use-toast';
import { apiCall } from '../config/api';

interface Profile {
  role: 'user' | 'admin';
}

const Dashboard = () => {
  const [attendanceMarked, setAttendanceMarked] = useState(false);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { user, logout, token } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (token) {
      fetchUserProfile();
    }
  }, [token]);

  const fetchUserProfile = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiCall('/api/user/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserProfile(res.data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScanComplete = (success: boolean) => {
    setAttendanceMarked(success);
    if (success) {
      toast({
        title: "Success!",
        description: "Attendance marked successfully"
      });
    }
  };

  const handleSignOut = async () => {
    await logout();
    toast({
      title: "Signed Out",
      description: "You have been signed out successfully"
    });
  };

  const handleBiometricStatusUpdate = () => {
    fetchUserProfile();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isAdmin = userProfile?.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onSignOut={handleSignOut} />
      <div className="max-w-5xl mx-auto py-8 px-4">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="biometric">Biometric</TabsTrigger>
            {isAdmin && <TabsTrigger value="admin">Admin</TabsTrigger>}
          </TabsList>
          <TabsContent value="profile">
            <UserProfile />
          </TabsContent>
          <TabsContent value="attendance">
            <AttendanceScanner onScanComplete={handleScanComplete} />
            <AttendanceHistory />
          </TabsContent>
          <TabsContent value="biometric">
            <BiometricStatusCard onStatusUpdate={handleBiometricStatusUpdate} />
          </TabsContent>
          {isAdmin && (
            <TabsContent value="admin">
              <AdminDashboard />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;
