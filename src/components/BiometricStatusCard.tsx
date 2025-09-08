import React, { useState } from 'react';
import { Shield, Camera, AlertCircle, CheckCircle, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import BiometricVerification from './BiometricVerification';

interface BiometricStatusCardProps {
    onStatusUpdate?: () => void;
}

const BiometricStatusCard: React.FC<BiometricStatusCardProps> = ({ onStatusUpdate }) => {
    const [showVerification, setShowVerification] = useState(false);
    const { user, refreshProfile } = useAuth();
    const { toast } = useToast();

    const isBiometricRegistered =
        !!(user?.face_biometric_data || user?.ear_biometric_data);
    const biometricData = {
        ...(user?.face_biometric_data || {}),
        ...(user?.ear_biometric_data || {}),
    } as any;

    const handleVerificationComplete = async (success: boolean) => {
        setShowVerification(false);
        if (success) {
            await refreshProfile();
            onStatusUpdate?.();
            toast({
                title: "Success",
                description: "Biometric verification completed successfully!"
            });
        }
    };

    const handleReEnroll = () => {
        setShowVerification(true);
    };

    if (showVerification) {
        return (
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Camera className="h-5 w-5" />
                        Biometric Re-enrollment
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <BiometricVerification onVerificationComplete={handleVerificationComplete} />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Biometric Status
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-lg">Biometric Verification</h3>
                        <p className="text-gray-600">
                            {isBiometricRegistered
                                ? "Your biometric data is registered and secure"
                                : "Complete biometric verification to secure your account"
                            }
                        </p>
                    </div>
                    <Badge className={isBiometricRegistered ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                        {isBiometricRegistered ? (
                            <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Registered
                            </>
                        ) : (
                            <>
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Not Registered
                            </>
                        )}
                    </Badge>
                </div>

                {isBiometricRegistered && biometricData && (
                    <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900">Registration Details</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-600">Face Features:</span>
                                <div className="font-medium">{Array.isArray(biometricData.face_features) ? 'Stored' : 'N/A'}</div>
                            </div>
                            <div>
                                <span className="text-gray-600">Ear Features:</span>
                                <div className="font-medium">{Array.isArray(biometricData.ear_features) ? 'Stored' : 'N/A'}</div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex gap-2">
                    {isBiometricRegistered ? (
                        <Button onClick={handleReEnroll} variant="outline" className="flex-1">
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Re-enroll Biometrics
                        </Button>
                    ) : (
                        <Button onClick={handleReEnroll} className="flex-1">
                            <Camera className="h-4 w-4 mr-2" />
                            Enroll Biometrics
                        </Button>
                    )}
                </div>

                <div className="text-xs text-gray-500">
                    <p>• Biometric data is encrypted and stored securely</p>
                    <p>• Used for attendance verification and account security</p>
                    <p>• You can re-enroll at any time to update your biometric data</p>
                </div>
            </CardContent>
        </Card>
    );
};

export default BiometricStatusCard; 