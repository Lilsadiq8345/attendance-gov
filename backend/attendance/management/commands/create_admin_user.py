from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import IntegrityError

User = get_user_model()

class Command(BaseCommand):
    help = 'Create an admin user with all required fields'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, default='admin', help='Username for the admin user')
        parser.add_argument('--password', type=str, default='admin123456', help='Password for the admin user')
        parser.add_argument('--email', type=str, default='admin@example.com', help='Email for the admin user')
        parser.add_argument('--full-name', type=str, default='System Administrator', help='Full name for the admin user')
        parser.add_argument('--short-id', type=str, default='ADMIN001', help='Short ID for the admin user')
        parser.add_argument('--nin', type=str, default='12345678901', help='NIN for the admin user')

    def handle(self, *args, **options):
        username = options['username']
        password = options['password']
        email = options['email']
        full_name = options['full_name']
        short_id = options['short_id']
        nin = options['nin']

        try:
            # Check if user already exists
            if User.objects.filter(username=username).exists():
                self.stdout.write(
                    self.style.WARNING(f'User with username "{username}" already exists')
                )
                return

            if User.objects.filter(nin=nin).exists():
                self.stdout.write(
                    self.style.WARNING(f'User with NIN "{nin}" already exists')
                )
                return

            if User.objects.filter(short_id=short_id).exists():
                self.stdout.write(
                    self.style.WARNING(f'User with short_id "{short_id}" already exists')
                )
                return

            # Create the admin user
            user = User.objects.create_user(
                username=username,
                password=password,
                email=email,
                full_name=full_name,
                short_id=short_id,
                nin=nin,
                role='admin',
                is_verified=True,
                is_staff=True,
                is_superuser=True,
                employment_status='active',
                onboarding_completed=True
            )

            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully created admin user:\n'
                    f'  Username: {username}\n'
                    f'  Password: {password}\n'
                    f'  Full Name: {full_name}\n'
                    f'  Short ID: {short_id}\n'
                    f'  NIN: {nin}\n'
                    f'  Role: {user.role}\n'
                    f'  Email: {email}'
                )
            )

        except IntegrityError as e:
            self.stdout.write(
                self.style.ERROR(f'Error creating user: {e}')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Unexpected error: {e}')
            )
