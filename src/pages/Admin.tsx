import React from 'react';
import AdminDashboard from '@/components/AdminDashboard';
import AdminRoute from '@/components/AdminRoute';

const Admin: React.FC = () => {
    return (
        <AdminRoute>
            <AdminDashboard />
        </AdminRoute>
    );
};

export default Admin;
