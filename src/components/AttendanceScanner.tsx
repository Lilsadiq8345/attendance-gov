import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Clock, CheckCircle, XCircle, AlertTriangle, User, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import RealTimeBiometricScanner from './RealTimeBiometricScanner';
import axios from 'axios';

interface AttendanceScannerProps {
  onScanComplete: (success: boolean) => void;
}

interface AttendanceData {
  attendance_type: 'check_in' | 'check_out';
  face_verified: boolean;
  ear_verified: boolean;
  face_confidence?: number;
  ear_confidence?: number;
  biometric_data?: any;
  location?: string;
  device_info?: any;
}

const AttendanceScanner: React.FC<AttendanceScannerProps> = ({ onScanComplete }) => {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [userVerified, setUserVerified] = useState(false);
  const [scanStarted, setScanStarted] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [attendanceType, setAttendanceType] = useState<'check_in' | 'check_out'>('check_in');
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (user) {
      setUserVerified(!!user.is_verified);
    }
  }, [user]);

  useEffect(() => {
    // Update current time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (token) {
      fetchTodayAttendance();
    }
  }, [token]);

  const fetchTodayAttendance = async () => {
    try {
      const response = await axios.get('/api/attendance/today/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTodayAttendance(response.data);
    } catch (error) {
      console.error('Error fetching today\'s attendance:', error);
    }
  };

  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new window.SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleStartScan = () => {
    if (!user || !userVerified) {
      toast({
        title: 'Verification Required',
        description: 'Please complete biometric verification first',
        variant: 'destructive',
      });
      speak('Please complete biometric verification first.');
      return;
    }

    // Check if already marked attendance for today
    if (attendanceType === 'check_in' && todayAttendance?.some((record: any) => record.attendance_type === 'check_in')) {
      toast({
        title: 'Already Checked In',
        description: 'You have already checked in today',
        variant: 'destructive',
      });
      return;
    }

    if (attendanceType === 'check_out' && todayAttendance?.some((record: any) => record.attendance_type === 'check_out')) {
      toast({
        title: 'Already Checked Out',
        description: 'You have already checked out today',
        variant: 'destructive',
      });
      return;
    }

    setScanStarted(true);
    setScanSuccess(false);
    setScanError(null);
    speak(`Please look directly at the camera for ${attendanceType.replace('_', ' ')} verification.`);
  };

  const handleScanComplete = async (biometricData: any) => {
    setLoading(true);
    try {
      // Map client scan payload to API contract (snake_case keys)
      const normalizedBiometricData = {
        face_features: biometricData.faceFeatures || [],
        ear_features: biometricData.earFeatures || [],
        ear_left_features: biometricData.earLeftFeatures || [],
        ear_right_features: biometricData.earRightFeatures || [],
        confidence: biometricData.confidence ?? 0.85,
        timestamp: new Date().toISOString(),
        verification_type: biometricData.verification_type || 'both',
      };

      const attendanceData: AttendanceData = {
        attendance_type: attendanceType,
        // Let backend compute verification from feature vectors
        face_verified: false,
        ear_verified: false,
        biometric_data: normalizedBiometricData,
        location: 'Office',
        device_info: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          timestamp: new Date().toISOString()
        }
      };

      const response = await axios.post('/api/attendance/mark/', attendanceData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setScanSuccess(true);
      setScanStarted(false);

      const message = `${attendanceType.replace('_', ' ')} marked successfully!`;
      toast({
        title: 'Success!',
        description: message,
      });

      speak(message);
      onScanComplete(true);

      // Refresh today's attendance
      await fetchTodayAttendance();

    } catch (error: any) {
      console.error('Error marking attendance:', error);
      setScanError(error.response?.data?.error || 'Failed to mark attendance');
      setScanStarted(false);

      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to mark attendance',
        variant: 'destructive',
      });

      onScanComplete(false);
    } finally {
      setLoading(false);
    }
  };

  const handleScanError = (error: string) => {
    setScanError(error);
    setScanStarted(false);
    toast({
      title: 'Scan Error',
      description: error,
      variant: 'destructive'
    });
    onScanComplete(false);
  };

  const resetScanner = () => {
    setScanStarted(false);
    setScanSuccess(false);
    setScanError(null);
  };

  const getCurrentStatus = () => {
    if (!todayAttendance) return 'unknown';

    const hasCheckIn = todayAttendance.some((record: any) => record.attendance_type === 'check_in');
    const hasCheckOut = todayAttendance.some((record: any) => record.attendance_type === 'check_out');

    if (hasCheckOut) return 'checked_out';
    if (hasCheckIn) return 'checked_in';
    return 'not_checked_in';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'checked_in': return 'bg-green-100 text-green-800';
      case 'checked_out': return 'bg-blue-100 text-blue-800';
      case 'not_checked_in': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'checked_in': return 'Checked In';
      case 'checked_out': return 'Checked Out';
      case 'not_checked_in': return 'Not Checked In';
      default: return 'Unknown';
    }
  };

  const currentStatus = getCurrentStatus();

  if (!userVerified) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Shield className="h-6 w-6 text-orange-600" />
            Biometric Verification Required
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You need to complete biometric verification before marking attendance.
            </AlertDescription>
          </Alert>
          <p className="text-sm text-gray-600 mb-4">
            Please go to the Biometric tab to register your face and ear biometrics.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2">
            <Clock className="h-6 w-6" />
            Today's Attendance Status
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="text-2xl font-bold">
              {currentTime.toLocaleTimeString()}
            </div>
            <Badge className={getStatusColor(currentStatus)}>
              {getStatusText(currentStatus)}
            </Badge>
          </div>

          {todayAttendance && todayAttendance.length > 0 && (
            <div className="space-y-2">
              {todayAttendance.map((record: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="font-medium">
                    {record.attendance_type.replace('_', ' ').toUpperCase()}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {new Date(record.timestamp).toLocaleTimeString()}
                    </span>
                    {record.face_verified && <Badge variant="outline" className="text-green-600">Face ✓</Badge>}
                    {record.ear_verified && <Badge variant="outline" className="text-blue-600">Ear ✓</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance Scanner */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2">
            <User className="h-6 w-6" />
            Mark Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!scanStarted ? (
            <div className="space-y-4">
              <div className="flex justify-center gap-4">
                <Button
                  onClick={() => setAttendanceType('check_in')}
                  variant={attendanceType === 'check_in' ? 'default' : 'outline'}
                  disabled={currentStatus === 'checked_in'}
                >
                  Check In
                </Button>
                <Button
                  onClick={() => setAttendanceType('check_out')}
                  variant={attendanceType === 'check_out' ? 'default' : 'outline'}
                  disabled={currentStatus === 'not_checked_in' || currentStatus === 'checked_out'}
                >
                  Check Out
                </Button>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-600 mb-4">
                  {attendanceType === 'check_in'
                    ? 'Mark your arrival for today'
                    : 'Mark your departure for today'
                  }
                </p>

                <Button
                  onClick={handleStartScan}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    `Start ${attendanceType.replace('_', ' ')} Scan`
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">
                  {attendanceType === 'check_in' ? 'Check In' : 'Check Out'} Verification
                </h3>
                <p className="text-sm text-gray-600">
                  Please complete the biometric scan to mark your attendance
                </p>
              </div>

              <RealTimeBiometricScanner
                scanType="both"
                onScanComplete={handleScanComplete}
                onError={handleScanError}
                maxAttempts={3}
                mode="verification"
              />

              {scanError && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{scanError}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-center gap-2">
                <Button onClick={resetScanner} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Success Message */}
      {scanSuccess && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                Attendance Marked Successfully!
              </h3>
              <p className="text-green-700">
                Your {attendanceType.replace('_', ' ')} has been recorded with biometric verification.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AttendanceScanner;
