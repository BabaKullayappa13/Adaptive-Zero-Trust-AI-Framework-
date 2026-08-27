# Quick Start Guide - Zero Trust AI Framework

Get up and running with the Zero Trust AI Framework in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- Python 3.11+ installed (for backend development)
- Neon database configured (already connected in v0)
- Git installed

## Option 1: Development Mode (Recommended for Testing)

### Step 1: Install Dependencies

```bash
# Frontend
cd frontend
pnpm install

# Backend (skip if using Vercel services)
cd ../backend
pip install -r requirements.txt
```

### Step 2: Set Environment Variables

Create `.env.local` in the frontend directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Step 3: Start Development Servers

**Terminal 1 - Frontend:**
```bash
cd frontend
pnpm dev
```

**Terminal 2 - Backend:**
```bash
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Step 4: Access the Application

- **Frontend**: http://localhost:3000
- **Backend API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## Option 2: Production Deployment

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### Step 2: Deploy to Vercel

```bash
vercel --prod
```

### Step 3: Configure Environment Variables

In Vercel Project Settings → Environment Variables:

```
DATABASE_URL=postgresql://...
SECRET_KEY=[generate: openssl rand -base64 32]
BETTER_AUTH_SECRET=[generate: openssl rand -base64 32]
```

### Step 4: Access Deployed App

Your app is live at: `https://your-project.vercel.app`

## Test the Application

### 1. Register a New Account

1. Navigate to http://localhost:3000 (or your deployed URL)
2. Click "Get Started" or "Create Account"
3. Fill in email and password (min 8 characters)
4. Click "Create Account"

### 2. Login

1. Go to Sign In page
2. Enter your credentials
3. Click "Sign In"
4. You'll be redirected to the dashboard

### 3. Check Trust Score

1. On the dashboard, view your "Trust Score" card
2. See your current trust level (LOW/MEDIUM/HIGH)
3. Review the risk factors breakdown

### 4. Enable MFA (Two-Factor Authentication)

1. Click "Security" in the navigation
2. Find "Two-Factor Auth" section
3. Click "Enable MFA"
4. Scan QR code with Google Authenticator, Authy, or similar app
5. Enter the 6-digit code
6. MFA is now enabled

### 5. View Audit Logs

1. Go to the Dashboard
2. Scroll to "Audit Logs" section
3. See all your account activities with timestamps

## API Testing

### Health Check

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{"status":"ok","service":"zero-trust-backend"}
```

### Register User

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123"
  }'
```

### Login

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123"
  }'
```

Save the `access_token` from the response.

### Get Trust Score

```bash
curl -X GET http://localhost:8000/api/trust/score/{user_id} \
  -H "Authorization: Bearer {access_token}"
```

### Detect Risk

```bash
curl -X POST http://localhost:8000/api/risk/detect \
  -H "Authorization: Bearer {access_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "{user_id}",
    "login_hour": 14,
    "device_count": 1,
    "failed_attempts": 0,
    "session_duration": 15,
    "geographic_distance": 0,
    "device_trust": 0.9,
    "velocity": 0,
    "request_count": 50,
    "new_device": false
  }'
```

## Project Structure Overview

```
zero-trust-ai-framework/
├── frontend/                    # Next.js 14 application
│   ├── app/
│   │   ├── page.tsx            # Landing page
│   │   ├── auth/               # Authentication pages
│   │   ├── dashboard/          # Main dashboard
│   │   ├── security/           # Security settings
│   │   └── policies/           # Policy management
│   ├── components/
│   │   ├── navbar.tsx
│   │   └── dashboard/          # Dashboard components
│   ├── lib/
│   │   ├── api.ts             # API client
│   │   └── auth-store.ts      # State management
│   └── package.json
│
├── backend/                     # FastAPI application
│   ├── main.py                 # FastAPI app with all endpoints
│   ├── pyproject.toml          # Python dependencies
│
├── vercel.json                  # Vercel multi-service config
├── package.json                 # Root package.json
├── README.md                    # Full documentation
├── DOCS_API.md                  # API reference
├── DEPLOYMENT.md                # Deployment guide
└── QUICKSTART.md               # This file

```

## Key Features to Explore

### 1. Real-Time Trust Scoring
- **Location**: Dashboard → Trust Score Card
- **Shows**: Current trust level based on behavioral analysis
- **Breakdown**: Device trust, behavioral score, geographic/temporal anomalies

### 2. Risk Detection
- **Algorithm**: Isolation Forest ML model
- **Detects**: Anomalies in login patterns
- **Shows**: Risk score with SHAP explainability

### 3. MFA (Two-Factor Authentication)
- **Setup**: Security → Two-Factor Auth
- **Compatible with**: Google Authenticator, Authy, 1Password, Microsoft Authenticator
- **Recovery**: Backup codes for emergency access

### 4. Audit Logging
- **What's logged**: Every action (login, MFA, policy changes)
- **View**: Dashboard → Audit Logs
- **Includes**: Timestamp, IP address, action, result

### 5. Zero Trust Policies
- **Access**: Policies page
- **Types**: Behavioral, Geographic, Temporal, Device rules
- **Enforcement**: Real-time policy evaluation

## Troubleshooting

### Frontend won't load

```bash
# Check if frontend is running
curl http://localhost:3000

# Check Node version
node --version  # should be 18+

# Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Backend API not responding

```bash
# Check if backend is running
curl http://localhost:8000/health

# Check Python version
python --version  # should be 3.11+

# Check logs
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Database connection error

```bash
# Check DATABASE_URL is set
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL

# Verify credentials in .env.local
cat .env.local
```

### Login fails with "Invalid credentials"

- Ensure email and password are correct
- Check if user account exists (register first if needed)
- Verify database is running and accessible

### MFA code not working

- Ensure time is synchronized on your device
- Check that authenticator app is using the right secret
- Try disabling and re-enabling MFA

## Next Steps

1. **Explore the Dashboard**
   - Review trust scores and risk factors
   - Check audit logs for activity

2. **Test Security Features**
   - Enable MFA for your account
   - Simulate different risk scenarios
   - View how policies are enforced

3. **Integrate with Your System**
   - Review API documentation (DOCS_API.md)
   - Implement custom policies
   - Connect to your user management system

4. **Deploy to Production**
   - Follow DEPLOYMENT.md guide
   - Configure production environment variables
   - Set up monitoring and alerting

## Documentation

- **README.md** - Comprehensive project documentation
- **DOCS_API.md** - Complete API reference
- **DEPLOYMENT.md** - Production deployment guide
- **[Backend API Docs](http://localhost:8000/docs)** - Interactive Swagger UI

## Support

For issues or questions:

1. Check the documentation
2. Review API examples
3. Check backend logs for errors
4. Verify database connectivity
5. Ensure all environment variables are set

## Default Test Credentials

When first deployed locally with demo data:

```
Email: demo@example.com
Password: DemoPassword123
```

(These are for testing only - use proper credentials in production)

## Rate Limiting

API rate limits (per user, per minute):
- Authentication endpoints: 10 requests/minute
- Trust/Risk endpoints: 100 requests/minute
- Audit endpoints: 50 requests/minute

## Performance Tips

1. **Enable caching** on database queries
2. **Use connection pooling** (Neon default)
3. **Compress API responses** with gzip
4. **Cache frontend assets** with Vercel CDN
5. **Monitor database slow queries** regularly

## Security Reminders

- Never commit `.env` files
- Use strong, unique passwords (20+ characters)
- Rotate API keys regularly
- Enable MFA on all accounts
- Review audit logs frequently
- Keep dependencies updated

## Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js 14 Docs](https://nextjs.org/docs)
- [FastAPI Docs](https://fastapi.tiangolo.com)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Neon Documentation](https://neon.tech/docs)

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Status**: Production Ready  

Ready to build something secure? Start with the development setup above and refer to the documentation as needed!
