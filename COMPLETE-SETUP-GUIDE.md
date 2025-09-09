# Complete Setup Guide for Attendance Gov App

This guide shows exactly what someone needs to do to run your app on their computer.

## Prerequisites (One-time setup)

### Step 1: Install Docker Desktop

**For Windows:**
1. Go to https://www.docker.com/products/docker-desktop/
2. Click "Download for Windows"
3. Run the downloaded `.exe` file
4. Follow the installation wizard
5. Restart your computer when prompted

**For Mac:**
1. Go to https://www.docker.com/products/docker-desktop/
2. Click "Download for Mac"
3. Open the downloaded `.dmg` file
4. Drag Docker to Applications folder
5. Launch Docker Desktop from Applications

**For Linux:**
1. Follow: https://docs.docker.com/engine/install/
2. Install Docker Compose: https://docs.docker.com/compose/install/

### Step 2: Verify Docker is Working

Open your terminal/command prompt and run:
```bash
docker --version
docker compose --version
```

You should see version numbers. If you get "command not found", Docker isn't installed properly.

## Running the App (Every time)

### Step 1: Get the Code

```bash
# Clone the repository
git clone https://github.com/yourusername/attendance-gov.git

# Navigate to the project folder
cd attendance-gov
```

### Step 2: Start the Application

```bash
# This command does everything automatically
docker compose up --build
```

**What happens when you run this command:**
1. Docker downloads Python 3.12
2. Installs all Python dependencies
3. Downloads Node.js
4. Installs all frontend dependencies
5. Creates the database
6. Runs database migrations
7. Starts the backend server
8. Starts the frontend server

### Step 3: Wait for "Ready" Messages

You'll see output like this:
```
backend_1  | Starting development server at http://0.0.0.0:8000/
frontend_1 | Local:   http://localhost:8080/
frontend_1 | Network: http://0.0.0.0:8080/
```

### Step 4: Open the App

Once you see the "Ready" messages:
- **Main App**: Open http://localhost:8080 in your browser
- **API Documentation**: Open http://localhost:8000/swagger/
- **Admin Panel**: Open http://localhost:8000/admin/

## Daily Usage

### Starting the App
```bash
cd attendance-gov
docker compose up
```

### Stopping the App
```bash
# Press Ctrl+C in the terminal, or run:
docker compose down
```

### Restarting (if you made changes)
```bash
docker compose up --build
```

## Troubleshooting

### "docker: command not found"
- Docker Desktop isn't installed or running
- Make sure Docker Desktop is open and running

### "Port already in use"
```bash
# Stop any running containers
docker compose down

# Then try again
docker compose up --build
```

### "Permission denied" (Linux)
```bash
sudo docker compose up --build
```

### App won't start
```bash
# Clean restart (removes all data)
docker compose down -v
docker compose up --build
```

## What You Get

After running `docker compose up --build`:

✅ **Frontend App** - Modern React app with biometric features  
✅ **Backend API** - Django REST API with authentication  
✅ **Database** - SQLite database with all tables created  
✅ **API Docs** - Interactive documentation at /swagger/  
✅ **Admin Panel** - Django admin for managing data  
✅ **Hot Reload** - Changes to code update automatically  

## File Structure (What's Included)

```
attendance-gov/
├── Dockerfile              # Tells Docker how to build the app
├── docker-compose.yml      # Tells Docker how to run everything
├── README-Docker.md        # This guide
├── backend/                # Django backend
│   ├── requirements.txt    # Python dependencies
│   ├── manage.py          # Django management
│   └── gov_biometric/     # Django project settings
└── src/                   # React frontend
    ├── components/        # React components
    ├── pages/            # App pages
    └── main.tsx          # App entry point
```

## No Manual Setup Required!

Unlike traditional setups, you don't need to:
- ❌ Install Python
- ❌ Install Node.js
- ❌ Install dependencies
- ❌ Set up databases
- ❌ Configure environment variables
- ❌ Worry about version conflicts

**Everything is handled automatically by Docker!**

## Success Checklist

After following this guide, you should have:
- [ ] Docker Desktop installed and running
- [ ] App running at http://localhost:8080
- [ ] API docs at http://localhost:8000/swagger/
- [ ] No error messages in terminal
- [ ] Can see the attendance app interface

## Need Help?

If something doesn't work:
1. Make sure Docker Desktop is running
2. Try `docker compose down` then `docker compose up --build`
3. Check the terminal output for error messages
4. Make sure ports 8000 and 8080 aren't being used by other apps
