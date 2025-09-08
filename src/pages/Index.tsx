
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScanLine, Users, BarChart3, Shield } from 'lucide-react';
import Header from '@/components/Header';
import BiometricScanner from '@/components/BiometricScanner';
import AttendanceDashboard from '@/components/AttendanceDashboard';

const Index = () => {
  const [faceScanResult, setFaceScanResult] = useState<boolean | null>(null);
  const [earScanResult, setEarScanResult] = useState<boolean | null>(null);
  const [attendanceMarked, setAttendanceMarked] = useState(false);

  const handleScanComplete = (type: 'face' | 'ear', success: boolean) => {
    if (type === 'face') {
      setFaceScanResult(success);
    } else {
      setEarScanResult(success);
    }

    // If both scans are successful, mark attendance
    if ((type === 'face' && success && earScanResult) || 
        (type === 'ear' && success && faceScanResult)) {
      setAttendanceMarked(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Biometric Attendance System
          </h2>
          <p className="text-gray-600">
            Secure and reliable attendance tracking using face and ear biometric verification
          </p>
        </div>

        <Tabs defaultValue="scan" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="scan" className="flex items-center gap-2">
              <ScanLine className="h-4 w-4" />
              Biometric Scan
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scan" className="space-y-6">
            {attendanceMarked ? (
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardContent className="p-8 text-center">
                  <div className="text-green-600 mb-4">
                    <Shield className="h-16 w-16 mx-auto" />
                  </div>
                  <h3 className="text-2xl font-bold text-green-900 mb-2">
                    Attendance Marked Successfully!
                  </h3>
                  <p className="text-green-700">
                    Both biometric verifications completed. Welcome to work!
                  </p>
                  <Badge className="mt-4 bg-green-600">
                    Verified at {new Date().toLocaleTimeString()}
                  </Badge>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-center">Dual Biometric Verification Required</CardTitle>
                    <p className="text-center text-gray-600">
                      Complete both face and ear scans to mark your attendance
                    </p>
                  </CardHeader>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 justify-items-center">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-center">Step 1: Face Recognition</h3>
                    <BiometricScanner 
                      type="face" 
                      onScanComplete={(success) => handleScanComplete('face', success)}
                    />
                    {faceScanResult !== null && (
                      <Badge className={faceScanResult ? 'bg-green-600' : 'bg-red-600'}>
                        Face {faceScanResult ? 'Verified' : 'Failed'}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-center">Step 2: Ear Biometric</h3>
                    <BiometricScanner 
                      type="ear" 
                      onScanComplete={(success) => handleScanComplete('ear', success)}
                    />
                    {earScanResult !== null && (
                      <Badge className={earScanResult ? 'bg-green-600' : 'bg-red-600'}>
                        Ear {earScanResult ? 'Verified' : 'Failed'}
                      </Badge>
                    )}
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="dashboard">
            <AttendanceDashboard />
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Reports</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="text-center text-gray-500">
                  <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p>Detailed attendance reports and analytics will be available here</p>
                  <p className="text-sm mt-2">Connect to Supabase to enable reporting features</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="text-center text-gray-500">
                  <Shield className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p>Biometric data encryption and security settings</p>
                  <p className="text-sm mt-2">Enhanced security features available with backend integration</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
