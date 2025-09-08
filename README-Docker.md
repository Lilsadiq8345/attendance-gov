# Docker Setup for Attendance Gov

This setup allows you to run the application consistently across Mac, Windows, and Linux.

## Prerequisites

1. Install Docker Desktop:
   - **Mac**: Download from https://www.docker.com/products/docker-desktop/
   - **Windows**: Download from https://www.docker.com/products/docker-desktop/
   - **Linux**: Follow instructions at https://docs.docker.com/engine/install/

## Quick Start

1. **Clone and navigate to the project**:
   ```bash
   git clone <your-repo>
   cd attendance-gov
   ```

2. **Run with Docker Compose**:
   ```bash
   docker-compose up --build
   ```

3. **Access the application**:
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/swagger/
   - Frontend: http://localhost:8080

## Commands

- **Start services**: `docker-compose up`
- **Start in background**: `docker-compose up -d`
- **Stop services**: `docker-compose down`
- **Rebuild and start**: `docker-compose up --build`
- **View logs**: `docker-compose logs -f`
- **Access backend shell**: `docker-compose exec backend bash`

## What's Included

- **Backend**: Django API with SQLite database
- **Frontend**: Vite React app
- **Persistent data**: Database and media files are stored in Docker volumes
- **Environment**: Pre-configured for local development

## Troubleshooting

- **Port conflicts**: If ports 8000/8080 are busy, edit `docker-compose.yml` to use different ports
- **Permission issues**: On Linux, you might need `sudo` for Docker commands
- **Clean restart**: `docker-compose down -v` (removes volumes) then `docker-compose up --build`

## Production Deployment

For production, you can:
1. Use the same Dockerfile on any cloud platform
2. Set production environment variables
3. Use a managed database (PostgreSQL) instead of SQLite
4. Add nginx for static file serving
