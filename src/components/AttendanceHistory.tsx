import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Search, Filter, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';

interface AttendanceRecord {
    id: number;
    timestamp: string;
    attendance_type: 'check_in' | 'check_out' | 'break_start' | 'break_end';
    status: 'present' | 'late' | 'absent' | 'half_day' | 'on_leave';
    verification_method: 'face_only' | 'ear_only' | 'both' | 'manual';
    face_verified: boolean;
    ear_verified: boolean;
    face_confidence?: number | null;
    ear_confidence?: number | null;
}

const AttendanceHistory: React.FC = () => {
    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterMonth, setFilterMonth] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const { token } = useAuth();
    const { toast } = useToast();

    useEffect(() => {
        if (token) {
            fetchAttendanceHistory();
        }
    }, [token]);

    const fetchAttendanceHistory = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/attendance/', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = res.data;
            const rows: AttendanceRecord[] = Array.isArray(data)
                ? data
                : Array.isArray(data?.results)
                    ? data.results
                    : [];
            setRecords(rows);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to load attendance history",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const filteredRecords = records.filter(record => {
        const timeStr = record.timestamp || '';
        const matchesSearch = timeStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (record.verification_method || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesMonth = filterMonth === 'all' || new Date(timeStr).getMonth() === parseInt(filterMonth);
        const matchesStatus = filterStatus === 'all' || filterStatus === record.status;
        return matchesSearch && matchesMonth && matchesStatus;
    });

    const exportToCSV = () => {
        const headers = ['Date', 'Time', 'Type', 'Method', 'Face Conf', 'Ear Conf', 'Status'];
        const csvData = filteredRecords.map(record => [
            new Date(record.timestamp).toLocaleDateString(),
            new Date(record.timestamp).toLocaleTimeString(),
            record.attendance_type,
            record.verification_method || 'N/A',
            record.face_confidence != null ? `${(record.face_confidence * 100).toFixed(1)}%` : 'N/A',
            record.ear_confidence != null ? `${(record.ear_confidence * 100).toFixed(1)}%` : 'N/A',
            record.status
        ]);
        const csvContent = [headers, ...csvData]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_history_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast({
            title: "Success",
            description: "Attendance history exported successfully!"
        });
    };

    const getMonthOptions = () => {
        const months = [
            { value: 'all', label: 'All Months' },
            { value: '0', label: 'January' },
            { value: '1', label: 'February' },
            { value: '2', label: 'March' },
            { value: '3', label: 'April' },
            { value: '4', label: 'May' },
            { value: '5', label: 'June' },
            { value: '6', label: 'July' },
            { value: '7', label: 'August' },
            { value: '8', label: 'September' },
            { value: '9', label: 'October' },
            { value: '10', label: 'November' },
            { value: '11', label: 'December' }
        ];
        return months;
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                        <div className="space-y-2">
                            <div className="h-4 bg-gray-200 rounded"></div>
                            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Attendance History
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Filters and Search */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <Input
                                placeholder="Search by date or method..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Select value={filterMonth} onValueChange={setFilterMonth}>
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder="Month" />
                            </SelectTrigger>
                            <SelectContent>
                                {getMonthOptions().map(month => (
                                    <SelectItem key={month.value} value={month.value}>
                                        {month.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-32">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="present">Present</SelectItem>
                                <SelectItem value="late">Late</SelectItem>
                                <SelectItem value="absent">Absent</SelectItem>
                                <SelectItem value="half_day">Half Day</SelectItem>
                                <SelectItem value="on_leave">On Leave</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button onClick={exportToCSV} variant="outline" size="sm">
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                    </div>
                </div>

                {/* Records Count */}
                <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                        Showing {filteredRecords.length} of {records.length} records
                    </p>
                    <Badge variant="secondary">
                        Total: {records.length}
                    </Badge>
                </div>

                {/* Attendance Records */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                    {filteredRecords.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p>No attendance records found</p>
                            <p className="text-sm">Try adjusting your filters or search terms</p>
                        </div>
                    ) : (
                        filteredRecords.map((record) => (
                            <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                                <div className="flex items-center gap-4">
                                    <div className="text-center">
                                        <div className="text-lg font-semibold">
                                            {new Date(record.timestamp).getDate()}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {new Date(record.timestamp).toLocaleDateString('en-US', { month: 'short' })}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-medium">
                                            {new Date(record.timestamp).toLocaleDateString()}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            {record.attendance_type.replace('_', ' ')} • {new Date(record.timestamp).toLocaleTimeString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline">{record.status}</Badge>
                                    {record.face_confidence != null && (
                                        <Badge variant="outline">Face {(record.face_confidence * 100).toFixed(0)}%</Badge>
                                    )}
                                    {record.ear_confidence != null && (
                                        <Badge variant="outline">Ear {(record.ear_confidence * 100).toFixed(0)}%</Badge>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default AttendanceHistory; 