# AWS Deployment Guide for FinOps

This guide explains how to deploy FinOps to AWS with PostgreSQL.

## Prerequisites

1. **AWS Account** with access to EC2 or ECS
2. **PostgreSQL Database** (AWS RDS or external like Neon)
3. **Node.js 20+** on your deployment server

## Environment Variables Required

Set these environment variables on your AWS server:

```bash
DATABASE_URL=postgresql://username:password@host:5432/finops
SESSION_SECRET=your-secure-random-string-here
NODE_ENV=production
PORT=5000
```

## Option 1: Deploy to AWS EC2

### Step 1: Prepare Your Code

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Push database schema
npm run db:push
```

### Step 2: Upload to EC2

Upload these files/folders to your EC2 instance:
- `dist/` (compiled server)
- `package.json`
- `package-lock.json`

### Step 3: Run on EC2

```bash
# Install production dependencies only
npm install --production

# Start the server
npm start
```

The app will run on port 5000 by default.

### Step 4: Set Up Process Manager (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start dist/index.cjs --name finops

# Auto-restart on reboot
pm2 startup
pm2 save
```

## Option 2: Deploy with Docker

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY dist/ ./dist/

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "dist/index.cjs"]
```

### Build & Run

```bash
# Build locally first
npm run build

# Build Docker image
docker build -t finops .

# Run container
docker run -d \
  -p 5000:5000 \
  -e DATABASE_URL="your-database-url" \
  -e SESSION_SECRET="your-secret" \
  finops
```

## Database Setup

### Option A: AWS RDS PostgreSQL

1. Create RDS PostgreSQL instance
2. Get connection string: `postgresql://user:pass@rds-endpoint:5432/finops`
3. Run migrations: `DATABASE_URL=... npm run db:push`

### Option B: Neon (Free Tier Available)

1. Create account at neon.tech
2. Create a new project
3. Copy connection string
4. Run migrations: `DATABASE_URL=... npm run db:push`

## Initial Setup After Deployment

1. The first user to register becomes the Admin
2. Access the app at `http://your-server:5000`
3. Create your admin account
4. Add other users via Settings > Users

## Security Checklist

- [ ] Use HTTPS (set up Nginx/ALB with SSL)
- [ ] Use strong SESSION_SECRET (32+ random characters)
- [ ] Restrict database access to your server only
- [ ] Set up firewall rules (only allow port 443/80)
- [ ] Enable RDS encryption at rest

## Troubleshooting

**Database connection error:**
- Check DATABASE_URL format
- Verify database is accessible from server
- Check security group/firewall rules

**Session issues:**
- Ensure SESSION_SECRET is set
- Check if database sessions table exists

**Build errors:**
- Ensure Node.js 20+ is installed
- Run `npm install` before building
