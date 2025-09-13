import React, { useState, useEffect } from 'react';
import { User, Shield, Clock, Edit, Save, X, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import { apiConfig } from '../config/api';

// Configure axios to use the correct base URL
axios.defaults.baseURL = apiConfig.baseURL;

interface Profile {
  full_name: string;
  short_id: string;
  nin: string;
  is_verified: boolean;
  created_at: string;
  biometric_data?: any;
}

const UserProfile: React.FC = () => {
  const { user, token, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Profile>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) fetchProfile();
    // eslint-disable-next-line
  }, [token]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/user/', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfile(res.data);
      setForm(res.data);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load profile', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!token) return;
    setLoading(true);
    try {
      await axios.put('/api/user/', form, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: 'Profile Updated', description: 'Your profile has been updated.' });
      setEditing(false);
      fetchProfile();
      refreshProfile();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update profile', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!profile) return <div>No profile found.</div>;

  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-4">
            <Label>Full Name</Label>
            <Input name="full_name" value={form.full_name || ''} onChange={handleChange} />
            <Label>Short ID</Label>
            <Input name="short_id" value={form.short_id || ''} onChange={handleChange} />
            <Label>NIN</Label>
            <Input name="nin" value={form.nin || ''} onChange={handleChange} />
            <Button onClick={handleSave} className="w-full mt-4">Save</Button>
            <Button onClick={() => setEditing(false)} variant="outline" className="w-full mt-2">Cancel</Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <span className="font-semibold">{profile.full_name}</span>
              {profile.is_verified && <Badge variant="success">Verified</Badge>}
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <span className="text-sm">Short ID: {profile.short_id}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <span className="text-sm">NIN: {profile.nin}</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Button onClick={() => setEditing(true)} size="sm">Edit</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UserProfile;
