# 🚀 Quick Vercel Deployment Guide

## ⚡ 5-Minute Deployment

### Step 1: Push to GitHub

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Ready for deployment"

# Create GitHub repo and push
git remote add origin https://github.com/YOUR_USERNAME/scribeai.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy to Vercel

1. Go to **[vercel.com](https://vercel.com)** and sign in with GitHub
2. Click **"New Project"**
3. **Import** your `scribeai` repository
4. Vercel will auto-detect Next.js ✅

### Step 3: Add Environment Variables

In Vercel dashboard, go to **Settings → Environment Variables** and add:

```env
DATABASE_URL=postgresql://postgres.jsefjkoygcsjdcxgwxlk:YOUR_PASSWORD@aws-1-ap-south-1.pooler.supabase.com:5432/postgres

GOOGLE_GEMINI_API_KEY=AIzaSyBJG5vcp5D2cYTN25fTM3veefV_07x1mF0

BETTER_AUTH_SECRET=5I2gCExK15plruN0N7LbvC9cZ42f8OIN

BETTER_AUTH_URL=https://YOUR_APP_NAME.vercel.app

NODE_ENV=production
```

**Important:** Replace:
- `YOUR_PASSWORD` with your actual Supabase password (URL-encoded)
- `YOUR_APP_NAME` with your Vercel app name (you'll see this after first deploy)

### Step 4: Deploy!

1. Click **"Deploy"**
2. Wait 2-3 minutes ⏳
3. Your app is live! 🎉

### Step 5: Update BETTER_AUTH_URL

1. Copy your Vercel URL (e.g., `https://scribeai-xyz.vercel.app`)
2. Go back to **Settings → Environment Variables**
3. Edit `BETTER_AUTH_URL` to your actual URL
4. **Redeploy** (Deployments → ⋯ → Redeploy)

---

## ✅ What to Test After Deployment

1. **Visit your app** at `https://your-app.vercel.app`
2. **Sign up** for a new account
3. **Login** with your credentials
4. **Start a recording session**
5. **Stop and check AI summary**
6. **View session history**
7. **Export a transcript**

---

## ⚠️ Known Limitations on Vercel

- **Socket.io WebSocket features won't work** (Vercel is serverless)
- Real-time streaming is limited
- Everything else works perfectly!

### For Full Features (Socket.io):
Deploy to **Railway** or **Render** instead. See [DEPLOYMENT.md](DEPLOYMENT.md) for details.

---

## 🐛 Common Issues

### "Failed to connect to database"
- Check `DATABASE_URL` is correct
- Ensure password is URL-encoded (`@` → `%40`, `#` → `%23`)
- Use Supabase "Session mode" connection string

### "Gemini API error"
- Check `GOOGLE_GEMINI_API_KEY` is correct
- Visit https://ai.dev/usage to check quota
- Wait 1 minute if quota exceeded

### "Authentication not working"
- Ensure `BETTER_AUTH_URL` matches your Vercel domain
- Must start with `https://`
- Redeploy after changing environment variables

---

## 🎯 Your Environment Variables Checklist

Copy this and fill in your values:

```env
# ✅ Database (from Supabase)
DATABASE_URL=postgresql://postgres.xxx:password@aws-1-ap-south-1.pooler.supabase.com:5432/postgres

# ✅ Gemini API (from ai.google.dev)
GOOGLE_GEMINI_API_KEY=AIzaSy...

# ✅ Auth Secret (keep the same)
BETTER_AUTH_SECRET=5I2gCExK15plruN0N7LbvC9cZ42f8OIN

# ⚠️ Update this AFTER first deployment
BETTER_AUTH_URL=https://YOUR_APP_NAME.vercel.app

# ✅ Environment
NODE_ENV=production
```

---

## 📞 Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **Full Deployment Guide**: [DEPLOYMENT.md](DEPLOYMENT.md)
- **README**: [README.md](README.md)

---

**That's it! Your app should be live in 5 minutes! 🚀**

