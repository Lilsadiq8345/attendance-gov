from rest_framework import serializers
from .models import User, AttendanceRecord, BiometricVerificationSession
from django.utils import timezone
import json

class UserSerializer(serializers.ModelSerializer):
    biometric_status = serializers.SerializerMethodField()
    attendance_today = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        exclude = ['password']
        read_only_fields = ['date_joined', 'last_login', 'is_superuser', 'is_staff']
    
    def get_attendance_today(self, obj):
        """Get today's attendance status"""
        today = timezone.now().date()
        today_records = obj.attendance_records.filter(
            timestamp__date=today
        ).order_by('timestamp')
        
        if not today_records.exists():
            return {'status': 'not_marked', 'check_in': None, 'check_out': None}
        
        check_in = today_records.filter(attendance_type='check_in').first()
        check_out = today_records.filter(attendance_type='check_out').first()
        
        return {
            'status': 'marked' if check_in else 'not_marked',
            'check_in': check_in.timestamp if check_in else None,
            'check_out': check_out.timestamp if check_out else None,
            'face_verified': check_in.face_verified if check_in else False,
            'ear_verified': check_in.ear_verified if check_in else False,
        }

    def get_biometric_status(self, obj):
        return obj.get_biometric_status()

class BiometricDataSerializer(serializers.Serializer):
    """Serializer for biometric data validation"""
    face_features = serializers.ListField(
        child=serializers.FloatField(),
        required=False,
        allow_empty=True
    )
    ear_features = serializers.ListField(
        child=serializers.FloatField(),
        required=False,
        allow_empty=True
    )
    ear_left_features = serializers.ListField(
        child=serializers.FloatField(),
        required=False,
        allow_empty=True
    )
    ear_right_features = serializers.ListField(
        child=serializers.FloatField(),
        required=False,
        allow_empty=True
    )
    confidence = serializers.FloatField(min_value=0.0, max_value=1.0)
    timestamp = serializers.CharField()  # Accept string timestamp to avoid JSON serialization issues
    verification_type = serializers.ChoiceField(choices=['face', 'ear', 'both'])
    
    def validate_confidence(self, value):
        """Validate confidence score"""
        if value < 0.5:
            raise serializers.ValidationError("Confidence score must be at least 0.5")
        return value

class AttendanceRecordSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    user_short_id = serializers.CharField(source='user.short_id', read_only=True)
    verification_status = serializers.SerializerMethodField()
    
    class Meta:
        model = AttendanceRecord
        fields = '__all__' 
        read_only_fields = ['user', 'timestamp', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Validate attendance record data"""
        user = self.context['request'].user
        
        # Check if user is verified
        if not user.is_verified:
            raise serializers.ValidationError("User must be verified before marking attendance")
        
        # Check for duplicate attendance on same day
        today = timezone.now().date()
        existing_record = AttendanceRecord.objects.filter(
            user=user,
            attendance_type=data['attendance_type'],
            timestamp__date=today
        ).first()
        
        if existing_record:
            raise serializers.ValidationError(
                f"{data['attendance_type'].replace('_', ' ').title()} already marked for today"
            )
        
        # Validate check-out can only be after check-in
        if data['attendance_type'] == 'check_out':
            check_in = AttendanceRecord.objects.filter(
                user=user,
                attendance_type='check_in',
                timestamp__date=today
            ).first()
            
            if not check_in:
                raise serializers.ValidationError("Must check in before checking out")
        
        return data

    def get_verification_status(self, obj):
        return obj.get_verification_status()

class BiometricVerificationSessionSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)
    
    class Meta:
        model = BiometricVerificationSession
        fields = '__all__'
        read_only_fields = ['user', 'session_id', 'created_at', 'completed_at']

class AttendanceWithBiometricSerializer(serializers.Serializer):
    """Serializer for attendance with biometric verification"""
    attendance_type = serializers.ChoiceField(choices=AttendanceRecord.ATTENDANCE_TYPES)
    face_verified = serializers.BooleanField(default=False)
    ear_verified = serializers.BooleanField(default=False)
    face_confidence = serializers.FloatField(required=False, min_value=0.0, max_value=1.0)
    ear_confidence = serializers.FloatField(required=False, min_value=0.0, max_value=1.0)
    biometric_data = BiometricDataSerializer(required=False)
    location = serializers.CharField(required=False, allow_blank=True)
    device_info = serializers.JSONField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        """Validate attendance with biometric data"""
        user = self.context['request'].user

        # If biometric feature vectors are provided, backend will compute flags.
        # Otherwise, if client claims verification, ensure user has registered data.
        has_probe = bool(data.get('biometric_data'))
        if not has_probe:
            if data.get('face_verified') and not user.face_biometric_data:
                raise serializers.ValidationError("Face biometric data not registered")
            if data.get('ear_verified') and not user.ear_biometric_data:
                raise serializers.ValidationError("Ear biometric data not registered")
            if not data.get('face_verified') and not data.get('ear_verified'):
                raise serializers.ValidationError("At least one biometric verification is required")

        return data

class BiometricRegistrationSerializer(serializers.Serializer):
    """Serializer for biometric registration"""
    verification_type = serializers.ChoiceField(choices=['face', 'ear', 'both'])
    biometric_data = BiometricDataSerializer()
    
    def validate(self, data):
        """Validate biometric registration data"""
        user = self.context['request'].user
        
        # Check if already registered
        if data['verification_type'] in ['face', 'both'] and user.face_biometric_data:
            raise serializers.ValidationError("Face biometric already registered")
        
        if data['verification_type'] in ['ear', 'both'] and user.ear_biometric_data:
            raise serializers.ValidationError("Ear biometric already registered")
        
        return data

class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile"""
    
    class Meta:
        model = User
        fields = [
            'full_name', 'phone', 'department', 'position', 'office_location',
            'staff_id', 'date_of_birth', 'gender', 'employee_id', 'hire_date'
        ]
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Make all fields optional for updates
        for field_name in self.fields:
            self.fields[field_name].required = False
    
    def validate_phone(self, value):
        """Validate phone number format"""
        if value and len(value) < 10:
            raise serializers.ValidationError("Phone number must be at least 10 digits")
        return value

class AdminUserSerializer(serializers.ModelSerializer):
    """Serializer for admin user management"""
    attendance_records_count = serializers.SerializerMethodField()
    last_attendance = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        exclude = ['password']
    
    def get_attendance_records_count(self, obj):
        return obj.attendance_records.count()
    
    def get_last_attendance(self, obj):
        last_record = obj.attendance_records.first()
        return last_record.timestamp if last_record else None 