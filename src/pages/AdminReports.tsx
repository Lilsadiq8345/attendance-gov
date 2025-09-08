import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, Filter, TrendingUp, Users, Clock, BarChart3, PieChart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import { useToast } from '@/hooks/use-toast';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';

interface ReportData {
  summary: {
    total_employees: number;
    present_today: number;
    absent_today: number;
    late_today: number;
    on_leave_today: number;
    average_attendance_rate: number;
  };
  attendance_trend: Array<{
    date: string;
    present: number;
    absent: number;
    late: number;
    total: number;
  }>;
  department_stats: Array<{
    name: string;
    total_employees: number;
    present_today: number;
    absent_today: number;
    attendance_rate: number;
  }>;
  top_performers: Array<{
    name: string;
    short_id: string;
    department: string;
    attendance_rate: number;
    total_days: number;
    present_days: number;
  }>;
  late_arrivals: Array<{
    name: string;
    short_id: string;
    department: string;
    check_in_time: string;
    late_minutes: number;
    date: string;
  }>;
}

const AdminReports: React.FC = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [reportType, setReportType] = useState<'attendance' | 'performance' | 'analytics'>('attendance');
  const { toast } = useToast();
  const { token } = useAuth();

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  useEffect(() => {
    generateReport();
  }, [dateRange, startDate, endDate, selectedDepartment, token]);

  const generateReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('date_range', dateRange);
      if (startDate) params.append('start_date', startDate.toISOString().split('T')[0]);
      if (endDate) params.append('end_date', endDate.toISOString().split('T')[0]);
      if (selectedDepartment !== 'all') params.append('department', selectedDepartment);

      const res = await axios.get(`/api/admin/reports/?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      setReportData(res.data);
    } catch (error) {
      console.error('Error generating report:', error);
      toast({ title: 'Error', description: 'Failed to generate report', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const exportReport = (format: 'csv' | 'pdf' | 'excel') => {
    if (!reportData) return;

    let content = '';
    let filename = '';
    let mimeType = '';

    if (format === 'csv') {
      content = generateCSV();
      filename = `attendance-report-${new Date().toISOString().split('T')[0]}.csv`;
      mimeType = 'text/csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({ title: 'Success', description: `Report exported as ${format.toUpperCase()}` });
  };

  const generateCSV = () => {
    if (!reportData) return '';

    const csvRows = [
      ['Attendance Report', ''],
      ['Generated Date', new Date().toLocaleDateString()],
      ['Date Range', `${dateRange}`],
      [''],
      ['Summary'],
      ['Total Employees', reportData?.summary?.total_employees || 0],
      ['Present Today', reportData?.summary?.present_today || 0],
      ['Absent Today', reportData?.summary?.absent_today || 0],
      ['Late Today', reportData?.summary?.late_today || 0],
      ['Attendance Rate', `${reportData?.summary?.average_attendance_rate || 0}%`],
      [''],
      ['Department Statistics'],
      ['Department', 'Total Employees', 'Present', 'Absent', 'Attendance Rate'],
      ...(reportData?.department_stats || []).map(dept => [
        dept.name,
        dept.total_employees,
        dept.present_today,
        dept.absent_today,
        `${dept.attendance_rate}%`
      ])
    ];

    return csvRows.map(row => row.join(',')).join('\n');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Report Data</h3>
          <p className="text-gray-600 mb-4">Click "Generate Report" to create a new report</p>
          <Button onClick={generateReport}>Generate Report</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Generate comprehensive attendance reports and analytics</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportReport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => exportReport('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button onClick={generateReport}>
            <FileText className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Report Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRange === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setStartDate(new Date(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate?.toISOString().split('T')[0] || ''}
                    onChange={(e) => setEndDate(new Date(e.target.value))}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                  <SelectItem value="IT">IT</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Operations">Operations</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData?.summary?.total_employees || 0}</div>
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
                <div className="text-2xl font-bold text-green-600">{reportData?.summary?.present_today || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {reportData?.summary?.total_employees ? Math.round(((reportData.summary.present_today || 0) / reportData.summary.total_employees) * 100) : 0}% of total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Late Today</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{reportData?.summary?.late_today || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Arrived after start time
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{reportData?.summary?.average_attendance_rate || 0}%</div>
                <p className="text-xs text-muted-foreground">
                  Overall performance
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Reports Tabs */}
          <Tabs defaultValue="attendance" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="attendance">Attendance Overview</TabsTrigger>
              <TabsTrigger value="performance">Performance Analysis</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            {/* Attendance Overview */}
            <TabsContent value="attendance" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Attendance Trend Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Attendance Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={reportData?.attendance_trend || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="present" stroke="#00C49F" strokeWidth={2} name="Present" />
                        <Line type="monotone" dataKey="absent" stroke="#FF8042" strokeWidth={2} name="Absent" />
                        <Line type="monotone" dataKey="late" stroke="#FFBB28" strokeWidth={2} name="Late" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Department Performance */}
                <Card>
                  <CardHeader>
                    <CardTitle>Department Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={reportData?.department_stats || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="attendance_rate" fill="#0088FE" name="Attendance Rate %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Department Statistics Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Department Statistics</CardTitle>
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
                      {(reportData?.department_stats || []).map((dept) => (
                        <TableRow key={dept.name}>
                          <TableCell className="font-medium">{dept.name}</TableCell>
                          <TableCell>{dept.total_employees}</TableCell>
                          <TableCell className="text-green-600">{dept.present_today}</TableCell>
                          <TableCell className="text-red-600">{dept.absent_today}</TableCell>
                          <TableCell>
                            <Badge variant={dept.attendance_rate > 80 ? 'default' : 'secondary'}>
                              {dept.attendance_rate}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Performance Analysis */}
            <TabsContent value="performance" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Performers */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top Performers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Attendance Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(reportData?.top_performers || []).slice(0, 5).map((performer) => (
                          <TableRow key={performer.short_id}>
                            <TableCell className="font-medium">{performer.name}</TableCell>
                            <TableCell>{performer.department}</TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800">
                                {performer.attendance_rate}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Late Arrivals */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Late Arrivals</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Late (min)</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(reportData?.late_arrivals || []).slice(0, 5).map((late) => (
                          <TableRow key={`${late.short_id}-${late.date}`}>
                            <TableCell className="font-medium">{late.name}</TableCell>
                            <TableCell>{late.department}</TableCell>
                            <TableCell className="text-yellow-600">{late.late_minutes}</TableCell>
                            <TableCell>{new Date(late.date).toLocaleDateString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Analytics */}
            <TabsContent value="analytics" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Attendance Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Attendance Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <RechartsPieChart>
                        <Pie
                          data={[
                            { name: 'Present', value: reportData?.summary?.present_today || 0 },
                            { name: 'Absent', value: reportData?.summary?.absent_today || 0 },
                            { name: 'Late', value: reportData?.summary?.late_today || 0 }
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {[0, 1, 2].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Weekly Comparison */}
                <Card>
                  <CardHeader>
                    <CardTitle>Weekly Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={(reportData?.attendance_trend || []).slice(-7)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="present" fill="#00C49F" name="Present" />
                        <Bar dataKey="absent" fill="#FF8042" name="Absent" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

// Helper component for CheckCircle icon
const CheckCircle = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default AdminReports;
