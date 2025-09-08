from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserDetailView, AttendanceRecordViewSet, RegisterView,
    BiometricRegistrationView, BiometricVerificationView, AttendanceWithBiometricView,
    AdminDashboardView, AdminUserManagementView, BiometricSessionView,
    AdminReportsView, AdminSettingsView, AdminAuditLogsView, AdminAuditSummaryView
)
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

# Create router for ViewSets
router = DefaultRouter()
router.register(r'attendance', AttendanceRecordViewSet, basename='attendance')

urlpatterns = [
    # Authentication endpoints
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/register/', RegisterView.as_view(), name='register'),
    
    # User management
    path('user/', UserDetailView.as_view(), name='user_detail'),
    
    # Biometric endpoints
    path('biometric/register/', BiometricRegistrationView.as_view(), name='biometric_register'),
    path('biometric/verify/', BiometricVerificationView.as_view(), name='biometric_verify'),
    path('biometric/session/<str:session_id>/', BiometricSessionView.as_view(), name='biometric_session'),
    
    # Attendance with biometric
    path('attendance/mark/', AttendanceWithBiometricView.as_view(), name='attendance_mark'),
    
    # Admin endpoints
    path('admin/dashboard/', AdminDashboardView.as_view(), name='admin_dashboard'),
    path('admin/users/', AdminUserManagementView.as_view(), name='admin_users'),
    path('admin/reports/', AdminReportsView.as_view(), name='admin_reports'),
    path('admin/settings/', AdminSettingsView.as_view(), name='admin_settings'),
    path('admin/audit-logs/', AdminAuditLogsView.as_view(), name='admin_audit_logs'),
    path('admin/audit-summary/', AdminAuditSummaryView.as_view(), name='admin_audit_summary'),
    
    # Include router URLs
    path('', include(router.urls)),
] 