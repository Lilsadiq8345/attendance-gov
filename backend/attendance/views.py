from django.shortcuts import render
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.viewsets import ModelViewSet
from django.utils import timezone
from django.db.models import Q, Count
from datetime import datetime, timedelta
import uuid
import json

from .models import User, AttendanceRecord, BiometricVerificationSession
from django.conf import settings
from .biometric import verify_biometrics
from .serializers import (
    UserSerializer, AttendanceRecordSerializer, BiometricVerificationSessionSerializer,
    AttendanceWithBiometricSerializer, BiometricRegistrationSerializer,
    UserProfileUpdateSerializer, AdminUserSerializer
)

def convert_datetime_to_iso(obj):
    """Recursively convert datetime objects to ISO format strings for JSON serialization"""
    if isinstance(obj, dict):
        return {key: convert_datetime_to_iso(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_datetime_to_iso(item) for item in obj]
    elif isinstance(obj, datetime):
        return obj.isoformat()
    elif hasattr(obj, 'isoformat'):  # Handle date objects
        return obj.isoformat()
    else:
        return obj

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = request.data
        
        # Validate required fields
        required_fields = ['username', 'password', 'full_name', 'short_id', 'nin']
        missing_fields = [field for field in required_fields if not data.get(field)]
        
        if missing_fields:
            return Response({
                'error': f'Missing required fields: {", ".join(missing_fields)}'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if username already exists
        if User.objects.filter(username=data['username']).exists():
            return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if NIN already registered
        if User.objects.filter(nin=data['nin']).exists():
            return Response({'error': 'NIN already registered'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if short_id already exists
        if User.objects.filter(short_id=data['short_id']).exists():
            return Response({'error': 'Short ID already exists'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.create_user(
                username=data['username'],
                password=data['password'],
                full_name=data['full_name'],
                short_id=data['short_id'],
                nin=data['nin'],
                email=data.get('email', ''),
                phone=data.get('phone', ''),
                department=data.get('department', ''),
                position=data.get('position', ''),
                office_location=data.get('office_location', ''),
                staff_id=data.get('staff_id', ''),
                employee_id=data.get('employee_id', ''),
            )
            return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({
                'error': f'Error creating user: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class UserDetailView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return UserProfileUpdateSerializer
        return UserSerializer
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        if self.request.method in ['PUT', 'PATCH']:
            context['instance'] = self.get_object()
        return context

class BiometricRegistrationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Register biometric data for user"""
        serializer = BiometricRegistrationSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = request.user
            data = serializer.validated_data
            
            # Clean biometric data to ensure JSON serialization
            biometric_data = convert_datetime_to_iso(data['biometric_data'])
            
            # Store biometric data
            if data['verification_type'] in ['face', 'both']:
                # Keep only face-related vectors
                user.face_biometric_data = {
                    'face_features': biometric_data.get('face_features', [])
                }
                user.face_verification_date = timezone.now()
            
            if data['verification_type'] in ['ear', 'both']:
                # Support unified and left/right ear vectors
                user.ear_biometric_data = {
                    'ear_features': biometric_data.get('ear_features', []),
                    'ear_left_features': biometric_data.get('ear_left_features', []),
                    'ear_right_features': biometric_data.get('ear_right_features', []),
                }
                user.ear_verification_date = timezone.now()
            
            # Update verification status
            user.update_biometric_status()
            user.is_verified = True
            user.onboarding_completed = True
            user.save()
            
            return Response({
                'message': 'Biometric registration successful',
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class BiometricVerificationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Verify biometric data for attendance"""
        user = request.user
        
        # Check if user has biometric data
        if not user.face_biometric_data and not user.ear_biometric_data:
            return Response({
                'error': 'No biometric data registered. Please complete biometric registration first.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create verification session
        session_id = str(uuid.uuid4())
        session = BiometricVerificationSession.objects.create(
            user=user,
            session_id=session_id,
            verification_type='both' if user.face_biometric_data and user.ear_biometric_data else 'face',
            status='in_progress'
        )
        
        return Response({
            'session_id': session_id,
            'verification_type': session.verification_type,
            'max_attempts': session.max_attempts
        }, status=status.HTTP_200_OK)

class AttendanceWithBiometricView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Mark attendance with biometric verification"""
        serializer = AttendanceWithBiometricSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = request.user
            data = serializer.validated_data
            
            # Server-side verification of biometric feature vectors when provided
            biometric_probe = (data.get('biometric_data') or {})
            user_bio = {
                'face_features': (user.face_biometric_data or {}).get('face_features') if isinstance(user.face_biometric_data, dict) else None,
                'ear_features': (user.ear_biometric_data or {}).get('ear_features') if isinstance(user.ear_biometric_data, dict) else None,
                'ear_left_features': (user.ear_biometric_data or {}).get('ear_left_features') if isinstance(user.ear_biometric_data, dict) else None,
                'ear_right_features': (user.ear_biometric_data or {}).get('ear_right_features') if isinstance(user.ear_biometric_data, dict) else None,
            }

            if biometric_probe:
                thresholds = verify_biometrics(
                    user_biometric_data=user_bio,
                    probe_biometric_data=biometric_probe,
                    face_threshold=float(getattr(settings, 'FACE_RECOGNITION_TOLERANCE', getattr(settings, 'MIN_CONFIDENCE_THRESHOLD', 0.8))),
                    ear_threshold=float(getattr(settings, 'EAR_RECOGNITION_TOLERANCE', getattr(settings, 'MIN_CONFIDENCE_THRESHOLD', 0.8))),
                )
                # Enforce server-computed results; ignore client booleans when vectors provided
                data['face_verified'] = thresholds['face_verified']
                data['ear_verified'] = thresholds['ear_verified']
                data['face_confidence'] = thresholds['face_confidence']
                data['ear_confidence'] = thresholds['ear_confidence']

            # Determine verification method
            if data['face_verified'] and data['ear_verified']:
                verification_method = 'both'
            elif data['face_verified']:
                verification_method = 'face_only'
            elif data['ear_verified']:
                verification_method = 'ear_only'
            else:
                verification_method = 'manual'
            
            # Clean biometric_data to ensure JSON serialization
            biometric_data = data.get('biometric_data')
            if biometric_data:
                biometric_data = convert_datetime_to_iso(biometric_data)
            
            # Create attendance record
            attendance = AttendanceRecord.objects.create(
                user=user,
                attendance_type=data['attendance_type'],
                face_verified=data['face_verified'],
                ear_verified=data['ear_verified'],
                face_confidence=data.get('face_confidence'),
                ear_confidence=data.get('ear_confidence'),
                biometric_data=biometric_data,
                location=data.get('location'),
                device_info=data.get('device_info'),
                verification_method=verification_method,
                notes=data.get('notes')
            )
            
            # Determine status based on time
            current_time = timezone.now().time()
            work_start_str = getattr(settings, 'WORK_START_TIME', '09:00')
            try:
                work_start_time = datetime.strptime(work_start_str, '%H:%M').time()
            except Exception:
                work_start_time = datetime.strptime('09:00', '%H:%M').time()
            if current_time > work_start_time and data['attendance_type'] == 'check_in':
                attendance.status = 'late'
            else:
                attendance.status = 'present'
            attendance.save()
            
            return Response({
                'message': f'Attendance {data["attendance_type"].replace("_", " ")} marked successfully',
                'attendance': AttendanceRecordSerializer(attendance).data
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class AttendanceRecordViewSet(ModelViewSet):
    serializer_class = AttendanceRecordSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return AttendanceRecord.objects.all()
        return AttendanceRecord.objects.filter(user=user)

    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get today's attendance records"""
        today = timezone.now().date()
        records = self.get_queryset().filter(timestamp__date=today)
        return Response(AttendanceRecordSerializer(records, many=True).data)

    @action(detail=False, methods=['get'])
    def weekly(self, request):
        """Get weekly attendance summary"""
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=7)
        
        records = self.get_queryset().filter(
            timestamp__date__range=[start_date, end_date]
        )
        
        summary = {
            'total_days': 7,
            'present_days': records.filter(status='present').count(),
            'late_days': records.filter(status='late').count(),
            'absent_days': 7 - records.count(),
            'records': AttendanceRecordSerializer(records, many=True).data
        }
        
        return Response(summary)

    @action(detail=False, methods=['get'])
    def monthly(self, request):
        """Get monthly attendance summary"""
        end_date = timezone.now().date()
        start_date = end_date.replace(day=1)
        
        records = self.get_queryset().filter(
            timestamp__date__range=[start_date, end_date]
        )
        
        summary = {
            'month': start_date.strftime('%B %Y'),
            'total_days': end_date.day,
            'present_days': records.filter(status='present').count(),
            'late_days': records.filter(status='late').count(),
            'absent_days': end_date.day - records.count(),
            'records': AttendanceRecordSerializer(records, many=True).data
        }
        
        return Response(summary)

class AdminDashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get admin dashboard data"""
        if request.user.role != 'admin':
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
        
        today = timezone.now().date()
        
        # Today's attendance summary
        today_attendance = AttendanceRecord.objects.filter(timestamp__date=today)
        total_employees = User.objects.filter(role='user', employment_status='active').count()
        
        summary = {
            'total_employees': total_employees,
            'checked_in_today': today_attendance.filter(attendance_type='check_in').count(),
            'checked_out_today': today_attendance.filter(attendance_type='check_out').count(),
            'late_today': today_attendance.filter(status='late').count(),
            'absent_today': total_employees - today_attendance.filter(attendance_type='check_in').count(),
            'biometric_verified_today': today_attendance.filter(
                Q(face_verified=True) | Q(ear_verified=True)
            ).count(),
        }
        
        # Recent attendance records with user details
        recent_records = []
        for record in AttendanceRecord.objects.select_related('user').order_by('-timestamp')[:10]:
            user = record.user
            recent_records.append({
                'id': record.id,
                'check_in_time': record.timestamp.isoformat(),
                'check_out_time': None,  # Will be updated if check-out exists
                'location': record.location or 'N/A',
                'user_id': user.id,
                'full_name': user.full_name,
                'short_id': user.short_id,
                'email': user.email,
                'department': user.department or 'N/A',
                'total_hours': None,  # Will be calculated if check-out exists
                'status': record.status
            })
            
            # If this is a check-out, find the corresponding check-in and update
            if record.attendance_type == 'check_out':
                check_in = AttendanceRecord.objects.filter(
                    user=user,
                    attendance_type='check_in',
                    timestamp__date=record.timestamp.date()
                ).first()
                if check_in:
                    # Find the record in recent_records and update it
                    for rec in recent_records:
                        if rec['user_id'] == user.id and rec['check_in_time'] == check_in.timestamp.isoformat():
                            rec['check_out_time'] = record.timestamp.isoformat()
                            # Calculate total hours
                            duration = record.timestamp - check_in.timestamp
                            rec['total_hours'] = round(duration.total_seconds() / 3600, 2)
                            break
        
        # Department-wise attendance
        departments = []
        for user in User.objects.filter(role='user', employment_status='active'):
            dept = user.department or 'Unknown'
            existing_dept = next((d for d in departments if d['name'] == dept), None)

            if existing_dept:
                existing_dept['count'] += 1
                if today_attendance.filter(user=user, attendance_type='check_in').exists():
                    existing_dept['present'] += 1
                else:
                    existing_dept['absent'] += 1
            else:
                present = 1 if today_attendance.filter(user=user, attendance_type='check_in').exists() else 0
                departments.append({
                    'name': dept,
                    'count': 1,
                    'present': present,
                    'absent': 1 - present
                })
        
        # Attendance trend (last 7 days)
        attendance_trend = []
        for i in range(7):
            date = today - timedelta(days=i)
            day_records = AttendanceRecord.objects.filter(timestamp__date=date)
            day_present = day_records.filter(attendance_type='check_in').values('user').distinct().count()
            day_absent = total_employees - day_present
            day_late = day_records.filter(
                attendance_type='check_in',
                status='late'
            ).count()
            
            attendance_trend.append({
                'date': date.strftime('%Y-%m-%d'),
                'present': day_present,
                'absent': day_absent,
                'late': day_late
            })
        
        attendance_trend.reverse()  # Oldest to newest
        
        return Response({
            'summary': summary,
            'recent_records': recent_records,
            'departments': departments,
            'attendance_trend': attendance_trend
        })

class AdminUserManagementView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get all users for admin management"""
        if request.user.role != 'admin':
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
        
        users = User.objects.filter(role='user').order_by('-date_joined')
        return Response(AdminUserSerializer(users, many=True).data)

    def post(self, request):
        """Update user status"""
        if request.user.role != 'admin':
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
        
        user_id = request.data.get('user_id')
        action = request.data.get('action')
        
        try:
            user = User.objects.get(id=user_id)
            
            if action == 'activate':
                user.employment_status = 'active'
            elif action == 'suspend':
                user.employment_status = 'suspended'
            elif action == 'terminate':
                user.employment_status = 'terminated'
            
            user.save()
            
            return Response({
                'message': f'User {action}ed successfully',
                'user': AdminUserSerializer(user).data
            })
        
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

class BiometricSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, session_id):
        """Get biometric verification session"""
        try:
            session = BiometricVerificationSession.objects.get(
                session_id=session_id,
                user=request.user
            )
            return Response(BiometricVerificationSessionSerializer(session).data)
        except BiometricVerificationSession.DoesNotExist:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request, session_id):
        """Update biometric verification session"""
        try:
            session = BiometricVerificationSession.objects.get(
                session_id=session_id,
                user=request.user
            )
            
            if session.is_expired():
                session.status = 'expired'
                session.save()
                return Response({'error': 'Session expired'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Update session data
            session.session_data = request.data.get('session_data', session.session_data)
            session.attempts = request.data.get('attempts', session.attempts)
            session.status = request.data.get('status', session.status)
            
            if session.status in ['completed', 'failed']:
                session.completed_at = timezone.now()
            
            session.save()
            
            return Response(BiometricVerificationSessionSerializer(session).data)
        
        except BiometricVerificationSession.DoesNotExist:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)

class AdminReportsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get admin reports and analytics"""
        if request.user.role != 'admin':
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
        
        date_range = request.query_params.get('date_range', 'today')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        department = request.query_params.get('department')
        
        # Calculate date range
        today = timezone.now().date()
        if date_range == 'week':
            start_date = today - timedelta(days=7)
            end_date = today
        elif date_range == 'month':
            start_date = today - timedelta(days=30)
            end_date = today
        else:  # today
            start_date = today
            end_date = today
        
        # Filter users by department if specified
        user_filter = Q(role='user', employment_status='active')
        if department and department != 'all':
            user_filter &= Q(department=department)
        
        users = User.objects.filter(user_filter)
        
        # Get attendance data for the period
        attendance_records = AttendanceRecord.objects.filter(
            timestamp__date__range=[start_date, end_date],
            user__in=users
        )
        
        # Calculate statistics
        total_employees = users.count()
        present_count = attendance_records.filter(attendance_type='check_in').values('user').distinct().count()
        absent_count = total_employees - present_count
        late_count = attendance_records.filter(
            attendance_type='check_in',
            timestamp__hour__gte=9  # Late if after 9 AM
        ).count()
        
        # Department breakdown
        dept_stats = []
        for dept in users.values_list('department', flat=True).distinct():
            if dept:
                dept_users = users.filter(department=dept)
                dept_present = attendance_records.filter(
                    user__in=dept_users,
                    attendance_type='check_in',
                    timestamp__date__range=[start_date, end_date]
                ).values('user').distinct().count()
                dept_stats.append({
                    'name': dept,
                    'count': dept_users.count(),
                    'present': dept_present,
                    'absent': dept_users.count() - dept_present
                })
        
        # Attendance trend (last 7 days)
        trend_data = []
        for i in range(7):
            date = today - timedelta(days=i)
            day_records = attendance_records.filter(timestamp__date=date)
            day_present = day_records.filter(attendance_type='check_in').values('user').distinct().count()
            day_absent = total_employees - day_present
            day_late = day_records.filter(
                attendance_type='check_in',
                timestamp__hour__gte=9
            ).count()
            
            trend_data.append({
                'date': date.strftime('%Y-%m-%d'),
                'present': day_present,
                'absent': day_absent,
                'late': day_late
            })
        
        trend_data.reverse()  # Oldest to newest
        
        return Response({
            'summary': {
                'total_employees': total_employees,
                'present_today': present_count,
                'absent_today': absent_count,
                'late_today': late_count,
                'average_attendance_rate': round((present_count / total_employees * 100), 2) if total_employees > 0 else 0
            },
            'department_stats': dept_stats,
            'attendance_trend': trend_data,
            'date_range': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            }
        })


class AdminSettingsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get system settings"""
        if request.user.role != 'admin':
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
        
        # Return default settings (in a real app, these would come from a Settings model)
        settings = {
            'biometric': {
                'face_threshold': 0.8,
                'ear_threshold': 0.7,
                'max_attempts': 3,
                'session_timeout': 300
            },
            'attendance': {
                'work_start_time': '09:00',
                'work_end_time': '17:00',
                'late_threshold': '09:15',
                'overtime_threshold': '17:00'
            },
            'security': {
                'password_min_length': 8,
                'session_timeout': 3600,
                'max_login_attempts': 5,
                'lockout_duration': 900
            },
            'notifications': {
                'email_notifications': True,
                'sms_notifications': False,
                'push_notifications': True
            }
        }
        
        return Response(settings)

    def post(self, request):
        """Update system settings"""
        if request.user.role != 'admin':
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
        
        # In a real app, this would update a Settings model
        # For now, just return success
        return Response({
            'message': 'Settings updated successfully',
            'settings': request.data
        })


class AdminAuditLogsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get audit logs"""
        if request.user.role != 'admin':
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get query parameters
        search = request.query_params.get('search', '')
        action_type = request.query_params.get('action_type', '')
        status = request.query_params.get('status', '')
        user_id = request.query_params.get('user', '')
        start_date = request.query_params.get('start_date', '')
        end_date = request.query_params.get('end_date', '')
        
        # In a real app, this would query an AuditLog model
        # For now, return mock data that matches frontend expectations
        mock_logs = [
            {
                'id': 1,
                'timestamp': timezone.now().isoformat(),
                'user_name': 'admin',
                'user_email': 'admin@example.com',
                'action': 'User Login',
                'action_type': 'login',
                'resource_name': 'Authentication System',
                'status': 'success',
                'ip_address': '127.0.0.1',
                'department': 'IT',
                'role': 'admin',
                'user_id': 1
            },
            {
                'id': 2,
                'timestamp': (timezone.now() - timedelta(hours=1)).isoformat(),
                'user_name': 'testuser',
                'user_email': 'testuser@example.com',
                'action': 'Attendance Mark',
                'action_type': 'create',
                'resource_name': 'Attendance System',
                'status': 'success',
                'ip_address': '127.0.0.1',
                'department': 'HR',
                'role': 'user',
                'user_id': 2
            },
            {
                'id': 3,
                'timestamp': (timezone.now() - timedelta(hours=2)).isoformat(),
                'user_name': 'testuser2',
                'user_email': 'testuser2@example.com',
                'action': 'Biometric Verification',
                'action_type': 'system',
                'resource_name': 'Biometric System',
                'status': 'success',
                'ip_address': '127.0.0.1',
                'department': 'Finance',
                'role': 'user',
                'user_id': 3
            }
        ]
        
        # Apply filters (mock implementation)
        filtered_logs = mock_logs
        if search:
            filtered_logs = [log for log in filtered_logs if search.lower() in log['details'].lower()]
        if action_type:
            filtered_logs = [log for log in filtered_logs if log['action'] == action_type]
        if status:
            filtered_logs = [log for log in filtered_logs if log['status'] == status]
        
        return Response({
            'logs': filtered_logs,
            'total': len(filtered_logs),
            'filters': {
                'search': search,
                'action_type': action_type,
                'status': status,
                'user': user_id,
                'start_date': start_date,
                'end_date': end_date
            }
        })


class AdminAuditSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Get audit summary statistics"""
        if request.user.role != 'admin':
            return Response({'error': 'Admin access required'}, status=status.HTTP_403_FORBIDDEN)
        
        # In a real app, this would aggregate data from AuditLog model
        # For now, return mock summary that matches frontend expectations
        summary = {
            'total_logs': 1250,
            'today_logs': 45,
            'successful_actions': 1180,
            'failed_actions': 70,
            'top_actions': [
                {'action': 'User Login', 'count': 450},
                {'action': 'Attendance Mark', 'count': 320},
                {'action': 'Biometric Verification', 'count': 280},
                {'action': 'User Update', 'count': 120}
            ],
            'top_users': [
                {'user': 'admin', 'actions': 180},
                {'user': 'testuser', 'actions': 95},
                {'user': 'testuser2', 'actions': 87}
            ],
            'recent_activity': [
                {
                    'timestamp': timezone.now().isoformat(),
                    'action': 'User Login',
                    'user': 'admin',
                    'status': 'success'
                },
                {
                    'timestamp': (timezone.now() - timedelta(minutes=5)).isoformat(),
                    'action': 'Settings Update',
                    'user': 'admin',
                    'status': 'success'
                }
            ]
        }
        
        return Response(summary)
