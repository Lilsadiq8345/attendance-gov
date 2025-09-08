# Docker Setup for Attendance Gov

This setup allows you to run the application consistently across Mac, Windows, and Linux.

## Prerequisites

1. **Install Docker Desktop** (one-time setup):
   - **Mac**: Download from https://www.docker.com/products/docker-desktop/
   - **Windows**: Download from https://www.docker.com/products/docker-desktop/
   - **Linux**: Follow instructions at https://docs.docker.com/engine/install/

2. **Verify Docker is running**:
   ```bash
   docker --version
   docker-compose --version
   ```

## Complete Setup Steps

### Step 1: Get the Code
```bash
git clone <your-repo-url>
cd attendance-gov
```

### Step 2: Run the Application
```bash
docker-compose up --build
```

**That's it!** The app will automatically:
- Build the Docker images
- Install all dependencies
- Set up the database
- Start both backend and frontend

### Step 3: Access the Application
Once you see "Starting development server..." messages:

- **Frontend App**: http://localhost:8080
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/swagger/
- **Admin Panel**: http://localhost:8000/admin/

### Step 4: Create Admin User (Optional)
To access the admin panel:
```bash
# In a new terminal
docker-compose exec backend python manage.py createsuperuser
```

## Daily Usage Commands

- **Start the app**: `docker-compose up`
- **Start in background**: `docker-compose up -d`
- **Stop the app**: `docker-compose down`
- **Restart with fresh build**: `docker-compose up --build`
- **View logs**: `docker-compose logs -f`
- **Access backend shell**: `docker-compose exec backend bash`

## What Happens Automatically

When you run `docker-compose up --build`:

1. **Backend Container**:
   - Installs Python 3.12 and all dependencies
   - Runs database migrations
   - Starts Django development server on port 8000
   - Creates SQLite database at `/app/db.sqlite3`

2. **Frontend Container**:
   - Installs Node.js dependencies
   - Starts Vite development server on port 8080
   - Hot-reloads on code changes

3. **Data Persistence**:
   - Database and media files are stored in Docker volumes
   - Your data persists between restarts

## Troubleshooting

### Port Already in Use
If you get "port already in use" errors:
```bash
# Stop any running containers
docker-compose down

# Or change ports in docker-compose.yml
# Edit the ports section to use 8001:8000 and 8081:8080
```

### Permission Issues (Linux)
```bash
sudo docker-compose up --build
```

### Clean Restart (Reset Everything)
```bash
# Remove containers and volumes
docker-compose down -v

# Rebuild from scratch
docker-compose up --build
```

### View What's Running
```bash
# See running containers
docker ps

# See all containers (including stopped)
docker ps -a
```

## First Time Setup Checklist

- [ ] Docker Desktop installed and running
- [ ] Cloned the repository
- [ ] Ran `docker-compose up --build`
- [ ] Can access http://localhost:8080 (frontend)
- [ ] Can access http://localhost:8000/swagger/ (API docs)
- [ ] (Optional) Created admin user for http://localhost:8000/admin/

## Production Deployment

The same Docker setup works for production:

1. **Build production image**:
   ```bash
   docker build -t attendance-gov:latest .
   ```

2. **Deploy to any cloud platform**:
   - AWS ECS, Google Cloud Run, Azure Container Instances
   - Railway, Fly.io, DigitalOcean App Platform
   - Just set production environment variables

3. **Use managed database** (recommended for production):
   - Replace SQLite with PostgreSQL
   - Update environment variables for database connection
