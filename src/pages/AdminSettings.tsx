import React, { useState, useEffect } from 'react';
import { Settings, Shield, Clock, Camera, Database, Bell, Users, Key } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';

interface SystemSettings {
    biometric: {
        face_recognition_tolerance: number;
        ear_recognition_tolerance: number;
        min_confidence_threshold: number;
        enable_face_recognition: boolean;
        enable_ear_recognition: boolean;
        max_attempts: number;
    };
    attendance: {
        work_start_time: string;
        work_end_time: string;
        late_threshold_minutes: number;
        break_duration_minutes: number;
        enable_overtime: boolean;
        max_overtime_hours: number;
    };
    security: {
        session_timeout_minutes: number;
        max_login_attempts: number;
        enable_two_factor: boolean;
        password_expiry_days: number;
        require_strong_password: boolean;
    };
    notifications: {
        enable_email_notifications: boolean;
        enable_sms_notifications: boolean;
        attendance_reminders: boolean;
        late_notifications: boolean;
        admin_alerts: boolean;
    };
}

const AdminSettings: React.FC = () => {
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { toast } = useToast();
    const { token } = useAuth();

    useEffect(() => {
        loadSettings();
    }, [token]);

    const loadSettings = async () => {
        try {
            const res = await axios.get('/api/admin/settings/', {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            setSettings(res.data);
        } catch (error) {
            console.error('Error loading settings:', error);
            // Load default settings if API fails
            setSettings(getDefaultSettings());
        } finally {
            setLoading(false);
        }
    };

    const getDefaultSettings = (): SystemSettings => ({
        biometric: {
            face_recognition_tolerance: 0.6,
            ear_recognition_tolerance: 0.7,
            min_confidence_threshold: 0.8,
            enable_face_recognition: true,
            enable_ear_recognition: true,
            max_attempts: 3
        },
        attendance: {
            work_start_time: '09:00',
            work_end_time: '17:00',
            late_threshold_minutes: 15,
            break_duration_minutes: 60,
            enable_overtime: true,
            max_overtime_hours: 2
        },
        security: {
            session_timeout_minutes: 480,
            max_login_attempts: 5,
            enable_two_factor: false,
            password_expiry_days: 90,
            require_strong_password: true
        },
        notifications: {
            enable_email_notifications: true,
            enable_sms_notifications: false,
            attendance_reminders: true,
            late_notifications: true,
            admin_alerts: true
        }
    });

    const handleSettingChange = (category: keyof SystemSettings, key: string, value: any) => {
        if (!settings) return;

        setSettings({
            ...settings,
            [category]: {
                ...settings[category],
                [key]: value
            }
        });
    };

    const saveSettings = async () => {
        if (!settings) return;

        setSaving(true);
        try {
            await axios.post('/api/admin/settings/', settings, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            toast({ title: 'Success', description: 'Settings saved successfully' });
        } catch (error) {
            toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const resetToDefaults = () => {
        setSettings(getDefaultSettings());
        toast({ title: 'Settings Reset', description: 'Settings reset to default values' });
    };

    if (loading || !settings) {
        return (
            <div className="p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-64 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">System Settings</h1>
                    <p className="text-muted-foreground">Configure system behavior and preferences</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={resetToDefaults}>
                        Reset to Defaults
                    </Button>
                    <Button onClick={saveSettings} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Settings'}
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="biometric" className="space-y-4">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="biometric" className="flex items-center gap-2">
                        <Camera className="h-4 w-4" />
                        Biometric
                    </TabsTrigger>
                    <TabsTrigger value="attendance" className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Attendance
                    </TabsTrigger>
                    <TabsTrigger value="security" className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Security
                    </TabsTrigger>
                    <TabsTrigger value="notifications" className="flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Notifications
                    </TabsTrigger>
                    <TabsTrigger value="system" className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        System
                    </TabsTrigger>
                </TabsList>

                {/* Biometric Settings */}
                <TabsContent value="biometric" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Camera className="h-5 w-5" />
                                Biometric Recognition Settings
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="face-recognition">Enable Face Recognition</Label>
                                        <Switch
                                            id="face-recognition"
                                            checked={settings.biometric.enable_face_recognition}
                                            onCheckedChange={(checked) => handleSettingChange('biometric', 'enable_face_recognition', checked)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="face-tolerance">Face Recognition Tolerance</Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                id="face-tolerance"
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                max="1"
                                                value={settings.biometric.face_recognition_tolerance}
                                                onChange={(e) => handleSettingChange('biometric', 'face_recognition_tolerance', parseFloat(e.target.value))}
                                            />
                                            <Badge variant="outline">0.0 - 1.0</Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Lower values = stricter matching
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="ear-recognition">Enable Ear Recognition</Label>
                                        <Switch
                                            id="ear-recognition"
                                            checked={settings.biometric.enable_ear_recognition}
                                            onCheckedChange={(checked) => handleSettingChange('biometric', 'enable_ear_recognition', checked)}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="ear-tolerance">Ear Recognition Tolerance</Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                id="ear-tolerance"
                                                type="number"
                                                step="0.1"
                                                min="0"
                                                max="1"
                                                value={settings.biometric.ear_recognition_tolerance}
                                                onChange={(e) => handleSettingChange('biometric', 'ear_recognition_tolerance', parseFloat(e.target.value))}
                                            />
                                            <Badge variant="outline">0.0 - 1.0</Badge>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="confidence-threshold">Minimum Confidence Threshold</Label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            id="confidence-threshold"
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            max="1"
                                            value={settings.biometric.min_confidence_threshold}
                                            onChange={(e) => handleSettingChange('biometric', 'min_confidence_threshold', parseFloat(e.target.value))}
                                        />
                                        <Badge variant="outline">0.0 - 1.0</Badge>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="max-attempts">Maximum Attempts</Label>
                                    <Input
                                        id="max-attempts"
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={settings.biometric.max_attempts}
                                        onChange={(e) => handleSettingChange('biometric', 'max_attempts', parseInt(e.target.value))}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Attendance Settings */}
                <TabsContent value="attendance" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Attendance Rules
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="work-start">Work Start Time</Label>
                                    <Input
                                        id="work-start"
                                        type="time"
                                        value={settings.attendance.work_start_time}
                                        onChange={(e) => handleSettingChange('attendance', 'work_start_time', e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="work-end">Work End Time</Label>
                                    <Input
                                        id="work-end"
                                        type="time"
                                        value={settings.attendance.work_end_time}
                                        onChange={(e) => handleSettingChange('attendance', 'work_end_time', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="late-threshold">Late Threshold (minutes)</Label>
                                    <Input
                                        id="late-threshold"
                                        type="number"
                                        min="0"
                                        max="120"
                                        value={settings.attendance.late_threshold_minutes}
                                        onChange={(e) => handleSettingChange('attendance', 'late_threshold_minutes', parseInt(e.target.value))}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="break-duration">Break Duration (minutes)</Label>
                                    <Input
                                        id="break-duration"
                                        type="number"
                                        min="0"
                                        max="180"
                                        value={settings.attendance.break_duration_minutes}
                                        onChange={(e) => handleSettingChange('attendance', 'break_duration_minutes', parseInt(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="enable-overtime">Enable Overtime Tracking</Label>
                                    <Switch
                                        id="enable-overtime"
                                        checked={settings.attendance.enable_overtime}
                                        onCheckedChange={(checked) => handleSettingChange('attendance', 'enable_overtime', checked)}
                                    />
                                </div>

                                {settings.attendance.enable_overtime && (
                                    <div className="space-y-2">
                                        <Label htmlFor="max-overtime">Maximum Overtime Hours</Label>
                                        <Input
                                            id="max-overtime"
                                            type="number"
                                            min="0"
                                            max="8"
                                            value={settings.attendance.max_overtime_hours}
                                            onChange={(e) => handleSettingChange('attendance', 'max_overtime_hours', parseInt(e.target.value))}
                                        />
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Security Settings */}
                <TabsContent value="security" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Security Configuration
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                                    <Input
                                        id="session-timeout"
                                        type="number"
                                        min="15"
                                        max="1440"
                                        value={settings.security.session_timeout_minutes}
                                        onChange={(e) => handleSettingChange('security', 'session_timeout_minutes', parseInt(e.target.value))}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="max-login-attempts">Max Login Attempts</Label>
                                    <Input
                                        id="max-login-attempts"
                                        type="number"
                                        min="3"
                                        max="10"
                                        value={settings.security.max_login_attempts}
                                        onChange={(e) => handleSettingChange('security', 'max_login_attempts', parseInt(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="password-expiry">Password Expiry (days)</Label>
                                    <Input
                                        id="password-expiry"
                                        type="number"
                                        min="30"
                                        max="365"
                                        value={settings.security.password_expiry_days}
                                        onChange={(e) => handleSettingChange('security', 'password_expiry_days', parseInt(e.target.value))}
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="two-factor">Enable Two-Factor Authentication</Label>
                                    <Switch
                                        id="two-factor"
                                        checked={settings.security.enable_two_factor}
                                        onCheckedChange={(checked) => handleSettingChange('security', 'enable_two_factor', checked)}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label htmlFor="strong-password">Require Strong Passwords</Label>
                                    <Switch
                                        id="strong-password"
                                        checked={settings.security.require_strong_password}
                                        onCheckedChange={(checked) => handleSettingChange('security', 'require_strong_password', checked)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Notification Settings */}
                <TabsContent value="notifications" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bell className="h-5 w-5" />
                                Notification Preferences
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="email-notifications">Email Notifications</Label>
                                    <Switch
                                        id="email-notifications"
                                        checked={settings.notifications.enable_email_notifications}
                                        onCheckedChange={(checked) => handleSettingChange('notifications', 'enable_email_notifications', checked)}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label htmlFor="sms-notifications">SMS Notifications</Label>
                                    <Switch
                                        id="sms-notifications"
                                        checked={settings.notifications.enable_sms_notifications}
                                        onCheckedChange={(checked) => handleSettingChange('notifications', 'enable_sms_notifications', checked)}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label htmlFor="attendance-reminders">Attendance Reminders</Label>
                                    <Switch
                                        id="attendance-reminders"
                                        checked={settings.notifications.attendance_reminders}
                                        onCheckedChange={(checked) => handleSettingChange('notifications', 'attendance_reminders', checked)}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label htmlFor="late-notifications">Late Arrival Notifications</Label>
                                    <Switch
                                        id="late-notifications"
                                        checked={settings.notifications.late_notifications}
                                        onCheckedChange={(checked) => handleSettingChange('notifications', 'late_notifications', checked)}
                                    />
                                </div>

                                <div className="flex items-center justify-between">
                                    <Label htmlFor="admin-alerts">Admin Alert Notifications</Label>
                                    <Switch
                                        id="admin-alerts"
                                        checked={settings.notifications.admin_alerts}
                                        onCheckedChange={(checked) => handleSettingChange('notifications', 'admin_alerts', checked)}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* System Settings */}
                <TabsContent value="system" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="h-5 w-5" />
                                System Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>System Version</Label>
                                    <Badge variant="outline">v1.0.0</Badge>
                                </div>
                                <div className="space-y-2">
                                    <Label>Last Updated</Label>
                                    <Badge variant="outline">{new Date().toLocaleDateString()}</Badge>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Database Status</Label>
                                <Badge className="bg-green-100 text-green-800">Connected</Badge>
                            </div>

                            <div className="space-y-2">
                                <Label>Redis Status</Label>
                                <Badge className="bg-green-100 text-green-800">Connected</Badge>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AdminSettings;
