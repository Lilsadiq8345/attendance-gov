
import React from 'react';
import { Clock, Calendar, MapPin, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface AttendanceRecord {
  id: string;
  employeeName: string;
  employeeId: string;
  department: string;
  checkInTime: string;
  checkOutTime?: string;
  status: 'present' | 'late' | 'absent';
  location: string;
}

interface AttendanceCardProps {
  record: AttendanceRecord;
}

const AttendanceCard: React.FC<AttendanceCardProps> = ({ record }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'absent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            {record.employeeName}
          </CardTitle>
          <Badge className={getStatusColor(record.status)}>
            {record.status.toUpperCase()}
          </Badge>
        </div>
        <p className="text-sm text-gray-600">ID: {record.employeeId} • {record.department}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-green-600" />
          <span>Check In: {record.checkInTime}</span>
        </div>
        {record.checkOutTime && (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-red-600" />
            <span>Check Out: {record.checkOutTime}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="h-4 w-4" />
          <span>{record.location}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendanceCard;
