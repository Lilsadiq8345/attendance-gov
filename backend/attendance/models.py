from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
import json

class User(AbstractUser):
    full_name = models.CharField(max_length=255)
    short_id = models.CharField(max_length=20, unique=True)
    nin = models.CharField(max_length=20, unique=True)
    is_verified = models.BooleanField(default=False)
    role = models.CharField(max_length=10, choices=[('user', 'User'), ('admin', 'Admin')], default='user')
    onboarding_completed = models.BooleanField(default=False)
    phone = models.CharField(max_length=20, blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, null=True)
    position = models.CharField(max_length=100, blank=True, null=True)
    office_location = models.CharField(max_length=100, blank=True, null=True)
    staff_id = models.CharField(max_length=50, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    gender = models.CharField(max_length=10, blank=True, null=True)
    
    # Enhanced biometric data fields
    face_biometric_data = models.JSONField(blank=True, null=True)
    ear_biometric_data = models.JSONField(blank=True, null=True)
    face_verification_date = models.DateTimeField(blank=True, null=True)
    ear_verification_date = models.DateTimeField(blank=True, null=True)
    biometric_verification_status = models.CharField(
        max_length=20, 
        choices=[
            ('pending', 'Pending'),
            ('face_only', 'Face Only'),
            ('ear_only', 'Ear Only'),
            ('both', 'Both Verified'),
            ('failed', 'Failed')
        ],
        default='pending'
    )
    
    # Government office specific fields
    employee_id = models.CharField(max_length=50, blank=True, null=True)
    supervisor = models.ForeignKey('self', on_delete=models.SET_NULL, blank=True, null=True)
    hire_date = models.DateField(blank=True, null=True)
    employment_status = models.CharField(
        max_length=20,
        choices=[
            ('active', 'Active'),
            ('inactive', 'Inactive'),
            ('suspended', 'Suspended'),
            ('terminated', 'Terminated')
        ],
        default='active'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.full_name} ({self.short_id})"

    def get_biometric_status(self):
        """Get current biometric verification status"""
        if self.face_biometric_data and self.ear_biometric_data:
            return 'both'
        elif self.face_biometric_data:
            return 'face_only'
        elif self.ear_biometric_data:
            return 'ear_only'
        return 'pending'

    def update_biometric_status(self):
        """Update biometric verification status based on stored data"""
        self.biometric_verification_status = self.get_biometric_status()
        self.save()

class AttendanceRecord(models.Model):
    ATTENDANCE_TYPES = [
        ('check_in', 'Check In'),
        ('check_out', 'Check Out'),
        ('break_start', 'Break Start'),
        ('break_end', 'Break End'),
    ]
    
    STATUS_CHOICES = [
        ('present', 'Present'),
        ('late', 'Late'),
        ('absent', 'Absent'),
        ('half_day', 'Half Day'),
        ('on_leave', 'On Leave'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='attendance_records')
    timestamp = models.DateTimeField(auto_now_add=True)
    attendance_type = models.CharField(max_length=20, choices=ATTENDANCE_TYPES, default='check_in')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='present')
    
    # Biometric verification data
    face_verified = models.BooleanField(default=False)
    ear_verified = models.BooleanField(default=False)
    face_confidence = models.FloatField(blank=True, null=True)
    ear_confidence = models.FloatField(blank=True, null=True)
    biometric_data = models.JSONField(blank=True, null=True)
    
    # Location and device info
    location = models.CharField(max_length=255, blank=True, null=True)
    device_info = models.JSONField(blank=True, null=True)
    
    # Verification metadata
    verification_method = models.CharField(
        max_length=20,
        choices=[
            ('face_only', 'Face Only'),
            ('ear_only', 'Ear Only'),
            ('both', 'Both'),
            ('manual', 'Manual')
        ],
        default='both'
    )
    
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-timestamp']
        unique_together = ['user', 'timestamp', 'attendance_type']

    def __str__(self):
        return f"{self.user.full_name} - {self.attendance_type} at {self.timestamp}"

    def get_verification_status(self):
        """Get verification status for this attendance record"""
        if self.face_verified and self.ear_verified:
            return 'both_verified'
        elif self.face_verified:
            return 'face_verified'
        elif self.ear_verified:
            return 'ear_verified'
        return 'not_verified'

class BiometricVerificationSession(models.Model):
    """Track biometric verification sessions for audit purposes"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='verification_sessions')
    session_id = models.CharField(max_length=100, unique=True)
    verification_type = models.CharField(max_length=20, choices=[('face', 'Face'), ('ear', 'Ear'), ('both', 'Both')])
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('in_progress', 'In Progress'),
            ('completed', 'Completed'),
            ('failed', 'Failed'),
            ('cancelled', 'Cancelled')
        ],
        default='pending'
    )
    attempts = models.IntegerField(default=0)
    max_attempts = models.IntegerField(default=3)
    session_data = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"Session {self.session_id} - {self.user.full_name}"

    def is_expired(self):
        """Check if session is expired (30 minutes)"""
        from django.utils import timezone
        return (timezone.now() - self.created_at).total_seconds() > 1800
