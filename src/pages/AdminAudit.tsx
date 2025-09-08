import React, { useState, useEffect } from 'react';
import { Eye, Shield, User, Clock, AlertTriangle, CheckCircle, XCircle, Filter, Download, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';

interface AuditLog {
    id: string;
    timestamp: string;
    user_id: string;
    user_name: string;
    user_email: string;
    action: string;
    action_type: 'login' | 'logout' | 'create' | 'update' | 'delete' | 'view' | 'export' | 'system';
    resource_type: string;
    resource_id: string;
    resource_name: string;
    ip_address: string;
    user_agent: string;
    status: 'success' | 'failure' | 'warning';
    details: string;
    department: string;
    role: string;
}

interface AuditSummary {
    total_actions: number;
    successful_actions: number;
    failed_actions: number;
    unique_users: number;
    top_actions: Array<{ action: string; count: number }>;
    recent_activities: Array<AuditLog>;
}

const AdminAudit: React.FC = () => {
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [summary, setSummary] = useState<AuditSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [actionFilter, setActionFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [userFilter, setUserFilter] = useState<string>('all');
    const [dateRange, setDateRange] = useState<string>('today');
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    const { toast } = useToast();
    const { token } = useAuth();

    useEffect(() => {
        loadAuditLogs();
        loadSummary();
    }, [token]);

    useEffect(() => {
        filterAuditLogs();
    }, [auditLogs, searchTerm, actionFilter, statusFilter, userFilter, dateRange]);

    const loadAuditLogs = async () => {
        try {
            const res = await axios.get('/api/admin/audit-logs/', {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            setAuditLogs(res.data?.logs || []);
        } catch (error) {
            console.error('Error loading audit logs:', error);
            // Load sample data for demo
            setAuditLogs(getSampleAuditLogs());
        } finally {
            setLoading(false);
        }
    };

    const loadSummary = async () => {
        try {
            const res = await axios.get('/api/admin/audit-summary/', {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            setSummary(res.data);
        } catch (error) {
            console.error('Error loading audit summary:', error);
            // Load sample summary for demo
            setSummary(getSampleSummary());
        }
    };

    const getSampleAuditLogs = (): AuditLog[] => [
        {
            id: '1',
            timestamp: new Date().toISOString(),
            user_id: 'admin1',
            user_name: 'John Admin',
            user_email: 'john.admin@company.com',
            action: 'User Login',
            action_type: 'login',
            resource_type: 'auth',
            resource_id: 'auth_system',
            resource_name: 'Authentication System',
            ip_address: '192.168.1.100',
            user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            status: 'success',
            details: 'Successful login from office network',
            department: 'IT',
            role: 'admin'
        },
        {
            id: '2',
            timestamp: new Date(Date.now() - 300000).toISOString(),
            user_id: 'admin2',
            user_name: 'Sarah Manager',
            user_email: 'sarah.manager@company.com',
            action: 'User Suspended',
            action_type: 'update',
            resource_type: 'user',
            resource_id: 'user123',
            resource_name: 'John Doe',
            ip_address: '192.168.1.101',
            user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            status: 'success',
            details: 'User suspended for policy violation',
            department: 'HR',
            role: 'manager'
        },
        {
            id: '3',
            timestamp: new Date(Date.now() - 600000).toISOString(),
            user_id: 'user1',
            user_name: 'Mike Employee',
            user_email: 'mike.employee@company.com',
            action: 'Biometric Registration',
            action_type: 'create',
            resource_type: 'biometric',
            resource_id: 'bio456',
            resource_name: 'Face Recognition Data',
            ip_address: '192.168.1.102',
            user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            status: 'success',
            details: 'New face recognition data registered',
            department: 'Operations',
            role: 'employee'
        }
    ];

    const getSampleSummary = (): AuditSummary => ({
        total_actions: 156,
        successful_actions: 148,
        failed_actions: 8,
        unique_users: 23,
        top_actions: [
            { action: 'User Login', count: 45 },
            { action: 'Attendance Check-in', count: 38 },
            { action: 'Biometric Registration', count: 25 },
            { action: 'User Update', count: 18 },
            { action: 'Report Export', count: 12 }
        ],
        recent_activities: getSampleAuditLogs()
    });

    const filterAuditLogs = () => {
        if (!auditLogs || !Array.isArray(auditLogs)) return [];

        let filtered = auditLogs.filter(log => {
            if (!log || !log.user_name || !log.action || !log.resource_name) return false;

            const matchesSearch = log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.resource_name.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesAction = actionFilter === 'all' || log.action_type === actionFilter;
            const matchesStatus = statusFilter === 'all' || log.status === statusFilter;
            const matchesUser = userFilter === 'all' || log.user_id === userFilter;

            return matchesSearch && matchesAction && matchesStatus && matchesUser;
        });

        // Apply date range filter
        if (dateRange !== 'all') {
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            filtered = filtered.filter(log => {
                const logDate = new Date(log.timestamp);
                switch (dateRange) {
                    case 'today':
                        return logDate >= today;
                    case 'week':
                        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                        return logDate >= weekAgo;
                    case 'month':
                        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
                        return logDate >= monthAgo;
                    default:
                        return true;
                }
            });
        }

        return filtered;
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, string> = {
            'success': 'bg-green-100 text-green-800',
            'failure': 'bg-red-100 text-red-800',
            'warning': 'bg-yellow-100 text-yellow-800'
        };
        return <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>{status}</Badge>;
    };

    const getActionTypeBadge = (actionType: string) => {
        const variants: Record<string, string> = {
            'login': 'bg-blue-100 text-blue-800',
            'logout': 'bg-gray-100 text-gray-800',
            'create': 'bg-green-100 text-green-800',
            'update': 'bg-yellow-100 text-yellow-800',
            'delete': 'bg-red-100 text-red-800',
            'view': 'bg-purple-100 text-purple-800',
            'export': 'bg-indigo-100 text-indigo-800',
            'system': 'bg-orange-100 text-orange-800'
        };
        return <Badge className={variants[actionType] || 'bg-gray-100 text-gray-800'}>{actionType}</Badge>;
    };

    const exportAuditLogs = () => {
        const filteredLogs = filterAuditLogs();
        const csvContent = [
            ['Timestamp', 'User', 'Email', 'Action', 'Action Type', 'Resource', 'Status', 'IP Address', 'Department', 'Role'],
            ...filteredLogs.map(log => [
                new Date(log.timestamp).toLocaleString(),
                log.user_name,
                log.user_email,
                log.action,
                log.action_type,
                log.resource_name,
                log.status,
                log.ip_address,
                log.department,
                log.role
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        toast({ title: 'Success', description: 'Audit logs exported successfully' });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!auditLogs || !Array.isArray(auditLogs)) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Audit Data</h3>
                    <p className="text-gray-600 mb-4">Unable to load audit logs</p>
                    <Button onClick={loadAuditLogs}>Retry</Button>
                </div>
            </div>
        );
    }

    const filteredLogs = filterAuditLogs();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Audit Logs</h1>
                    <p className="text-muted-foreground">Monitor and track all system activities and user actions</p>
                </div>
                <Button onClick={exportAuditLogs} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Logs
                </Button>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
                            <Shield className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summary.total_actions}</div>
                            <p className="text-xs text-muted-foreground">
                                All time activities
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Successful</CardTitle>
                            <CheckCircle className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{summary.successful_actions}</div>
                            <p className="text-xs text-muted-foreground">
                                {Math.round((summary.successful_actions / summary.total_actions) * 100)}% success rate
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Failed Actions</CardTitle>
                            <XCircle className="h-4 w-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{summary.failed_actions}</div>
                            <p className="text-xs text-muted-foreground">
                                Requires attention
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                            <User className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">{summary.unique_users}</div>
                            <p className="text-xs text-muted-foreground">
                                Unique users today
                            </p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filter Audit Logs
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search logs..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        <Select value={actionFilter} onValueChange={setActionFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Action Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Actions</SelectItem>
                                <SelectItem value="login">Login</SelectItem>
                                <SelectItem value="logout">Logout</SelectItem>
                                <SelectItem value="create">Create</SelectItem>
                                <SelectItem value="update">Update</SelectItem>
                                <SelectItem value="delete">Delete</SelectItem>
                                <SelectItem value="view">View</SelectItem>
                                <SelectItem value="export">Export</SelectItem>
                                <SelectItem value="system">System</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="success">Success</SelectItem>
                                <SelectItem value="failure">Failure</SelectItem>
                                <SelectItem value="warning">Warning</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={dateRange} onValueChange={setDateRange}>
                            <SelectTrigger>
                                <SelectValue placeholder="Date Range" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Time</SelectItem>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="week">This Week</SelectItem>
                                <SelectItem value="month">This Month</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={userFilter} onValueChange={setUserFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="User" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Users</SelectItem>
                                {Array.from(new Set(auditLogs.map(log => log.user_id))).map(userId => (
                                    <SelectItem key={userId} value={userId}>
                                        {auditLogs.find(log => log.user_id === userId)?.user_name || userId}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Audit Logs Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Audit Logs ({filteredLogs.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Timestamp</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Resource</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>IP Address</TableHead>
                                <TableHead>Department</TableHead>
                                <TableHead className="w-12">Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLogs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="text-sm">
                                        <div className="flex items-center gap-2">
                                            <Clock className="h-3 w-3 text-muted-foreground" />
                                            {new Date(log.timestamp).toLocaleString()}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <div className="font-medium">{log.user_name}</div>
                                            <div className="text-sm text-muted-foreground">{log.user_email}</div>
                                            <div className="text-xs text-muted-foreground">{log.role}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <div className="font-medium">{log.action}</div>
                                            {getActionTypeBadge(log.action_type)}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div>
                                            <div className="font-medium">{log.resource_name}</div>
                                            <div className="text-sm text-muted-foreground">{log.resource_type}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                                    <TableCell className="font-mono text-sm">{log.ip_address}</TableCell>
                                    <TableCell>{log.department}</TableCell>
                                    <TableCell>
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setSelectedLog(log)}
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-2xl">
                                                <DialogHeader>
                                                    <DialogTitle>Audit Log Details</DialogTitle>
                                                    <DialogDescription>
                                                        Detailed information about this audit log entry
                                                    </DialogDescription>
                                                </DialogHeader>
                                                {selectedLog && (
                                                    <div className="space-y-4">
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <Label className="font-semibold">User Information</Label>
                                                                <div className="text-sm space-y-1">
                                                                    <div><span className="font-medium">Name:</span> {selectedLog.user_name}</div>
                                                                    <div><span className="font-medium">Email:</span> {selectedLog.user_email}</div>
                                                                    <div><span className="font-medium">Role:</span> {selectedLog.role}</div>
                                                                    <div><span className="font-medium">Department:</span> {selectedLog.department}</div>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <Label className="font-semibold">Action Details</Label>
                                                                <div className="text-sm space-y-1">
                                                                    <div><span className="font-medium">Action:</span> {selectedLog.action}</div>
                                                                    <div><span className="font-medium">Type:</span> {selectedLog.action_type}</div>
                                                                    <div><span className="font-medium">Status:</span> {getStatusBadge(selectedLog.status)}</div>
                                                                    <div><span className="font-medium">Timestamp:</span> {new Date(selectedLog.timestamp).toLocaleString()}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <Label className="font-semibold">Resource Information</Label>
                                                            <div className="text-sm space-y-1">
                                                                <div><span className="font-medium">Type:</span> {selectedLog.resource_type}</div>
                                                                <div><span className="font-medium">Name:</span> {selectedLog.resource_name}</div>
                                                                <div><span className="font-medium">ID:</span> {selectedLog.resource_id}</div>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <Label className="font-semibold">Technical Details</Label>
                                                            <div className="text-sm space-y-1">
                                                                <div><span className="font-medium">IP Address:</span> {selectedLog.ip_address}</div>
                                                                <div><span className="font-medium">User Agent:</span> {selectedLog.user_agent}</div>
                                                                <div><span className="font-medium">Details:</span> {selectedLog.details}</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </DialogContent>
                                        </Dialog>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminAudit;
