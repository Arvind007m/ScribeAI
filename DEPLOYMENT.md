# 🚀 ScribeAI Deployment Guide

## Overview

This guide covers deploying ScribeAI to various hosting platforms. Choose the platform that best fits your needs.

---

## ⚡ Quick Deploy to Vercel (Easiest)

**Best for:** Quick deployment, serverless architecture  
**Limitation:** Socket.io WebSocket features won't work (serverless limitation)

### Steps:

1. **Prepare Your Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Visit [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel auto-detects Next.js configuration

3. **Set Environment Variables**
   
   In Vercel Dashboard → Settings → Environment Variables:
   
   | Variable | Value | Example |
   |----------|-------|---------|
   | `DATABASE_URL` | Your PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
   | `GOOGLE_GEMINI_API_KEY` | Your Gemini API key | `AIzaSy...` |
   | `BETTER_AUTH_SECRET` | Random 32+ character string | Generate with: `openssl rand -base64 32` |
   | `BETTER_AUTH_URL` | Your Vercel app URL | `https://your-app.vercel.app` |
   | `NODE_ENV` | `production` | `production` |

4. **Deploy**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Visit your live app!

5. **Post-Deployment**
   - Copy your Vercel URL
   - Update `BETTER_AUTH_URL` with actual domain
   - Redeploy to apply changes

### What Works on Vercel:
- ✅ Authentication (login/signup)
- ✅ Recording interface
- ✅ AI summaries with Gemini
- ✅ Session management
- ✅ Database operations
- ✅ Export functionality

### What Doesn't Work:
- ❌ Real-time Socket.io streaming (serverless limitation)
- ❌ WebSocket connections

---

## 🚂 Deploy to Railway (Recommended for Full Features)

**Best for:** Full Socket.io support, persistent connections  
**Cost:** Free tier available

### Steps:

1. **Create Railway Account**
   - Visit [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your ScribeAI repository

3. **Configure Environment Variables**
   
   In Railway dashboard, add:
   ```
   DATABASE_URL=postgresql://...
   GOOGLE_GEMINI_API_KEY=AIzaSy...
   BETTER_AUTH_SECRET=your-secret-here
   BETTER_AUTH_URL=https://your-app.up.railway.app
   NODE_ENV=production
   PORT=9002
   ```

4. **Configure Build Settings**
   
   Railway auto-detects Node.js. Ensure these settings:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm run start`

5. **Deploy**
   - Railway automatically builds and deploys
   - Get your public URL from dashboard
   - Update `BETTER_AUTH_URL` if needed

### What Works on Railway:
- ✅ Everything from Vercel
- ✅ **Full Socket.io support**
- ✅ **Real-time WebSocket streaming**
- ✅ Persistent connections
- ✅ Long-running processes

---

## 🎨 Deploy to Render

**Best for:** Free tier with persistent connections  
**Cost:** Free tier available (with limitations)

### Steps:

1. **Create Render Account**
   - Visit [render.com](https://render.com)
   - Sign up with GitHub

2. **Create Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

3. **Configure Service**
   - **Name**: scribeai
   - **Environment**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`

4. **Add Environment Variables**
   
   In Render dashboard → Environment:
   ```
   DATABASE_URL=postgresql://...
   GOOGLE_GEMINI_API_KEY=AIzaSy...
   BETTER_AUTH_SECRET=your-secret-here
   BETTER_AUTH_URL=https://scribeai.onrender.com
   NODE_ENV=production
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait for build (5-10 minutes first time)
   - Access your app at `https://scribeai.onrender.com`

### Free Tier Limitations:
- ⚠️ App sleeps after 15 minutes of inactivity
- ⚠️ Cold start takes 30-60 seconds
- ✅ Full Socket.io support when active

---

## 🐳 Deploy with Docker (Self-Hosted)

**Best for:** Full control, custom infrastructure

### Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js app
RUN npm run build

# Expose port
EXPOSE 9002

# Start server
CMD ["npm", "run", "start"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "9002:9002"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/scribeai
      - GOOGLE_GEMINI_API_KEY=${GOOGLE_GEMINI_API_KEY}
      - BETTER_AUTH_SECRET=${BETTER_AUTH_SECRET}
      - BETTER_AUTH_URL=http://localhost:9002
      - NODE_ENV=production
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=scribeai
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

### Deploy:

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## ☁️ Deploy to AWS (Advanced)

**Best for:** Enterprise production, high scalability

### Architecture:

- **EC2** or **ECS** for Node.js server
- **RDS PostgreSQL** for database
- **CloudFront** for CDN
- **Route 53** for DNS
- **ALB** for load balancing

### Quick Start with EC2:

1. **Launch EC2 Instance**
   - Ubuntu 22.04 LTS
   - t3.small or larger
   - Open ports: 80, 443, 9002

2. **SSH and Setup**
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-ip
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Clone repo
   git clone https://github.com/yourusername/scribeai.git
   cd scribeai
   
   # Install dependencies
   npm install
   
   # Set environment variables
   nano .env.local
   # (paste your env vars)
   
   # Build
   npm run build
   
   # Start with PM2
   sudo npm install -g pm2
   pm2 start npm --name "scribeai" -- start
   pm2 startup
   pm2 save
   ```

3. **Configure Nginx (Optional)**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:9002;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

## 🔧 Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `GOOGLE_GEMINI_API_KEY` | ✅ Yes | Gemini API key from ai.google.dev | `AIzaSyBJG5vcp...` |
| `BETTER_AUTH_SECRET` | ✅ Yes | Secret for auth (32+ chars) | `5I2gCExK15plruN0...` |
| `BETTER_AUTH_URL` | ✅ Yes | Your app's public URL | `https://your-app.com` |
| `NODE_ENV` | ✅ Yes | Environment mode | `production` |
| `PORT` | ⚠️ Optional | Server port (default: 9002) | `9002` |

### Generate Secrets:

```bash
# Linux/Mac
openssl rand -base64 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Online
# Visit: https://generate-secret.vercel.app/32
```

---

## 📊 Platform Comparison

| Feature | Vercel | Railway | Render | Docker | AWS |
|---------|--------|---------|--------|--------|-----|
| **Setup Difficulty** | ⭐ Easy | ⭐⭐ Easy | ⭐⭐ Easy | ⭐⭐⭐ Medium | ⭐⭐⭐⭐ Hard |
| **Socket.io Support** | ❌ No | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Free Tier** | ✅ Yes | ✅ Yes | ✅ Yes | N/A | ⚠️ Limited |
| **Auto-scaling** | ✅ Yes | ✅ Yes | ⚠️ Limited | ❌ No | ✅ Yes |
| **Cold Starts** | ⚠️ Yes | ❌ No | ⚠️ Yes | ❌ No | ❌ No |
| **Custom Domain** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Best For** | Static/Serverless | Full-stack apps | Side projects | Self-hosted | Enterprise |

---

## ✅ Post-Deployment Checklist

- [ ] All environment variables set correctly
- [ ] Database connection working
- [ ] Gemini API key valid and has quota
- [ ] `BETTER_AUTH_URL` matches your domain
- [ ] SSL/HTTPS enabled
- [ ] Test login/signup flow
- [ ] Test recording and transcription
- [ ] Test AI summary generation
- [ ] Test session history
- [ ] Test export functionality
- [ ] Monitor error logs
- [ ] Set up monitoring (optional: Sentry, LogRocket)

---

## 🐛 Troubleshooting

### "Failed to connect to database"
- Check `DATABASE_URL` is correct
- Ensure database is accessible from deployment platform
- For Supabase: Use "Session mode" connection string
- Check firewall rules

### "Gemini API quota exceeded"
- Visit https://ai.dev/usage?tab=rate-limit
- Wait for quota reset (usually 1 minute)
- Consider upgrading to paid tier

### "Socket.io not working"
- Vercel doesn't support WebSockets
- Deploy to Railway, Render, or self-hosted
- Check CORS configuration

### "Build failed"
- Check Node.js version (requires 18+)
- Run `npm run build` locally first
- Check build logs for specific errors
- Ensure all dependencies are in `package.json`

### "App is slow"
- Check database connection pooling
- Enable CDN for static assets
- Monitor Gemini API latency
- Consider upgrading hosting plan

---

## 📞 Need Help?

- **GitHub Issues**: [github.com/yourusername/scribeai/issues](https://github.com/yourusername/scribeai/issues)
- **Documentation**: [README.md](README.md)
- **Email**: support@scribeai.example.com

---

**Happy Deploying! 🚀**

