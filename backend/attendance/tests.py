from django.urls import reverse
from django.test import TestCase
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class AuthAndProfileTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_register_and_login_flow(self):
        # Register
        resp = self.client.post(reverse('register'), {
            'username': 'john@example.com',
            'password': 'StrongPass123',
            'full_name': 'John Doe',
            'nin': 'A123456789',
            'short_id': 'EMP001',
        }, format='json')
        self.assertEqual(resp.status_code, 201)

        # Login
        resp = self.client.post(reverse('token_obtain_pair'), {
            'username': 'john@example.com',
            'password': 'StrongPass123'
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        token = resp.data['access']

        # Get profile
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        resp = self.client.get(reverse('user_detail'))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['username'], 'john@example.com')


class BiometricAndAttendanceTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='mary@example.com', password='StrongPass123',
            full_name='Mary Jane', nin='B123456789', short_id='EMP002'
        )

        # Login
        resp = self.client.post(reverse('token_obtain_pair'), {
            'username': 'mary@example.com', 'password': 'StrongPass123'
        }, format='json')
        self.token = resp.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')

    def test_biometric_registration_and_attendance(self):
        # Register face features
        registration_payload = {
            'verification_type': 'face',
            'biometric_data': {
                'face_features': [0.1] * 128,
                'ear_features': [],
                'confidence': 0.9,
                'timestamp': timezone.now().isoformat(),
                'verification_type': 'face',
            }
        }
        resp = self.client.post(reverse('biometric_register'), registration_payload, format='json')
        self.assertEqual(resp.status_code, 201)

        # Mark check-in with probe similar to enrolled
        attendance_payload = {
            'attendance_type': 'check_in',
            'face_verified': False,  # Let server verify using vectors
            'ear_verified': False,
            'biometric_data': {
                'face_features': [0.1] * 128,
                'ear_features': [],
                'confidence': 0.85,
                'timestamp': timezone.now().isoformat(),
                'verification_type': 'face',
            },
            'location': 'HQ',
            'device_info': {'os': 'test'},
        }
        resp = self.client.post(reverse('attendance_mark'), attendance_payload, format='json')
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertTrue(resp.data['attendance']['face_verified'])
        self.assertIn('attendance', resp.data)

        # Attempt second check-in should fail
        resp2 = self.client.post(reverse('attendance_mark'), attendance_payload, format='json')
        self.assertEqual(resp2.status_code, 400)
