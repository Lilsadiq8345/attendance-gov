
import React, { useState } from 'react';
import { Camera, Scan, User, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BiometricScannerProps {
  onScanComplete: (success: boolean) => void;
}

const BiometricScanner: React.FC<BiometricScannerProps> = ({ onScanComplete }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<'success' | 'failed' | null>(null);

  const startScan = () => {
    setIsScanning(true);
    setScanResult(null);

    // Simulate scanning process
    setTimeout(() => {
      const success = Math.random() > 0.3; // 70% success rate for demo
      setScanResult(success ? 'success' : 'failed');
      setIsScanning(false);
      onScanComplete(success);
    }, 3000);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <User className="h-6 w-6" />
          Biometric Scan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative h-64 bg-gradient-to-br from-blue-50 to-green-50 rounded-lg border-2 border-dashed border-blue-200 flex items-center justify-center">
          {isScanning ? (
            <div className="text-center">
              <div className="animate-pulse">
                <Camera className="h-16 w-16 text-blue-600 mx-auto mb-2" />
              </div>
              <p className="text-blue-600 font-medium">Scanning...</p>
              <div className="mt-2">
                <div className="w-32 h-2 bg-blue-200 rounded-full mx-auto overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          ) : scanResult ? (
            <div className="text-center">
              {scanResult === 'success' ? (
                <>
                  <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-2" />
                  <p className="text-green-600 font-medium">Scan Successful</p>
                </>
              ) : (
                <>
                  <XCircle className="h-16 w-16 text-red-600 mx-auto mb-2" />
                  <p className="text-red-600 font-medium">Scan Failed</p>
                </>
              )}
            </div>
          ) : (
            <div className="text-center">
              <Camera className="h-16 w-16 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">Position your face in the frame</p>
            </div>
          )}
        </div>

        <Button
          onClick={startScan}
          disabled={isScanning}
          className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
        >
          {isScanning ? 'Scanning...' : 'Start Scan'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default BiometricScanner;
