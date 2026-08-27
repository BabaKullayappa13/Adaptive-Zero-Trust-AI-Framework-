# Windows Setup Guide - Zero Trust AI Framework

This guide will help you set up the complete Zero Trust AI Framework on Windows using Visual Studio Code.

## Prerequisites Check

Before starting, ensure your system meets these requirements:
- Windows 10 or later
- Visual Studio Code installed
- Internet connection
- Administrator access (for some installations)

---

## Step 1: Install Node.js and npm

### Download Node.js LTS
1. Go to https://nodejs.org/
2. Download the **LTS (Long Term Support)** version
3. Run the installer (accept all defaults)
4. **Restart your computer**

### Verify Installation
Open PowerShell as Administrator and run:

```powershell
node --version
npm --version
```

You should see version numbers (e.g., `v20.x.x` and `10.x.x`).

**If you get "not recognized" error:**
- Restart PowerShell completely
- Restart your computer
- Check that Node.js is installed in `C:\Program Files\nodejs\`

---

## Step 2: Install Python 3.11+

### Download Python
1. Go to https://www.python.org/downloads/
2. Download **Python 3.11 or 3.12** (latest)
3. Run the installer

### Important: Enable PATH
**During installation, CHECK the box: "Add Python to PATH"**

### Verify Installation
Open PowerShell and run:

```powershell
python --version
pip --version
```

You should see version numbers (e.g., `Python 3.11.x` and `pip 23.x.x`).

---

## Step 3: Install PostgreSQL

### Download PostgreSQL
1. Go to https://www.postgresql.org/download/windows/
2. Download PostgreSQL 14 or later
3. Run the installer
4. Remember the password you set for the `postgres` user

### Verify Installation
Open PowerShell and run:

```powershell
psql --version
```

You should see a version number.

---

## Step 4: Clone/Open the Project

Open PowerShell and navigate to your project:

```powershell
cd path\to\zero-trust-ai-framework
```

---

## Step 5: Setup Frontend (Next.js)

### Navigate to Frontend Directory
```powershell
cd frontend
```

### Install Dependencies
```powershell
npm install
```

This will install all required Node.js packages. Wait for it to complete (might take 2-5 minutes).

### Verify Frontend Setup
```powershell
npm run build
```

This should complete without errors.

---

## Step 6: Setup Backend (FastAPI + Python)

### Navigate to Backend Directory
```powershell
cd ..\backend
```

### Create Virtual Environment
```powershell
python -m venv venv
```

### Activate Virtual Environment

**On Windows PowerShell:**
```powershell
.\venv\Scripts\Activate.ps1
```

**On Windows Command Prompt (cmd):**
```cmd
venv\Scripts\activate.bat
```

You should see `(venv)` at the start of your prompt.

### Install Python Dependencies
```powershell
pip install -r requirements.txt
```

Wait for installation to complete.

---

## Step 7: Configure PostgreSQL

### Create Database and User

Open PowerShell and connect to PostgreSQL:

```powershell
psql -U postgres
```

Enter your postgres password when prompted.

In the PostgreSQL prompt, run these commands:

```sql
CREATE DATABASE zero_trust_ai;
CREATE USER zero_trust_user WITH PASSWORD 'your_secure_password';
ALTER ROLE zero_trust_user SET client_encoding TO 'utf8';
ALTER ROLE zero_trust_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE zero_trust_user SET default_transaction_deferrable TO on;
GRANT ALL PRIVILEGES ON DATABASE zero_trust_ai TO zero_trust_user;
\q
```

---

## Step 8: Create Environment Files

### Backend .env File

Create `backend/.env` with this content:

```
DATABASE_URL=postgresql://zero_trust_user:your_secure_password@localhost:5432/zero_trust_ai
JWT_SECRET_KEY=your-super-secret-jwt-key-min-32-chars-change-this
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
MFA_ISSUER=ZeroTrustAI
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000
LOG_LEVEL=INFO
FASTAPI_ENV=development
```

### Frontend .env.local File

Create `frontend/.env.local` with this content:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_NAME=Zero Trust AI Framework
```

---

## Step 9: Initialize Database

### Run Database Migrations

From the `backend` folder (with venv activated):

```powershell
python -m alembic upgrade head
```

Or if that doesn't work, the backend will auto-initialize on first run.

---

## Step 10: Start the Backend

### From Backend Directory (with venv activated)

```powershell
uvicorn main:app --reload --port 8000
```

You should see:
```
Uvicorn running on http://127.0.0.1:8000
```

**Keep this terminal open!**

---

## Step 11: Start the Frontend

### Open NEW PowerShell Window

Navigate to the frontend folder:

```powershell
cd path\to\zero-trust-ai-framework\frontend
npm run dev
```

You should see:
```
> next dev
  ▲ Next.js 14.0.0
  - Local:        http://localhost:3000
```

**Keep this terminal open!**

---

## Step 12: Verify Everything Works

### Check Backend API
Open your browser and go to:
```
http://localhost:8000/docs
```

You should see the Swagger API documentation.

### Check Frontend
Open your browser and go to:
```
http://localhost:3000
```

You should see the login page.

---

## Testing the Application

### Test Authentication Flow

1. Go to http://localhost:3000
2. Click "Register" or "Sign Up"
3. Create a test account
4. Login with your credentials
5. You should see the dashboard

### Test API Directly

In PowerShell, test the API:

```powershell
# Register
curl -X POST http://localhost:8000/auth/register `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"test@example.com\",\"password\":\"TestPass123!\"}'

# Login
curl -X POST http://localhost:8000/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"test@example.com\",\"password\":\"TestPass123!\"}'
```

---

## Verification Checklist

Run through these checks to confirm everything is working:

```
✓ Node.js installed:          node --version
✓ npm installed:              npm --version
✓ Python installed:           python --version
✓ pip installed:              pip --version
✓ PostgreSQL installed:       psql --version
✓ Frontend builds:            npm run build (from frontend/)
✓ Backend starts:             uvicorn main:app --reload
✓ API docs open:              http://localhost:8000/docs
✓ Frontend loads:             http://localhost:3000
✓ Can register user:          Create account at /register
✓ Can login:                  Login with credentials
✓ Dashboard loads:            After login
```

---

## Troubleshooting

### "npm: The term 'npm' is not recognized"

**Solution:**
1. Uninstall Node.js completely from Control Panel
2. Restart your computer
3. Reinstall Node.js from nodejs.org
4. Make sure "Add npm to PATH" is checked during installation
5. Restart PowerShell

### "python: The term 'python' is not recognized"

**Solution:**
1. Go to Control Panel > Add/Remove Programs
2. Find Python and click "Modify"
3. Check "Add Python to PATH"
4. Click "Next" then "Install"
5. Restart PowerShell

### "Cannot activate venv"

**Solution:**
```powershell
# If Activate.ps1 fails, use cmd instead:
cmd
cd backend
venv\Scripts\activate.bat
```

### "Database connection refused"

**Solution:**
1. Verify PostgreSQL is running:
   ```powershell
   psql -U postgres -c "SELECT version();"
   ```
2. Check DATABASE_URL in backend/.env is correct
3. Verify password is correct

### "Port 8000 already in use"

**Solution:**
```powershell
# Find what's using port 8000
netstat -ano | findstr :8000

# Kill the process (replace PID with actual number)
taskkill /PID <PID> /F
```

### "Cannot install dependencies"

**Solution:**
```powershell
# Clear pip cache
pip cache purge

# Try installing again
pip install -r requirements.txt

# Or install one by one
pip install fastapi uvicorn
```

---

## Next Steps

1. **Read the documentation:**
   - `00_START_HERE.md` - Main guide
   - `README.md` - Project overview
   - `DOCS_API.md` - API reference

2. **Explore the dashboard:**
   - View trust scores
   - Monitor risk events
   - Check audit logs
   - Manage policies

3. **Customize the system:**
   - Update configuration
   - Train ML models
   - Add custom policies

---

## Using VS Code

### Recommended Extensions

Install these in VS Code:

1. **Python** - by Microsoft
2. **Pylance** - by Microsoft
3. **REST Client** - by Huachao Mao
4. **Thunder Client** - for API testing
5. **PostgreSQL** - by Chris Collett

### Open Integrated Terminal

In VS Code:
- Press `` Ctrl + ` ``
- Split terminal (Ctrl + Shift + 5)
- One terminal for backend, one for frontend

### Debug Backend

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "FastAPI",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": ["main:app", "--reload", "--port", "8000"],
      "cwd": "${workspaceFolder}/backend",
      "python": "${workspaceFolder}/backend/venv/Scripts/python.exe"
    }
  ]
}
```

---

## Getting Help

If you encounter issues:

1. Check the troubleshooting section above
2. Review error messages carefully
3. Check that all prerequisites are installed
4. Try restarting terminals and VS Code
5. Check project documentation

---

**You're all set! Your Zero Trust AI Framework is ready to use on Windows.** 🎉
