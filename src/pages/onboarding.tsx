import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import RealTimeBiometricScanner from '@/components/RealTimeBiometricScanner';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';

const departments = [
    'HR', 'IT', 'Finance', 'Admin', 'Procurement', 'Legal', 'Operations', 'Other'
];
const positions = [
    'Officer', 'Manager', 'Director', 'Assistant', 'Intern', 'Other'
];
const genders = ['Male', 'Female', 'Other'];

export default function Onboarding() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const { user, token } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        phone: '',
        department: '',
        position: '',
        office_location: '',
        staff_id: '',
        date_of_birth: '',
        gender: '',
        faceBiometric: null as any,
        earBiometric: null as any,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleBiometric = (type: 'face' | 'ear', data: any) => {
        setForm((prev) => ({ ...prev, [`${type}Biometric`]: data }));
    };

    const handleSubmit = async () => {
        if (!user || !token) return;
        setLoading(true);
        try {
            await axios.put('/api/user/', {
                phone: form.phone,
                department: form.department,
                position: form.position,
                office_location: form.office_location,
                staff_id: form.staff_id,
                date_of_birth: form.date_of_birth,
                gender: form.gender,
                biometric_data: {
                    face: form.faceBiometric,
                    ear: form.earBiometric,
                },
                onboarding_completed: true,
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast({ title: 'Onboarding Complete', description: 'Welcome to the system!' });
            navigate('/');
        } catch (err: any) {
            toast({ title: 'Error', description: err?.response?.data?.error || 'Unexpected error', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-2xl">
                <CardHeader className="text-center">
                    <CardTitle>Staff Onboarding</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="mb-6 flex justify-center gap-2">
                        <Button variant={step === 1 ? 'default' : 'outline'} onClick={() => setStep(1)}>1. Personal Info</Button>
                        <Button variant={step === 2 ? 'default' : 'outline'} onClick={() => setStep(2)} disabled={!form.phone || !form.department || !form.position || !form.staff_id || !form.date_of_birth || !form.gender}>2. Biometric</Button>
                        <Button variant={step === 3 ? 'default' : 'outline'} onClick={() => setStep(3)} disabled={!form.faceBiometric || !form.earBiometric}>3. Review</Button>
                    </div>

                    {step === 1 && (
                        <form className="space-y-4" onSubmit={e => { e.preventDefault(); setStep(2); }}>
                            <Input name="phone" placeholder="Phone Number" value={form.phone} onChange={handleChange} required />
                            <select name="department" value={form.department} onChange={handleChange} required className="w-full border rounded p-2">
                                <option value="">Select Department</option>
                                {departments.map(dep => <option key={dep} value={dep}>{dep}</option>)}
                            </select>
                            <select name="position" value={form.position} onChange={handleChange} required className="w-full border rounded p-2">
                                <option value="">Select Position</option>
                                {positions.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                            </select>
                            <Input name="office_location" placeholder="Office Location" value={form.office_location} onChange={handleChange} />
                            <Input name="staff_id" placeholder="Staff ID" value={form.staff_id} onChange={handleChange} required />
                            <Input name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} required />
                            <select name="gender" value={form.gender} onChange={handleChange} required className="w-full border rounded p-2">
                                <option value="">Select Gender</option>
                                {genders.map(gender => <option key={gender} value={gender}>{gender}</option>)}
                            </select>
                            <Button type="submit" className="w-full">Next: Biometric Setup</Button>
                        </form>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="text-center mb-6">
                                <h3 className="text-lg font-semibold mb-2">Biometric Registration</h3>
                                <p className="text-gray-600">Please complete both face and ear biometric scans</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h4 className="font-medium text-center">Face Recognition</h4>
                                    <RealTimeBiometricScanner
                                        onScanComplete={(data) => handleBiometric('face', data)}
                                        onError={(error) => console.error('Face scan error:', error)}
                                        scanType="face"
                                        mode="registration"
                                    />
                                </div>

                                <div className="space-y-4">
                                    <h4 className="font-medium text-center">Ear Biometric</h4>
                                    <RealTimeBiometricScanner
                                        onScanComplete={(data) => handleBiometric('ear', data)}
                                        onError={(error) => console.error('Ear scan error:', error)}
                                        scanType="ear"
                                        mode="registration"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                                <Button onClick={() => setStep(3)} disabled={!form.faceBiometric || !form.earBiometric}>
                                    Next: Review
                                </Button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="text-center mb-6">
                                <h3 className="text-lg font-semibold mb-2">Review Your Information</h3>
                                <p className="text-gray-600">Please review your details before completing onboarding</p>
                            </div>

                            <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Phone:</label>
                                        <p className="text-gray-900">{form.phone}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Department:</label>
                                        <p className="text-gray-900">{form.department}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Position:</label>
                                        <p className="text-gray-900">{form.position}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Staff ID:</label>
                                        <p className="text-gray-900">{form.staff_id}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Date of Birth:</label>
                                        <p className="text-gray-900">{form.date_of_birth}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-600">Gender:</label>
                                        <p className="text-gray-900">{form.gender}</p>
                                    </div>
                                </div>

                                <div className="pt-4 border-t">
                                    <label className="text-sm font-medium text-gray-600">Biometric Status:</label>
                                    <div className="flex gap-4 mt-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${form.faceBiometric ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                            <span className="text-sm">Face: {form.faceBiometric ? 'Registered' : 'Pending'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${form.earBiometric ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                            <span className="text-sm">Ear: {form.earBiometric ? 'Registered' : 'Pending'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                                <Button onClick={handleSubmit} disabled={loading} className="w-full">
                                    {loading ? 'Completing...' : 'Complete Onboarding'}
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
} 