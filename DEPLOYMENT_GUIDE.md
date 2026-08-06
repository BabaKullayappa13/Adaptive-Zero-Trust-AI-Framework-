# Deployment Guide

## Prerequisites

### System Requirements
- Python 3.10+
- Node.js 18+
- PostgreSQL 13+
- Docker & Docker-Compose (for containerized deployment)
- 4GB RAM minimum
- 20GB storage minimum

### Environment Setup

1. **Create Environment File**
```bash
cp .env.example .env.local
```

2. **Required Environment Variables**
```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/zerotrust

# Security
SECRET_KEY=<generate-with-openssl-rand-base64-32>
ALGORITHM=HS256

# Authentication
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000

# Optional: Vercel Deployment
VERCEL_URL=your-vercel-url
VERCEL_PROJECT_ID=prj_xxxxx
VERCEL_ORG_ID=team_xxxxx
```

## Local Development

### 1. Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL="postgresql://localhost:5432/zerotrust"
export SECRET_KEY=$(openssl rand -base64 32)

# Run migrations
psql $DATABASE_URL < migrations/001_authentication.sql
psql $DATABASE_URL < migrations/002_performance_monitoring.sql
psql $DATABASE_URL < migrations/003_core_infrastructure.sql

# Start development server
python -m uvicorn main:app --reload --port 8000
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# App will be available at http://localhost:3000
```

## Docker Deployment

### Build Docker Images

```bash
# Backend
docker build -f backend/Dockerfile -t zerotrust-backend:latest ./backend

# Frontend
docker build -f frontend/Dockerfile -t zerotrust-frontend:latest ./frontend
```

### Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: zerotrust
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: zerotrust
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://zerotrust:${DB_PASSWORD}@db:5432/zerotrust
      SECRET_KEY: ${SECRET_KEY}
    depends_on:
      - db
    volumes:
      - ./backend:/app/backend

  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://backend:8000
    depends_on:
      - backend

volumes:
  postgres_data:
```

### Start Services

```bash
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Vercel Deployment

### Backend (Render/Heroku Alternative)

1. **Push to GitHub**
```bash
git add .
git commit -m "Deploy 15-feature implementation"
git push origin main
```

2. **Deploy on Render**
   - Create account on render.com
   - New PostgreSQL database
   - New Web Service connected to GitHub
   - Environment variables:
     - DATABASE_URL
     - SECRET_KEY
     - ALGORITHM
     - ALLOWED_ORIGINS

3. **Configure CORS**
```
ALLOWED_ORIGINS=https://yourdomain.vercel.app,https://yourdomain.com
```

### Frontend (Vercel)

1. **Connect Repository**
   - Import project from GitHub in Vercel dashboard

2. **Environment Variables**
```
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=https://yourdomain.vercel.app
```

3. **Deploy**
```bash
vercel --prod
```

## Database Migrations

### Execute Migrations

```bash
# Single file
psql -U zerotrust -d zerotrust -f backend/migrations/003_core_infrastructure.sql

# All migrations
for file in backend/migrations/*.sql; do
  psql -U zerotrust -d zerotrust -f "$file"
done
```

### Backup Database

```bash
pg_dump -U zerotrust zerotrust > backup_$(date +%Y%m%d).sql
```

### Restore Database

```bash
psql -U zerotrust zerotrust < backup_20240606.sql
```

## Post-Deployment Configuration

### 1. Verify Services

```bash
# Backend health check
curl http://localhost:8000/api/health

# Frontend access
curl http://localhost:3000

# Database connection
psql -U zerotrust -d zerotrust -c "SELECT COUNT(*) FROM users;"
```

### 2. Initialize Admin User

```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "secure-password"
  }'
```

### 3. Create Federated Organizations

```bash
curl -X POST http://localhost:8000/api/federated/organizations \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Organization 1",
    "description": "First federated learning participant"
  }'
```

### 4. Setup Cloud Providers

```bash
curl -X POST http://localhost:8000/api/cloud/register \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AWS Primary",
    "cloud_type": "public",
    "provider": "AWS",
    "region": "us-east-1",
    "endpoint": "https://aws.endpoint.com",
    "api_key": "<encrypted-key>",
    "is_primary": true
  }'
```

## Monitoring

### Application Monitoring

```bash
# Check logs
docker-compose logs -f backend

# Monitor performance
curl http://localhost:8000/api/metrics/summary?hours=24
```

### Database Monitoring

```sql
-- Active connections
SELECT COUNT(*) FROM pg_stat_activity;

-- Database size
SELECT pg_size_pretty(pg_database_size('zerotrust'));

-- Slow queries
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC LIMIT 10;
```

## Troubleshooting

### Database Connection Issues

```bash
# Test PostgreSQL connection
psql -U zerotrust -h localhost -d zerotrust -c "SELECT 1"

# Check connection string
echo $DATABASE_URL
```

### API Not Responding

```bash
# Check backend logs
docker-compose logs backend

# Restart backend
docker-compose restart backend

# Check port usage
lsof -i :8000
```

### Frontend Build Issues

```bash
# Clear cache
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

## Security Checklist

- [ ] SECRET_KEY is securely generated
- [ ] Database passwords are strong and unique
- [ ] HTTPS is enabled for all URLs
- [ ] CORS is properly configured
- [ ] Database backups are scheduled
- [ ] Rate limiting is configured
- [ ] MFA is enabled for admin accounts
- [ ] Audit logging is active
- [ ] Encryption keys are securely stored
- [ ] Regular security updates applied

## Scaling Considerations

### Horizontal Scaling

- Use load balancer (AWS ALB, Nginx)
- Deploy multiple backend instances
- Use PostgreSQL read replicas
- Implement caching layer (Redis)

### Performance Tuning

- Database indexes optimized
- API response caching
- Frontend asset optimization
- CDN for static files

## Backup & Recovery

### Automated Backups

```bash
# Daily backup script
0 2 * * * pg_dump -U zerotrust zerotrust > /backups/zerotrust_$(date +\%Y\%m\%d).sql
```

### Recovery Procedure

1. Restore database from backup
2. Verify data integrity
3. Restart services
4. Run health checks
5. Monitor logs for errors

## Support & Maintenance

- Monitor application logs daily
- Review security alerts weekly
- Update dependencies monthly
- Conduct security audit quarterly
- Test disaster recovery procedures semi-annually
