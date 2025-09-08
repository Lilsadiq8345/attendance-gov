## Government Biometric Attendance System (Face + Ear)

End-to-end biometric attendance platform for government offices, supporting face and ear verification similar to Opay. Built with Django REST Framework (backend) and React + Vite + TypeScript (frontend).

### Features
- Dual biometric model: Face and Ear, with configurable thresholds
- JWT auth, CORS, CSRF hardening, rate limits, Redis cache, Celery ready
- Admin dashboard (Django admin) with rich filters, search, and actions
- Attendance workflows: check-in, check-out, breaks, with lateness rule
- Real-time camera capture UI with step-by-step scan experience
- Swagger and ReDoc API documentation

### Architecture
- Backend: Django 5, DRF, SimpleJWT, Redis cache, Celery-ready
- Frontend: React 18, Vite, shadcn/ui, Axios, React Query

### Local Setup

Backend:
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp env.example .env
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Frontend:
```bash
npm install
npm run dev
# Vite proxies /api to http://localhost:8000
```

API Docs: after running backend, visit:
- Swagger: http://localhost:8000/swagger/
- ReDoc: http://localhost:8000/redoc/

### Testing
```bash
cd backend
pytest -q
```

### Environment Variables
Copy `backend/env.example` to `backend/.env` and adjust values (DB, Redis, JWT, Email).

### Defense Notes (What to Demo)
- Show user registration, JWT login, and biometric registration
- Demonstrate camera scan and attendance marking (check-in and check-out)
- Open Django admin: filters, search, and session audit trails
- Show Swagger docs and explain API security (JWT + rate limiting)
- Discuss biometric verification math (cosine similarity on feature vectors)

### Production Tips
- Use PostgreSQL, Redis (managed), Gunicorn, and Whitenoise/staticfiles
- Set DEBUG=False, secure cookies, proper ALLOWED_HOSTS, and rotate JWT secrets
