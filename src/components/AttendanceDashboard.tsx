
import React, { useState } from 'react';
import { Users, UserCheck, UserX, Clock, Calendar, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AttendanceCard from './AttendanceCard';

const AttendanceDashboard = () => {
  const [attendanceData] = useState([
    {
      id: '1',
      employeeName: 'John Doe',
      employeeId: 'GOV001',
      department: 'Ministry of Finance',
      checkInTime: '08:30 AM',
      checkOutTime: '05:15 PM',
      status: 'present' as const,
      location: 'Main Building, Floor 2'
    },
    {
      id: '2',
      employeeName: 'Jane Smith',
      employeeId: 'GOV002',
      department: 'Ministry of Health',
      checkInTime: '09:15 AM',
      status: 'late' as const,
      location: 'Annex Building, Floor 1'
    },
    {
      id: '3',
      employeeName: 'Michael Johnson',
      employeeId: 'GOV003',
      department: 'Ministry of Education',
      checkInTime: '08:00 AM',
      checkOutTime: '04:45 PM',
      status: 'present' as const,
      location: 'Main Building, Floor 3'
    }
  ]);

  const stats = {
    totalEmployees: 156,
    present: 142,
    late: 8,
    absent: 6
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">Total Employees</p>
                <p className="text-2xl font-bold text-blue-900">{stats.totalEmployees}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">Present</p>
                <p className="text-2xl font-bold text-green-900">{stats.present}</p>
              </div>
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-600 text-sm font-medium">Late</p>
                <p className="text-2xl font-bold text-yellow-900">{stats.late}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-600 text-sm font-medium">Absent</p>
                <p className="text-2xl font-bold text-red-900">{stats.absent}</p>
              </div>
              <UserX className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="today" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="today">Today's Attendance</TabsTrigger>
          <TabsTrigger value="week">This Week</TabsTrigger>
          <TabsTrigger value="month">This Month</TabsTrigger>
        </TabsList>
        
        <TabsContent value="today" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {attendanceData.map((record) => (
              <AttendanceCard key={record.id} record={record} />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="week">
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-gray-500">Weekly attendance data will be displayed here</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="month">
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-gray-500">Monthly attendance data will be displayed here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AttendanceDashboard;
