from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from django.urls import reverse
from django.db.models import Count, Q
from django.utils import timezone
from datetime import datetime, timedelta
from .models import User, AttendanceRecord, BiometricVerificationSession

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = [
        'username', 'full_name', 'short_id', 'nin', 'department', 
        'position', 'role', 'is_verified', 'biometric_verification_status',
        'employment_status', 'last_login', 'attendance_count'
    ]
    list_filter = [
        'role', 'is_verified', 'biometric_verification_status', 
        'employment_status', 'department', 'onboarding_completed',
        'date_joined', 'last_login'
    ]
    search_fields = [
        'username', 'full_name', 'short_id', 'nin', 'email',
        'department', 'position', 'staff_id', 'employee_id'
    ]
    readonly_fields = [
        'date_joined', 'last_login', 'face_verification_date', 
        'ear_verification_date', 'created_at', 'updated_at'
    ]
    fieldsets = (
        ('Basic Information', {
            'fields': ('username', 'password', 'full_name', 'email', 'phone')
        }),
        ('Government ID', {
            'fields': ('short_id', 'nin', 'staff_id', 'employee_id')
        }),
        ('Employment Details', {
            'fields': ('department', 'position', 'office_location', 'supervisor', 'hire_date', 'employment_status')
        }),
        ('Biometric Data', {
            'fields': ('face_biometric_data', 'ear_biometric_data', 'biometric_verification_status'),
            'classes': ('collapse',)
        }),
        ('System Access', {
            'fields': ('is_active', 'is_staff', 'is_superuser', 'role', 'is_verified', 'onboarding_completed')
        }),
        ('Timestamps', {
            'fields': ('date_joined', 'last_login', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    ordering = ('-date_joined',)
    list_per_page = 25
    
    def attendance_count(self, obj):
        count = obj.attendance_records.count()
        if count > 0:
            url = reverse('admin:attendance_attendancerecord_changelist')
            return format_html('<a href="{}?user__id__exact={}">{} records</a>', url, obj.id, count)
        return '0 records'
    attendance_count.short_description = 'Attendance Records'
    
    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        queryset = queryset.annotate(
            attendance_count=Count('attendance_records')
        )
        return queryset

@admin.register(AttendanceRecord)
class AttendanceRecordAdmin(admin.ModelAdmin):
    list_display = [
        'user_name', 'attendance_type', 'status', 'timestamp', 
        'verification_method', 'face_verified', 'ear_verified',
        'location', 'created_at'
    ]
    list_filter = [
        'attendance_type', 'status', 'verification_method',
        'face_verified', 'ear_verified', 'timestamp',
        ('user__department', admin.RelatedOnlyFieldListFilter),
        ('user__role', admin.RelatedOnlyFieldListFilter)
    ]
    search_fields = [
        'user__full_name', 'user__short_id', 'user__nin',
        'location', 'notes'
    ]
    readonly_fields = [
        'timestamp', 'created_at', 'updated_at', 'verification_status'
    ]
    fieldsets = (
        ('Attendance Information', {
            'fields': ('user', 'attendance_type', 'status', 'timestamp')
        }),
        ('Biometric Verification', {
            'fields': ('face_verified', 'ear_verified', 'face_confidence', 'ear_confidence', 'verification_method')
        }),
        ('Additional Data', {
            'fields': ('location', 'device_info', 'notes'),
            'classes': ('collapse',)
        }),
        ('System Data', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    ordering = ('-timestamp',)
    list_per_page = 50
    date_hierarchy = 'timestamp'
    
    def user_name(self, obj):
        return obj.user.full_name
    user_name.short_description = 'Employee Name'
    user_name.admin_order_field = 'user__full_name'
    
    def verification_status(self, obj):
        return obj.get_verification_status()
    verification_status.short_description = 'Verification Status'
    
    actions = ['mark_as_present', 'mark_as_absent', 'export_attendance_data']
    
    def mark_as_present(self, request, queryset):
        updated = queryset.update(status='present')
        self.message_user(request, f'{updated} attendance records marked as present.')
    mark_as_present.short_description = 'Mark selected as present'
    
    def mark_as_absent(self, request, queryset):
        updated = queryset.update(status='absent')
        self.message_user(request, f'{updated} attendance records marked as absent.')
    mark_as_absent.short_description = 'Mark selected as absent'
    
    def export_attendance_data(self, request, queryset):
        # This would integrate with a proper export library like django-import-export
        self.message_user(request, 'Export functionality would be implemented here.')
    export_attendance_data.short_description = 'Export attendance data'

@admin.register(BiometricVerificationSession)
class BiometricVerificationSessionAdmin(admin.ModelAdmin):
    list_display = [
        'session_id', 'user_name', 'verification_type', 'status',
        'attempts', 'created_at', 'completed_at', 'session_duration'
    ]
    list_filter = [
        'verification_type', 'status', 'created_at',
        ('user__department', admin.RelatedOnlyFieldListFilter)
    ]
    search_fields = [
        'session_id', 'user__full_name', 'user__short_id'
    ]
    readonly_fields = [
        'session_id', 'created_at', 'completed_at', 'session_duration'
    ]
    fieldsets = (
        ('Session Information', {
            'fields': ('session_id', 'user', 'verification_type', 'status')
        }),
        ('Attempts & Progress', {
            'fields': ('attempts', 'max_attempts', 'session_data')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'completed_at', 'session_duration')
        }),
    )
    ordering = ('-created_at',)
    list_per_page = 25
    
    def user_name(self, obj):
        return obj.user.full_name
    user_name.short_description = 'Employee Name'
    user_name.admin_order_field = 'user__full_name'
    
    def session_duration(self, obj):
        if obj.completed_at:
            duration = obj.completed_at - obj.created_at
            return f"{duration.total_seconds():.1f}s"
        return "In Progress"
    session_duration.short_description = 'Duration'

# Customize admin site
admin.site.site_header = "Government Biometric Attendance System"
admin.site.site_title = "Biometric Attendance Admin"
admin.site.index_title = "Welcome to Government Biometric Attendance Administration"

# Add custom admin actions
def generate_attendance_report(modeladmin, request, queryset):
    """Generate comprehensive attendance report"""
    pass

def bulk_verify_users(modeladmin, request, queryset):
    """Bulk verify user biometrics"""
    pass

# Register custom actions
admin.site.add_action(generate_attendance_report, 'Generate Attendance Report')
admin.site.add_action(bulk_verify_users, 'Bulk Verify Users')
