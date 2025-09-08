import React, { useState, useEffect } from 'react';
import { Users, Clock, Calendar, TrendingUp, AlertTriangle, CheckCircle, XCircle, Building } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface AttendanceRecord {
  id: string;
  check_in_time: string;
  location: string;
  user_id: string;
  full_name?: string;
  short_id?: string;
  email?: string;
  department?: string;
  check_out_time?: string;
  total_hours?: number;
}

interface DashboardSummary {
  total_employees: number;
  checked_in_today: number;
  checked_out_today: number;
  late_today: number;
  absent_today: number;
  biometric_verified_today: number;
  departments: {
    name: string;
    count: number;
    present: number;
    absent: number;
  }[];
  attendance_trend: {
    date: string;
    present: number;
    absent: number;
    late: number;
  }[];
}

const AdminDashboard: React.FC = () => {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('today');
  const { token } = useAuth();

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  useEffect(() => {
    if (token) {
      fetchAttendanceData();
      fetchSummary();
    }
  }, [token, selectedDepartment, dateRange]);

  const fetchAttendanceData = async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (selectedDepartment !== 'all') params.append('department', selectedDepartment);
      if (dateRange !== 'today') params.append('date_range', dateRange);

      const res = await axios.get(`/api/attendance/?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Ensure we always set an array, even if the API returns unexpected data
      if (Array.isArray(res.data)) {
        setAttendanceRecords(res.data);
      } else if (res.data && Array.isArray(res.data.results)) {
        setAttendanceRecords(res.data.results);
      } else if (res.data && Array.isArray(res.data.data)) {
        setAttendanceRecords(res.data.data);
      } else {
        console.warn('Unexpected attendance data format:', res.data);
        setAttendanceRecords([]);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
      setError('Failed to fetch attendance data');
      setAttendanceRecords([]);
    }
  };

  const fetchSummary = async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (selectedDepartment !== 'all') params.append('department', selectedDepartment);
      if (dateRange !== 'today') params.append('date_range', dateRange);

      const res = await axios.get(`/api/admin/dashboard/?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.data && res.data.summary) {
        setSummary(res.data.summary);
      } else if (res.data) {
        setSummary(res.data);
      } else {
        setSummary(null);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
      setError('Failed to fetch dashboard summary');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    // Ensure attendanceRecords is an array before calling map
    if (!Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
      console.warn('No attendance records to export');
      return;
    }

    const csvContent = [
      ['Name', 'ID', 'Email', 'Department', 'Check In Time', 'Check Out Time', 'Total Hours', 'Location', 'Status'],
      ...attendanceRecords.map(record => [
        record.full_name || 'N/A',
        record.short_id || 'N/A',
        record.email || 'N/A',
        record.department || 'N/A',
        new Date(record.check_in_time).toLocaleString(),
        record.check_out_time ? new Date(record.check_out_time).toLocaleString() : 'N/A',
        record.total_hours || 'N/A',
        record.location || 'N/A',
        record.check_out_time ? 'Checked Out' : 'Present'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (record: AttendanceRecord) => {
    if (record.check_out_time) {
      return <Badge className="bg-blue-100 text-blue-800">Checked Out</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800">Present</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Dashboard</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => { setError(null); fetchAttendanceData(); fetchSummary(); }}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Ensure attendanceRecords is always an array for safe operations
  const safeAttendanceRecords = Array.isArray(attendanceRecords) ? attendanceRecords : [];

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {summary?.departments?.map(dept => (
              <SelectItem key={dept.name} value={dept.name}>{dept.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select Date Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={exportData} className="ml-auto" disabled={safeAttendanceRecords.length === 0}>
          Export CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.total_employees ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              Across all departments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary?.checked_in_today ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              {summary ? Math.round((summary.checked_in_today / summary.total_employees) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Late Today</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{summary?.late_today ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              Arrived after 9:00 AM
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{summary?.absent_today ?? 0}</div>
            <p className="text-xs text-muted-foreground">
              No check-in recorded
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="attendance">Attendance Trends</TabsTrigger>
          <TabsTrigger value="departments">Department Stats</TabsTrigger>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Department Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={summary?.departments || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {(summary?.departments || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Attendance Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Weekly Attendance Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={summary?.attendance_trend || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="present" stroke="#00C49F" strokeWidth={2} />
                    <Line type="monotone" dataKey="absent" stroke="#FF8042" strokeWidth={2} />
                    <Line type="monotone" dataKey="late" stroke="#FFBB28" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Attendance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={summary?.attendance_trend || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="present" fill="#00C49F" name="Present" />
                  <Bar dataKey="absent" fill="#FF8042" name="Absent" />
                  <Bar dataKey="late" fill="#FFBB28" name="Late" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Department Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Total Employees</TableHead>
                    <TableHead>Present Today</TableHead>
                    <TableHead>Absent Today</TableHead>
                    <TableHead>Attendance Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary?.departments?.map((dept) => (
                    <TableRow key={dept.name}>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell>{dept.count}</TableCell>
                      <TableCell className="text-green-600">{dept.present}</TableCell>
                      <TableCell className="text-red-600">{dept.absent}</TableCell>
                      <TableCell>
                        <Badge variant={dept.present / dept.count > 0.8 ? 'default' : 'secondary'}>
                          {Math.round((dept.present / dept.count) * 100)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Attendance Records</CardTitle>
            </CardHeader>
            <CardContent>
              {safeAttendanceRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No attendance records found for the selected criteria.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Check In Time</TableHead>
                      <TableHead>Check Out Time</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {safeAttendanceRecords.slice(0, 10).map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {record.full_name || 'N/A'}
                        </TableCell>
                        <TableCell>{record.short_id || 'N/A'}</TableCell>
                        <TableCell>{record.department || 'N/A'}</TableCell>
                        <TableCell>
                          {new Date(record.check_in_time).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {record.check_out_time ? new Date(record.check_out_time).toLocaleString() : 'N/A'}
                        </TableCell>
                        <TableCell>{record.total_hours || 'N/A'}</TableCell>
                        <TableCell>{record.location || 'N/A'}</TableCell>
                        <TableCell>
                          {getStatusBadge(record)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
