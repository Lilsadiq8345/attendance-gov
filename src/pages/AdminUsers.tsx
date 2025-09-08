import React, { useEffect, useState } from 'react';
import { Search, Filter, MoreHorizontal, Edit, Trash2, Eye, UserPlus, Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';

interface User {
    id: string;
    full_name: string;
    short_id: string;
    nin: string;
    email: string;
    role: string;
    employment_status: string;
    department: string;
    position: string;
    hire_date: string;
    last_login?: string;
    is_active: boolean;
    biometric_registered: boolean;
    // optional media-related fields
    face_image_url?: string;
    photo?: string;
    avatar_url?: string;
}

const mediaBase = import.meta.env.VITE_MEDIA_BASE_URL || '/media/';
const resolveFaceUrl = (u: User): string | undefined => {
    if (u.face_image_url) return u.face_image_url;
    if (u.avatar_url) return u.avatar_url;
    if (u.photo) return `${mediaBase}${u.photo}`;
    return undefined;
};

const AdminUsers: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [departmentFilter, setDepartmentFilter] = useState<string>('all');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [showUserDetails, setShowUserDetails] = useState(false);
    const { toast } = useToast();

    const load = async () => {
        try {
            const res = await axios.get('/api/admin/users/');
            setUsers(res.data || []);
            setFilteredUsers(res.data || []);
        } catch (e) {
            // silent in realtime to avoid toast spam
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // realtime polling every 3s
        const t = setInterval(load, 3000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        filterUsers();
    }, [users, searchTerm, statusFilter, departmentFilter, roleFilter]);

    const filterUsers = () => {
        let filtered = users.filter(user => {
            const matchesSearch = user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.short_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesStatus = statusFilter === 'all' || user.employment_status === statusFilter;
            const matchesDepartment = departmentFilter === 'all' || user.department === departmentFilter;
            const matchesRole = roleFilter === 'all' || user.role === roleFilter;

            return matchesSearch && matchesStatus && matchesDepartment && matchesRole;
        });

        setFilteredUsers(filtered);
    };

    const handleUserAction = async (userId: string, action: string) => {
        try {
            await axios.post('/api/admin/users/', { user_id: userId, action });
            toast({ title: 'Success', description: `User ${action}ed successfully` });
            await load();
        } catch (error) {
            toast({ title: 'Error', description: `Failed to ${action} user`, variant: 'destructive' });
        }
    };

    const handleBulkAction = async (action: string) => {
        if (selectedUsers.length === 0) {
            toast({ title: 'No users selected', description: 'Please select users first', variant: 'destructive' });
            return;
        }

        try {
            for (const userId of selectedUsers) {
                await axios.post('/api/admin/users/', { user_id: userId, action });
            }
            toast({ title: 'Success', description: `Bulk ${action} completed` });
            setSelectedUsers([]);
            await load();
        } catch (error) {
            toast({ title: 'Error', description: `Failed to perform bulk ${action}`, variant: 'destructive' });
        }
    };

    const exportUsers = () => {
        const csvContent = [
            ['Name', 'ID', 'NIN', 'Email', 'Department', 'Position', 'Role', 'Status', 'Hire Date', 'Last Login', 'Biometric Status'],
            ...filteredUsers.map(user => [
                user.full_name,
                user.short_id,
                user.nin,
                user.email,
                user.department,
                user.position,
                user.role,
                user.employment_status,
                user.hire_date,
                user.last_login || 'Never',
                user.biometric_registered ? 'Registered' : 'Not Registered'
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, string> = {
            'active': 'bg-green-100 text-green-800',
            'suspended': 'bg-red-100 text-red-800',
            'terminated': 'bg-gray-100 text-gray-800',
            'on_leave': 'bg-yellow-100 text-yellow-800'
        };
        return <Badge className={variants[status] || 'bg-gray-100 text-gray-800'}>{status}</Badge>;
    };

    const getRoleBadge = (role: string) => {
        const variants: Record<string, string> = {
            'admin': 'bg-purple-100 text-purple-800',
            'manager': 'bg-blue-100 text-blue-800',
            'employee': 'bg-gray-100 text-gray-800'
        };
        return <Badge className={variants[role] || 'bg-gray-100 text-gray-800'}>{role}</Badge>;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">User Management</h1>
                    <p className="text-muted-foreground">Manage all system users and their permissions</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={exportUsers} variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                    <Button>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add User
                    </Button>
                </div>
            </div>

            {/* Filters and Search */}
            <Card>
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="suspended">Suspended</SelectItem>
                                <SelectItem value="terminated">Terminated</SelectItem>
                                <SelectItem value="on_leave">On Leave</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Department" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Departments</SelectItem>
                                <SelectItem value="HR">HR</SelectItem>
                                <SelectItem value="IT">IT</SelectItem>
                                <SelectItem value="Finance">Finance</SelectItem>
                                <SelectItem value="Operations">Operations</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Roles</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="manager">Manager</SelectItem>
                                <SelectItem value="employee">Employee</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Bulk Actions */}
            {selectedUsers.length > 0 && (
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                                {selectedUsers.length} user(s) selected
                            </span>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleBulkAction('activate')}
                                >
                                    Activate All
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleBulkAction('suspend')}
                                >
                                    Suspend All
                                </Button>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setSelectedUsers([])}
                                >
                                    Clear Selection
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Users Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Users ({filteredUsers.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">
                                    <Checkbox
                                        checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                setSelectedUsers(filteredUsers.map(u => u.id));
                                            } else {
                                                setSelectedUsers([]);
                                            }
                                        }}
                                    />
                                </TableHead>
                                <TableHead>Face</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>ID</TableHead>
                                <TableHead>Department</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Biometric</TableHead>
                                <TableHead>Last Login</TableHead>
                                <TableHead className="w-12">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.map(user => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        {resolveFaceUrl(user) ? (
                                            <img
                                                src={resolveFaceUrl(user)}
                                                alt={user.full_name}
                                                className="h-10 w-10 rounded-full object-cover border"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="h-10 w-10 rounded-full bg-gray-100 border" />)
                                        }
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        <div>
                                            <div>{user.full_name}</div>
                                            <div className="text-sm text-muted-foreground">{user.email}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell>{user.short_id}</TableCell>
                                    <TableCell>{user.department}</TableCell>
                                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                                    <TableCell>{getStatusBadge(user.employment_status)}</TableCell>
                                    <TableCell>
                                        <Badge variant={user.biometric_registered ? 'default' : 'secondary'}>
                                            {user.biometric_registered ? 'Registered' : 'Not Registered'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => {
                                                    setSelectedUser(user);
                                                    setShowUserDetails(true);
                                                }}>
                                                    <Eye className="h-4 w-4 mr-2" />
                                                    View Details
                                                </DropdownMenuItem>
                                                <DropdownMenuItem>
                                                    <Edit className="h-4 w-4 mr-2" />
                                                    Edit User
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => handleUserAction(user.id, 'activate')}
                                                    className="text-green-600"
                                                >
                                                    Activate
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => handleUserAction(user.id, 'suspend')}
                                                    className="text-yellow-600"
                                                >
                                                    Suspend
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    onClick={() => handleUserAction(user.id, 'terminate')}
                                                    className="text-red-600"
                                                >
                                                    Terminate
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* User Details Dialog */}
            <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>User Details</DialogTitle>
                        <DialogDescription>
                            Detailed information about {selectedUser?.full_name}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedUser && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="font-semibold mb-2">Personal Information</h4>
                                <div className="space-y-2 text-sm">
                                    <div><span className="font-medium">Name:</span> {selectedUser.full_name}</div>
                                    <div><span className="font-medium">Email:</span> {selectedUser.email}</div>
                                    <div><span className="font-medium">NIN:</span> {selectedUser.nin}</div>
                                    <div><span className="font-medium">Short ID:</span> {selectedUser.short_id}</div>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold mb-2">Employment Details</h4>
                                <div className="space-y-2 text-sm">
                                    <div><span className="font-medium">Department:</span> {selectedUser.department}</div>
                                    <div><span className="font-medium">Position:</span> {selectedUser.position}</div>
                                    <div><span className="font-medium">Role:</span> {getRoleBadge(selectedUser.role)}</div>
                                    <div><span className="font-medium">Status:</span> {getStatusBadge(selectedUser.employment_status)}</div>
                                    <div><span className="font-medium">Hire Date:</span> {new Date(selectedUser.hire_date).toLocaleDateString()}</div>
                                </div>
                            </div>
                            <div className="col-span-2">
                                <h4 className="font-semibold mb-2">System Information</h4>
                                <div className="space-y-2 text-sm">
                                    <div><span className="font-medium">Biometric Status:</span>
                                        <Badge variant={selectedUser.biometric_registered ? 'default' : 'secondary'} className="ml-2">
                                            {selectedUser.biometric_registered ? 'Registered' : 'Not Registered'}
                                        </Badge>
                                    </div>
                                    <div><span className="font-medium">Last Login:</span>
                                        {selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleString() : 'Never'}
                                    </div>
                                    <div><span className="font-medium">Account Active:</span>
                                        <Badge variant={selectedUser.is_active ? 'default' : 'secondary'} className="ml-2">
                                            {selectedUser.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminUsers;


