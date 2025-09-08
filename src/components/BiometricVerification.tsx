import React, { useState, useEffect, useRef } from 'react';
import { Camera, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import RealTimeBiometricScanner from './RealTimeBiometricScanner';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface BiometricVerificationProps {
  onVerificationComplete: (success: boolean) => void;
}

const BiometricVerification: React.FC<BiometricVerificationProps> = ({ onVerificationComplete }) => {
  const [step, setStep] = useState<'scan' | 'complete'>('scan');
  const [scanData, setScanData] = useState<any | null>(null);
  const { user, token, loading, refreshProfile } = useAuth();
  const { toast } = useToast();
  const postedRef = useRef(false);
  const navigate = useNavigate();

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.8;
    utterance.pitch = 1;
    speechSynthesis.speak(utterance);
  };

  const handleScanComplete = (data: any) => {
    setScanData(data);
    setStep('complete');
    speak('Biometric capture complete. Saving your enrollment.');
  };

  const handleScanError = (error: string) => {
    toast({
      title: "Scan Error",
      description: error,
      variant: "destructive"
    });
  };

  const saveBiometricData = async () => {
    if (!user || !token || !scanData || postedRef.current) return;
    try {
      postedRef.current = true;
      const payload = {
        verification_type: 'both' as const,
        biometric_data: {
          face_features: scanData.faceFeatures || [],
          ear_features: scanData.earFeatures || [],
          ear_left_features: scanData.earLeftFeatures || [],
          ear_right_features: scanData.earRightFeatures || [],
          confidence: scanData.confidence ?? 0.85,
          timestamp: new Date().toISOString(),
          verification_type: 'both' as const,
        },
      };
      console.log('[Biometric] POST /api/biometric/register/', payload);
      await axios.post('/api/biometric/register/', payload, { headers: { Authorization: `Bearer ${token}` } });
      toast({ title: 'Success', description: 'Enrollment completed. You can now mark your attendance.' });
      speak('Enrollment successful. You can now mark your attendance.');
      await refreshProfile();
      onVerificationComplete(true);
    } catch (error: any) {
      console.error('Error saving biometric data:', error?.response?.data || error);
      toast({
        title: "Error",
        description: error?.response?.data?.error || 'Failed to save biometric verification',
        variant: "destructive",
      });
      onVerificationComplete(false);
    }
  };

  useEffect(() => {
    if (step === 'complete') {
      saveBiometricData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const renderVerificationContent = () => {
    if (step === 'complete') {
      return (
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <p className="text-green-600 font-medium mb-2">Enrollment Complete</p>
          <p className="text-sm text-gray-600 mb-4">You can now mark your attendance.</p>
          <div className="flex gap-2">
            <Button onClick={() => window.location.assign('/?tab=attendance')} className="flex-1">Go to Attendance</Button>
            <Button onClick={() => { postedRef.current = false; setStep('scan'); setScanData(null); }} variant="outline" className="flex-1">Scan Again</Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-blue-600">Biometric Verification</h3>
          <p className="text-sm text-gray-600">Look at the camera and follow the prompts</p>
        </div>
        <RealTimeBiometricScanner
          scanType="both"
          onScanComplete={handleScanComplete}
          onError={handleScanError}
          maxAttempts={3}
          mode="registration"
        />
      </div>
    );
  };

  if (loading) return <div>Loading...</div>;
  if (!user) return <div className="text-center text-red-600 font-semibold">Please log in to use biometric verification.</div>;

  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>Biometric Verification</CardTitle>
      </CardHeader>
      <CardContent>
        {renderVerificationContent()}
      </CardContent>
    </Card>
  );
};

export default BiometricVerification;
