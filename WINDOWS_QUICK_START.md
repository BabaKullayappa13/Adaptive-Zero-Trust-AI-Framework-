# Windows Quick Start - npm Installation

This is the fastest way to get up and running on Windows.

## 1️⃣ Prerequisites (5 minutes)

### A. Check if npm is installed
Open PowerShell and type:
```powershell
npm --version
```

If you see a version number like `10.2.4`, skip to Step 2.

**If you get "npm is not recognized":**

### B. Install Node.js + npm
1. Go to https://nodejs.org/
2. Download **LTS version** (e.g., 20.10.0)
3. Run the installer
4. Accept all defaults
5. **Restart your computer**
6. Open PowerShell and verify: `npm --version`

---

## 2️⃣ Get the Project (2 minutes)

```powershell
# Navigate to your project folder
cd path\to\zero-trust-ai-framework

# Verify you're in the right place
ls  # Should show: frontend, backend, package.json, etc.
```

---

## 3️⃣ Auto Setup (5 minutes) - RECOMMENDED

### Option A: PowerShell (Recommended)
```powershell
# Allow scripts to run (one time only)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Run the setup script
.\setup-windows.ps1
```

### Option B: Command Prompt
```cmd
setup-windows.bat
```

**The script will automatically:**
- ✅ Check Node.js, npm, Python
- ✅ Install frontend dependencies
- ✅ Setup Python virtual environment
- ✅ Install backend dependencies
- ✅ Create `.env` files

**Then go to Step 5**

---

## 4️⃣ Manual Setup (10 minutes)

### Frontend Setup
```powershell
cd frontend
npm install
npm run build  # Verify it works
cd ..
```

### Backend Setup
```powershell
cd backend

# Create virtual environment
python -m venv venv

# Activate it (PowerShell)
.\venv\Scripts\Activate.ps1

# Or if you're in Command Prompt (cmd)
venv\Scripts\activate.bat

# Install dependencies
pip install -r requirements.txt

cd ..
```

---

## 5️⃣ Database Setup (5 minutes)

### Start PostgreSQL
```powershell
# PostgreSQL usually starts automatically on Windows
# To verify it's running:
psql --version
```

### Create Database
```powershell
# Connect to PostgreSQL
psql -U postgres

# Enter your password when prompted
# Then run:
CREATE DATABASE zero_trust_ai;
CREATE USER zero_trust_user WITH PASSWORD 'password123';
GRANT ALL PRIVILEGES ON DATABASE zero_trust_ai TO zero_trust_user;
\q
```

### Create .env Files

**backend/.env:**
```
DATABASE_URL=postgresql://zero_trust_user:password123@localhost:5432/zero_trust_ai
JWT_SECRET_KEY=my-secret-key-at-least-32-characters-long
FASTAPI_ENV=development
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

**frontend/.env.local:**
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=Zero Trust AI Framework
```

---

## 6️⃣ Start Backend

Open **PowerShell #1**:
```powershell
cd backend

# Activate venv
.\venv\Scripts\Activate.ps1

# You should see (venv) in your prompt
# Then start the server
uvicorn main:app --reload --port 8000
```

**You should see:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
```

**Keep this terminal open!**

---

## 7️⃣ Start Frontend

Open **PowerShell #2**:
```powershell
cd frontend
npm run dev
```

**You should see:**
```
> next dev

  ▲ Next.js 14.0.0
  - Local:        http://localhost:3000
```

**Keep this terminal open!**

---

## 8️⃣ Test Everything

### ✅ Backend API
Open your browser: `http://localhost:8000/docs`

You should see Swagger API documentation with all endpoints.

### ✅ Frontend
Open your browser: `http://localhost:3000`

You should see the login page.

### ✅ Create Account
1. Click "Sign Up"
2. Enter email and password
3. Click Register
4. Login with your new account
5. You should see the dashboard

---

## Common Issues & Fixes

### ❌ "npm is not recognized"
**Fix:**
```powershell
# Restart PowerShell completely
# Close and reopen PowerShell

# If still doesn't work, restart your computer

# Verify installation:
where npm
```

### ❌ "python: The term is not recognized"
**Fix:**
```powershell
# Python must be added to PATH during installation
# Uninstall Python completely
# Reinstall, checking "Add Python to PATH"
# Restart computer

# Verify:
where python
```

### ❌ "venv activation doesn't work"
**Fix:**
```powershell
# Use Command Prompt instead
cmd
cd backend
venv\Scripts\activate.bat
```

### ❌ "Cannot install dependencies"
**Fix:**
```powershell
# Clear pip cache
pip cache purge

# Try again
pip install -r requirements.txt

# If still fails, install individually
pip install fastapi uvicorn psycopg pydantic PyJWT passlib pyotp
```

### ❌ "Port 8000 already in use"
**Fix:**
```powershell
# Find what's using port 8000
netstat -ano | findstr :8000

# Kill the process (replace PID with the actual number)
taskkill /PID 12345 /F

# Or use a different port
uvicorn main:app --reload --port 8001
```

### ❌ "Frontend won't connect to backend"
**Fix:**
1. Make sure backend is running on `http://localhost:8000`
2. Check `frontend/.env.local` has `NEXT_PUBLIC_API_URL=http://localhost:8000`
3. Restart frontend: Stop and run `npm run dev` again

### ❌ "Database connection refused"
**Fix:**
```powershell
# Check PostgreSQL is running
psql -U postgres -c "SELECT version();"

# Start PostgreSQL if needed (usually auto-starts on Windows)
# Check backend/.env has correct DATABASE_URL
```

---

## Verification Checklist

After setup, verify everything works:

```
Command to run                          Expected result
═══════════════════════════════════════════════════════════════════

node --version                          v20.x.x (or similar)
npm --version                           10.x.x (or similar)
python --version                        Python 3.11.x (or later)
pip --version                           pip 23.x.x (or similar)

# Backend
cd backend
pip list                                psycopg, fastapi, etc installed
.\venv\Scripts\Activate.ps1             (venv) appears in prompt
uvicorn main:app --reload               Server runs on :8000

# Frontend
cd frontend
npm run build                           Build succeeds, no errors
npm run dev                             Dev server runs on :3000

# In browser
http://localhost:8000/docs              Swagger UI appears
http://localhost:3000                   Login page appears
```

---

## Next Steps

1. ✅ Create an account and login
2. ✅ Explore the dashboard
3. ✅ Read the documentation: `00_START_HERE.md`
4. ✅ Check the API docs at `http://localhost:8000/docs`

---

## Need Help?

📚 **Read these:**
- `WINDOWS_SETUP.md` - Detailed setup guide
- `README.md` - Project overview
- `DOCS_API.md` - API reference
- `00_START_HERE.md` - Complete guide

---

**You're all set! Happy hacking! 🚀**
