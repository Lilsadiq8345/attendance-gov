from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import datetime, timedelta
import random

User = get_user_model()

class Command(BaseCommand):
    help = 'Add sample attendance data for testing'

    def handle(self, *args, **options):
        try:
            # Get or create sample users if they don't exist
            users = []
            departments = ['IT', 'HR', 'Finance', 'Operations', 'Marketing']
            positions = ['Manager', 'Developer', 'Analyst', 'Coordinator', 'Specialist']
            
            for i in range(1, 11):
                username = f'testuser{i}'
                if not User.objects.filter(username=username).exists():
                    user = User.objects.create_user(
                        username=username,
                        password='testpass123',
                        email=f'{username}@example.com',
                        full_name=f'Test User {i}',
                        short_id=f'EMP{i:03d}',
                        nin=f'1234567890{i:02d}',
                        department=random.choice(departments),
                        position=random.choice(positions),
                        role='user',
                        employment_status='active',
                        is_verified=True
                    )
                    users.append(user)
                    self.stdout.write(f'Created user: {user.full_name}')
                else:
                    users.append(User.objects.get(username=username))
            
            # Add sample attendance records for the last 7 days
            from attendance.models import AttendanceRecord
            
            today = timezone.now().date()
            for i in range(7):
                date = today - timedelta(days=i)
                
                for user in users:
                    # Randomly decide if user was present
                    if random.random() > 0.2:  # 80% attendance rate
                        # Check-in time (between 8:00 AM and 10:00 AM)
                        check_in_hour = random.randint(8, 10)
                        check_in_minute = random.randint(0, 59)
                        check_in_time = timezone.make_aware(
                            datetime.combine(date, datetime.min.time().replace(hour=check_in_hour, minute=check_in_minute))
                        )
                        
                        # Determine if late (after 9:00 AM)
                        is_late = check_in_hour >= 9
                        
                        # Create check-in record
                        AttendanceRecord.objects.get_or_create(
                            user=user,
                            timestamp=check_in_time,
                            attendance_type='check_in',
                            status='late' if is_late else 'present',
                            location='Office',
                            face_verified=random.choice([True, False]),
                            ear_verified=random.choice([True, False])
                        )
                        
                        # 70% chance of check-out
                        if random.random() > 0.3:
                            # Check-out time (between 5:00 PM and 7:00 PM)
                            check_out_hour = random.randint(17, 19)
                            check_out_minute = random.randint(0, 59)
                            check_out_time = timezone.make_aware(
                                datetime.combine(date, datetime.min.time().replace(hour=check_out_hour, minute=check_out_minute))
                            )
                            
                            AttendanceRecord.objects.get_or_create(
                                user=user,
                                timestamp=check_out_time,
                                attendance_type='check_out',
                                status='present',
                                location='Office',
                                face_verified=random.choice([True, False]),
                                ear_verified=random.choice([True, False])
                            )
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully added sample attendance data for {len(users)} users over 7 days'
                )
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error adding sample data: {e}')
            )
