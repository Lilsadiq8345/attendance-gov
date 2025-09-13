# Render Deployment Guide

This guide shows how to deploy both frontend and backend to Render.

## Backend Deployment (Web Service)

### 1. Create New Web Service
- Go to Render Dashboard
- Click "New" → "Web Service"
- Connect your GitHub repository
- Select `attendance-gov` repository

### 2. Configure Backend Settings
- **Name**: `attendance-gov-backend`
- **Root Directory**: `backend`
- **Runtime**: `Python 3`
- **Build Command**: 
  ```bash
  pip install --upgrade pip setuptools wheel && pip install -r requirements.txt && python manage.py collectstatic --noinput
  ```
- **Start Command**: 
  ```bash
  python manage.py migrate && gunicorn gov_biometric.wsgi:application --bind 0.0.0.0:$PORT --workers 3
  ```

### 3. Add Disk (Required for SQLite)
- Go to Settings → Disks
- Add new disk:
  - **Name**: `media-and-db`
  - **Mount Path**: `/data`
  - **Size**: `2GB`

### 4. Environment Variables for Backend
```
DEBUG=False
SECRET_KEY=[Generate]
ALLOWED_HOSTS=attendance-gov-backend.onrender.com
DB_ENGINE=django.db.backends.sqlite3
DB_NAME=/data/db.sqlite3
MEDIA_ROOT=/data/media
MEDIA_URL=/media/
CORS_ALLOWED_ORIGINS=https://attendance-gov.onrender.com
CSRF_TRUSTED_ORIGINS=https://attendance-gov.onrender.com
JWT_SECRET_KEY=[Generate]
```

## Frontend Deployment (Static Site)

### 1. Create New Static Site
- Go to Render Dashboard
- Click "New" → "Static Site"
- Connect your GitHub repository
- Select `attendance-gov` repository

### 2. Configure Frontend Settings
- **Name**: `attendance-gov`
- **Root Directory**: (leave empty)
- **Build Command**: `npm install && npm run build`
- **Publish Directory**: `dist`

### 3. Environment Variables for Frontend
```
VITE_API_URL=https://attendance-gov-backend.onrender.com
VITE_APP_NAME=Attendance Gov
VITE_APP_VERSION=1.0.0
```

## Deployment Order

1. **Deploy Backend First**
   - Wait for backend to be fully deployed
   - Note the backend URL (e.g., `https://attendance-gov-backend.onrender.com`)

2. **Deploy Frontend Second**
   - Use the backend URL in `VITE_API_URL`
   - Deploy the frontend

## URLs After Deployment

- **Frontend**: `https://attendance-gov.onrender.com`
- **Backend API**: `https://attendance-gov-backend.onrender.com`
- **API Docs**: `https://attendance-gov-backend.onrender.com/swagger/`
- **Admin Panel**: `https://attendance-gov-backend.onrender.com/admin/`

## Troubleshooting

### Backend Issues
- Make sure disk is mounted at `/data`
- Check environment variables are set correctly
- Verify CORS settings include frontend URL

### Frontend Issues
- Ensure `VITE_API_URL` points to your backend
- Check that backend is running and accessible
- Verify CORS settings on backend allow frontend domain

### CORS Issues
If you get CORS errors:
1. Update backend environment variables:
   ```
   CORS_ALLOWED_ORIGINS=https://attendance-gov.onrender.com
   CSRF_TRUSTED_ORIGINS=https://attendance-gov.onrender.com
   ```
2. Redeploy backend
3. Test frontend again

## Local Development

For local development, create `.env.local`:
```
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=Attendance Gov
VITE_APP_VERSION=1.0.0
```

## Production Checklist

- [ ] Backend deployed and accessible
- [ ] Frontend deployed and accessible
- [ ] CORS configured correctly
- [ ] Admin user created
- [ ] API endpoints working
- [ ] Database migrations completed
