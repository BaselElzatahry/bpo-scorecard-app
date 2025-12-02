# BPO Scorecard - Quick Start Deployment

## 🚀 Fastest Way to Deploy (5 minutes)

### Prerequisites
- Node.js 18+ installed
- npm installed
- Git installed

### Step 1: Clone & Install (1 min)
```bash
cd bpo-scorecard-package-main
npm install
cd server && npm install && cd ..
```

### Step 2: Set Up MongoDB Atlas (2 min)
1. Go to https://www.mongodb.com/cloud/atlas/register
2. Create free cluster (M0)
3. Create database user
4. Get connection string
5. Whitelist IP: `0.0.0.0/0`

### Step 3: Configure Environment (1 min)

**Backend** (`server/.env`):
```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/bpo-scorecard
JWT_SECRET=your-64-char-random-string-here-make-it-very-long-and-secure
NODE_ENV=production
PORT=5000
FRONTEND_URL=*
```

**Frontend** (`.env.production`):
```env
VITE_API_URL=https://your-backend-url.com
VITE_APP_NAME=BPO Scorecard
VITE_ENV=production
```

### Step 4: Deploy Backend to Railway (1 min)
```bash
npm install -g @railway/cli
railway login
cd server
railway init
railway up
```

Get your backend URL: `railway domain`

### Step 5: Deploy Frontend to Vercel (< 1 min)
```bash
npm install -g vercel
vercel --prod
```

### Step 6: Update Frontend ENV
Update `.env.production` with your Railway backend URL, then redeploy:
```bash
vercel --prod
```

## ✅ You're Done!

**Frontend URL:** From Vercel terminal  
**Backend API:** From Railway dashboard  

### Create Admin User
```bash
curl -X POST https://your-backend-url.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@company.com",
    "password": "SecurePass123!",
    "name": "Admin User",
    "role": "admin"
  }'
```

### Test Login
1. Go to your Vercel URL
2. Login with admin credentials
3. Start creating audits!

---

## 🔧 Alternative: Local Production Test

### Backend
```bash
cd server
npm run build
npm start
```

### Frontend
```bash
npm run build
npm run preview
```

---

## 📞 Need Help?

See full deployment guide: [DEPLOYMENT.md](./DEPLOYMENT.md)

**Common Issues:**
- **CORS Error:** Update `FRONTEND_URL` in backend .env
- **DB Connection:** Check MongoDB connection string and IP whitelist
- **Build Error:** Run `npm install` in both root and server directories

---

**Deployment Time:** ~5 minutes  
**Cost:** $0 (using free tiers)  
**Status:** Production Ready ✅
