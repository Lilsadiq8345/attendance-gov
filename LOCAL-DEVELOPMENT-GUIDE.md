# 🚀 Local Development Guide

## **Frontend Local + Backend Online Setup**

This guide shows you how to run the frontend locally while using the online backend on Render.

## **Quick Start**

### **Option 1: Using the Script (Recommended)**
```bash
./start-local-dev.sh
```

### **Option 2: Using npm script**
```bash
npm run dev:local
```

### **Option 3: Manual setup**
```bash
export VITE_API_URL=https://attendance-gov-backend.onrender.com
npm run dev
```

## **What This Setup Does**

✅ **Frontend**: Runs locally on `http://localhost:8080`  
✅ **Backend**: Uses online backend at `https://attendance-gov-backend.onrender.com`  
✅ **Hot Reload**: Changes reflect immediately  
✅ **Debugging**: Full browser dev tools access  
✅ **MediaPipe**: Should work better locally  

## **Environment Configuration**

The `.env` file contains:
```env
VITE_API_URL=https://attendance-gov-backend.onrender.com
VITE_APP_NAME=Attendance Management System (Local Dev)
VITE_APP_VERSION=1.0.0-dev
```

## **Testing the Setup**

1. **Start the local server:**
   ```bash
   npm run dev:local
   ```

2. **Open your browser:**
   - Go to `http://localhost:8080`
   - You should see the login page

3. **Test login:**
   - Email: `abubakarsa242@gmail.com`
   - Password: `Abubakar@1234`

4. **Test biometric scanner:**
   - Navigate to biometric enrollment
   - Check browser console for detailed MediaPipe logs
   - Should work much better locally!

## **Advantages of Local Development**

🔥 **Better Performance**: No Render cold starts  
🔥 **Faster Debugging**: Immediate hot reload  
🔥 **Full Dev Tools**: Complete browser debugging  
🔥 **MediaPipe Issues**: Often work better locally  
🔥 **Network Debugging**: See all API calls clearly  

## **Troubleshooting**

### **If MediaPipe still fails locally:**
1. Check browser console for detailed logs
2. Try different browsers (Chrome works best)
3. Ensure camera permissions are granted
4. Check if HTTPS is required (some browsers need it)

### **If API calls fail:**
1. Check network tab in dev tools
2. Verify CORS headers in response
3. Ensure backend is running on Render

### **If login fails:**
1. Check if backend is accessible: `curl https://attendance-gov-backend.onrender.com/api/user/`
2. Verify credentials are correct
3. Check browser console for errors

## **Development Workflow**

1. **Make changes** to frontend code
2. **See changes instantly** (hot reload)
3. **Debug easily** with browser dev tools
4. **Test biometric features** with full debugging
5. **Deploy when ready** to Render

## **Backend Status**

The online backend is always running and includes:
- ✅ User authentication
- ✅ Biometric data storage
- ✅ Attendance tracking
- ✅ CORS properly configured

## **Next Steps**

1. Start local development: `npm run dev:local`
2. Test the biometric scanner
3. Debug any issues with full dev tools
4. Deploy frontend when everything works

**Happy coding! 🎉**
