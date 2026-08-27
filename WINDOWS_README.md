# Zero Trust AI Framework - Windows Setup Guide

Welcome! This guide will help you set up the complete system on Windows.

## 🚀 Quick Start (Recommended)

### Option 1: Automated Setup (Easiest - 5 minutes)

1. **Open PowerShell as Administrator**
2. **Navigate to project folder:**
   ```powershell
   cd path\to\zero-trust-ai-framework
   ```
3. **Run setup script:**
   ```powershell
   # First time only - allow scripts to run
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   
   # Run the setup
   .\setup-windows.ps1
   ```

4. **The script will:**
   - ✅ Check Node.js, npm, Python
   - ✅ Install frontend dependencies
   - ✅ Setup Python environment
   - ✅ Install backend dependencies
   - ✅ Create configuration files

**Then jump to Step 6 below!**

### Option 2: Automated Setup with Batch File

1. **Right-click `setup-windows.bat`**
2. **Select "Run as Administrator"**
3. **Wait for completion**
4. **Jump to Step 6 below!**

### Option 3: Manual Setup (10 minutes)

See `WINDOWS_QUICK_START.md` for step-by-step instructions.

---

## ✅ Verification

**Before proceeding, verify your setup:**

```powershell
.\verify-setup.bat
```

This will check:
- ✓ Node.js installed
- ✓ npm installed  
- ✓ Python installed
- ✓ PostgreSQL installed
- ✓ Dependencies installed
- ✓ Configuration files exist

---

## 🗄️ Database Setup

### 1. Start PostgreSQL
PostgreSQL usually starts automatically on Windows. To verify:

```powershell
psql --version
```

### 2. Create Database

```powershell
psql -U postgres
```

Enter your postgres password, then run:

```sql
CREATE DATABASE zero_trust_ai;
CREATE USER zero_trust_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE zero_trust_ai TO zero_trust_user;
\q
```

### 3. Update .env Files

**backend/.env:**
```
DATABASE_URL=postgresql://zero_trust_user:your_secure_password@localhost:5432/zero_trust_ai
JWT_SECRET_KEY=your-secret-key-at-least-32-characters
FASTAPI_ENV=development
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

**frontend/.env.local:**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=Zero Trust AI Framework
```

---

## 🚀 Running the Application

### Terminal 1: Start Backend

```powershell
cd backend

# Activate Python virtual environment
.\venv\Scripts\Activate.ps1
# You should see (venv) in your prompt

# Start FastAPI server
uvicorn main:app --reload --port 8000
```

**Expected output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete
```

**Keep this terminal open!**

### Terminal 2: Start Frontend

Open a new PowerShell window:

```powershell
cd frontend
npm run dev
```

**Expected output:**
```
> next dev

  ▲ Next.js 14.0.0
  - Local:        http://localhost:3000
```

**Keep this terminal open!**

---

## 🌐 Access the Application

### Backend API Documentation
```
http://localhost:8000/docs
```
You should see Swagger UI with all API endpoints.

### Frontend Application
```
http://localhost:3000
```
You should see the login page.

### Test Authentication
1. Click "Sign Up"
2. Create an account
3. Login with your credentials
4. View the dashboard

---

## 📚 Documentation

Depending on your needs, read:

| Document | Purpose |
|----------|---------|
| `WINDOWS_QUICK_START.md` | Fast setup with npm (THIS IS EASIEST!) |
| `WINDOWS_SETUP.md` | Detailed step-by-step guide |
| `00_START_HERE.md` | Main project guide |
| `README.md` | Project overview |
| `DOCS_API.md` | Complete API reference |
| `DEPLOYMENT.md` | Production deployment |

---

## 🔧 Configuration Files

After setup, you should have:

```
zero-trust-ai-framework/
├── .env.example .................. Example env variables
├── backend/
│   ├── .env ...................... Backend configuration
│   ├── requirements.txt ........... Python dependencies
│   ├── main.py ................... FastAPI application
│   └── venv/ ..................... Python virtual environment
│
└── frontend/
    ├── .env.local ................ Frontend configuration
    ├── .npmrc ..................... npm configuration
    ├── next.config.mjs ........... Next.js configuration
    ├── package.json .............. Node.js dependencies
    └── node_modules/ ............ Installed packages
```

---

## ⚠️ Troubleshooting

### "npm is not recognized"

**Solution:**
1. Uninstall Node.js completely
2. Restart your computer
3. Reinstall Node.js from nodejs.org
4. Check "Add to PATH" during installation
5. Restart PowerShell/computer again

### "python is not recognized"

**Solution:**
1. Uninstall Python completely
2. Reinstall Python from python.org
3. **IMPORTANT:** Check "Add Python to PATH" during installation
4. Restart your computer

### "Port 8000 already in use"

**Solution:**
```powershell
# Find what's using port 8000
netstat -ano | findstr :8000

# Kill the process (replace PID with actual number from above)
taskkill /PID 12345 /F

# Or use different port:
uvicorn main:app --reload --port 8001
```

### "Cannot install dependencies"

**Solution:**
```powershell
cd backend
pip cache purge
pip install -r requirements.txt --no-cache-dir
```

### "Frontend won't connect to backend"

**Solution:**
1. Make sure backend is running on http://localhost:8000
2. Check `frontend/.env.local` has correct API URL
3. Restart frontend: Press Ctrl+C and run `npm run dev` again

### "Database connection refused"

**Solution:**
```powershell
# Check PostgreSQL is running
psql -U postgres -c "SELECT version();"

# Verify DATABASE_URL in backend/.env is correct
cat backend\.env | findstr DATABASE_URL
```

---

## 🎯 Next Steps

After setup is complete:

1. ✅ Read `00_START_HERE.md` for an overview
2. ✅ Test the authentication flow (register → login)
3. ✅ Explore the dashboard
4. ✅ Read `DOCS_API.md` to understand the API
5. ✅ Review the source code in `frontend/app/` and `backend/`

---

## 📊 Verification Checklist

Run through these to confirm everything works:

```
✓ node --version          (shows version like v20.x.x)
✓ npm --version           (shows version like 10.x.x)
✓ python --version        (shows version like 3.11.x)
✓ pip --version           (shows version like 23.x.x)
✓ psql --version          (shows PostgreSQL version)

✓ Backend builds:         cd backend & .\venv\Scripts\Activate.ps1
✓ Backend starts:         uvicorn main:app --reload
✓ API docs open:          http://localhost:8000/docs
✓ Frontend builds:        cd frontend & npm run build
✓ Frontend starts:        npm run dev
✓ Homepage loads:         http://localhost:3000
✓ Can register:           Create account on /register
✓ Can login:              Login with created account
✓ Dashboard visible:      See dashboard after login
```

---

## 💡 Tips for Windows Development

### Use VS Code Terminal
In VS Code, use the integrated terminal (Ctrl + `):
- Better than PowerShell for development
- Can split terminals (Ctrl + Shift + 5)
- Better display of colors and formatting

### Create Split Terminals
```
Terminal 1: Backend (left)
Terminal 2: Frontend (right)

Ctrl + Shift + 5 to split horizontally
```

### Recommended VS Code Extensions
- Python (by Microsoft)
- Pylance (by Microsoft)
- REST Client (by Huachao Mao)
- Thunder Client (for API testing)
- PostgreSQL (by Chris Collett)

### Quick Development Workflow
1. Backend in Terminal 1 (uvicorn has hot-reload)
2. Frontend in Terminal 2 (Next.js has hot-reload)
3. Make changes to code
4. Browser automatically updates (hot reload)
5. No restart needed!

---

## 🆘 Still Having Issues?

1. **Check Windows Setup Guide:**
   ```
   WINDOWS_SETUP.md - Full detailed guide
   ```

2. **Check Quick Start:**
   ```
   WINDOWS_QUICK_START.md - Easiest option
   ```

3. **Try Verification Script:**
   ```powershell
   .\verify-setup.bat
   ```

4. **Common Issues Document:**
   See "Troubleshooting" section above

---

## 📞 Getting Help

| Issue | Solution |
|-------|----------|
| npm/Node issues | Read WINDOWS_QUICK_START.md |
| Python issues | Read WINDOWS_SETUP.md Step 2 |
| Database issues | Read WINDOWS_SETUP.md Step 7 |
| API issues | Check http://localhost:8000/docs |
| Frontend issues | Check browser console (F12) |
| General | Read 00_START_HERE.md |

---

## 🎉 Success!

Once everything is running:

- **Backend**: http://localhost:8000/docs
- **Frontend**: http://localhost:3000
- **Documentation**: Read the .md files

You now have a fully functional **Adaptive Zero Trust AI Framework** running locally!

Happy coding! 🚀
