#!/usr/bin/env python3
import os
import sys
import django
from django.core.management import execute_from_command_line

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gov_biometric.settings')
django.setup()

# Mock input for migration questions
def mock_input(prompt):
    if "renamed to user.ear_biometric_data" in prompt:
        return "y"
    elif "Select an option" in prompt:
        return "1"
    elif "Please provide a default value" in prompt:
        return "timezone.now"
    else:
        return "y"

# Replace input function
import builtins
original_input = builtins.input
builtins.input = mock_input

try:
    # Run makemigrations
    execute_from_command_line(['manage.py', 'makemigrations'])
    print("Migrations created successfully!")
    
    # Run migrate
    execute_from_command_line(['manage.py', 'migrate'])
    print("Migrations applied successfully!")
    
except Exception as e:
    print(f"Error: {e}")
finally:
    # Restore original input function
    builtins.input = original_input