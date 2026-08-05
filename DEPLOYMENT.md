# Deployment Guide - Zero Trust AI Framework

Complete guide for deploying to Vercel and configuring for production.

## Quick Start (Recommended)

### 1. Connect GitHub Repository

```bash
# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit: Zero Trust AI Framework"

# Connect to GitHub
git remote add origin https://github.com/username/zero-trust-ai.git
git push -u origin main
```

### 2. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts to:
# - Link existing project or create new
# - Select framework (None - multi-service)
# - Confirm deployment
```

### 3. Configure Environment Variables

In Vercel Project Settings:

1. **Go to Settings → Environment Variables**
2. **Add these variables:**

```
DATABASE_URL=postgresql://user:password@host:5432/db
PGHOST=host.neon.tech
PGUSER=user
PGPASSWORD=password
PGDATABASE=neon
SECRET_KEY=[generate: openssl rand -base64 32]
BETTER_AUTH_SECRET=[generate: openssl rand -base64 32]
```

3. **Add for all environments:** Development, Preview, Production

## Production Checklist

### Security

- [ ] All secrets are environment variables (not in code)
- [ ] Database password is strong (20+ chars, mixed case, symbols)
- [ ] HTTPS is enforced (Vercel handles this)
- [ ] CORS is properly configured
- [ ] Rate limiting is enabled
- [ ] SQL injection prevention verified
- [ ] CSRF tokens implemented
- [ ] Security headers set

### Database

- [ ] PostgreSQL database is created and accessible
- [ ] Schema migrations are applied
- [ ] Indexes created for performance
- [ ] Backups are configured
- [ ] Connection pooling is enabled (Neon default)
- [ ] SSL/TLS is enforced

### Frontend

- [ ] Environment variables for API endpoints set
- [ ] Build optimizations verified
- [ ] Static assets cached properly
- [ ] Image optimization enabled
- [ ] Error logging configured
- [ ] Analytics integrated (optional)

### Backend

- [ ] Python dependencies pinned in pyproject.toml
- [ ] Error handling and logging configured
- [ ] Rate limiting enabled
- [ ] Request validation in place
- [ ] Async processing for heavy tasks
- [ ] Health checks working

### Monitoring

- [ ] Error tracking (Sentry/similar) configured
- [ ] Performance monitoring enabled
- [ ] Uptime monitoring set up
- [ ] Log aggregation working
- [ ] Alerts configured

## Step-by-Step Deployment

### Phase 1: Preparation

**1. Environment Variables**

Create `.env.production` (do NOT commit):

```env
DATABASE_URL=postgresql://user:password@host:5432/zero_trust_ai
SECRET_KEY=your-super-secret-key-32-chars-min
BETTER_AUTH_SECRET=another-secret-key-32-chars-min
NODE_ENV=production
PYTHON_VERSION=3.11
```

**2. Database Setup**

Using Neon:

```bash
# Neon integration already configured in v0
# Database will be created automatically
# Run migrations (already created in initial setup)
```

**3. Code Review**

```bash
# Run security checks
npm audit
pip check

# Verify builds
pnpm build

# Test critical flows
pnpm test:e2e
```

### Phase 2: Deployment

**1. Deploy to Vercel**

```bash
# First deployment
vercel --prod

# Subsequent deployments (via GitHub push)
git push origin main
# Vercel automatically deploys via GitHub integration
```

**2. Verify Deployment**

```bash
# Check deployment URL
vercel list

# Test endpoints
curl https://your-app.vercel.app/api/health
curl https://your-app.vercel.app/

# Check logs
vercel logs your-app --limit 50
```

**3. Configure Custom Domain (Optional)**

In Vercel Project Settings:

1. Go to **Domains**
2. Add your domain
3. Update DNS records with provided values
4. SSL certificate auto-generated

### Phase 3: Production Hardening

**1. Database Security**

```sql
-- Create read-only user for app
CREATE ROLE app_user WITH PASSWORD 'strong_password';
GRANT CONNECT ON DATABASE zero_trust_ai TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;

-- Create backup user
CREATE ROLE backup_user WITH PASSWORD 'backup_password' SUPERUSER;
```

**2. API Security**

Update `/vercel.json`:

```json
{
  "experimentalServices": {
    "backend": {
      "entrypoint": "backend/main.py",
      "routePrefix": "/api"
    },
    "frontend": {
      "entrypoint": "frontend/next.config.mjs",
      "routePrefix": "/"
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains"
        }
      ]
    }
  ]
}
```

**3. Rate Limiting**

Add to backend (`main.py`):

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

# Apply to endpoints
@app.post("/api/auth/login")
@limiter.limit("10/minute")
async def login(request: Request, credentials: UserLogin):
    # ... login logic
```

**4. CORS Configuration**

Update backend (`main.py`):

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-app.vercel.app",
        "https://your-custom-domain.com"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
    max_age=600,
)
```

### Phase 4: Monitoring & Maintenance

**1. Error Tracking**

Install Sentry:

```bash
cd frontend
npm install @sentry/next

cd ../backend
pip install sentry-sdk
```

Configure in frontend (`app/layout.tsx`):

```typescript
import * as Sentry from "@sentry/next";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

**2. Performance Monitoring**

Frontend (`app/layout.tsx`):

```typescript
import { WebVitals } from 'next-vitals'

export function reportWebVitals(metric: NextWebVitals) {
  console.log(metric)
  // Send to analytics service
}
```

Backend (`main.py`):

```python
from prometheus_client import Counter, Histogram, generate_latest
import time

request_count = Counter('requests_total', 'Total requests')
request_duration = Histogram('request_duration_seconds', 'Request duration')

@app.middleware("http")
async def track_performance(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    
    request_count.inc()
    request_duration.observe(duration)
    
    return response
```

**3. Logging**

```python
import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger(__name__)

logger.info(f"User login: {user_id}")
logger.warning(f"High risk detected: {risk_score}")
logger.error(f"Database error: {e}")
```

## Scaling

### Database Scaling

**Neon provides:**
- Automatic compute scaling
- Read replicas for query distribution
- Connection pooling via PgBouncer
- Branching for testing

### Application Scaling

Vercel automatically scales based on demand:
- Load balancing across regions
- Automatic failover
- Edge caching

For high traffic:

```json
{
  "regions": ["sfo1", "iad1", "lfm1"]
}
```

### Performance Optimization

**Frontend:**
```bash
# Analyze bundle size
npm run analyze

# Enable image optimization
NEXT_PUBLIC_STATIC_EXPORT=false
```

**Backend:**
```python
# Cache frequently accessed data
from functools import lru_cache

@lru_cache(maxsize=1000)
def get_user_policies(user_id: str):
    # Expensive query
    return db.query(...)
```

## Disaster Recovery

### Backup Strategy

```bash
# Automated via Neon
# Backups retained for 30 days
# Point-in-time recovery available

# Manual backup
pg_dump -h host -U user -d db > backup.sql
```

### Rollback Procedure

```bash
# Revert to previous deployment
vercel rollback

# Or redeploy specific version
vercel deploy --prod --ref=previous-commit
```

### Incident Response

1. **Detect**: Monitoring alerts
2. **Assess**: Check logs and metrics
3. **Mitigate**: Rollback or hotfix
4. **Resolve**: Deploy fix
5. **Review**: Post-mortem

## Cost Optimization

### Recommended Settings

**Vercel Pro**: $20/month
- Better uptime SLA
- Team collaboration
- Advanced analytics

**Neon Starter**: Free-$70/month
- Unlimited databases
- 0.5 CPU compute
- Read replicas available

**Estimated Monthly Cost:**
- Vercel: $20
- Neon: $20
- Monitoring: $10-50
- **Total: ~$50-90/month**

## Troubleshooting

### 404 Errors

```bash
# Check if services are running
vercel logs your-app

# Verify routes
curl -I https://your-app.vercel.app/api/health
```

### Database Connection Issues

```bash
# Test connection
psql postgresql://user:pass@host/db

# Check connection limits
SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;
```

### Memory Issues

Backend:
```python
# Monitor memory usage
import psutil
process = psutil.Process()
memory = process.memory_info().rss / 1024 / 1024  # MB
print(f"Memory: {memory} MB")
```

### Slow Queries

```sql
-- Find slow queries
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

-- Add indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_risk_events_user_id ON risk_events(user_id);
```

## Maintenance

### Weekly

- Monitor error logs
- Check database performance
- Review security alerts

### Monthly

- Update dependencies
  ```bash
  pnpm update
  pip list --outdated
  ```
- Review analytics
- Security audit

### Quarterly

- Database maintenance
- Performance optimization
- Cost review

## References

- [Vercel Docs](https://vercel.com/docs)
- [Neon Docs](https://neon.tech/docs)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment)
- [Next.js Production](https://nextjs.org/docs/going-to-production)
- [PostgreSQL Best Practices](https://www.postgresql.org/docs/)

---

**Last Updated**: 2024  
**Status**: Ready for Production  
**Maintained By**: Security Team
