# BPO Scorecard Deployment Guide

## 🚀 Production Deployment Guide

This guide will walk you through deploying the BPO Scorecard application to production.

---

## 📋 Prerequisites

### Software Requirements
- Node.js 18+ and npm
- MongoDB 6.0+ (local or cloud instance)
- Git (for version control)
- Domain name (optional, but recommended)
- SSL certificate (for HTTPS)

### Recommended Hosting Options

**Frontend:**
- Vercel (recommended - easy deployment)
- Netlify
- AWS S3 + CloudFront
- Azure Static Web Apps

**Backend:**
- Railway (recommended - easy MongoDB + Node.js)
- Heroku
- AWS EC2 + MongoDB Atlas
- DigitalOcean Droplet + MongoDB Atlas
- Azure App Service

**Database:**
- MongoDB Atlas (recommended - managed, free tier available)
- Self-hosted MongoDB
- AWS DocumentDB

---

## 🗄️ Part 1: Database Setup (MongoDB Atlas)

### Step 1: Create MongoDB Atlas Account
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account
3. Create a new cluster (M0 Free tier is sufficient for testing)

### Step 2: Configure Database Access
1. **Database Access** → Add New Database User
   - Username: `bpo-scorecard-admin`
   - Password: Generate a strong password (save it securely)
   - Database User Privileges: `Atlas admin`

2. **Network Access** → Add IP Address
   - For development: Add your current IP
   - For production: Add `0.0.0.0/0` (allow from anywhere) or specific server IPs

### Step 3: Get Connection String
1. Click **Connect** on your cluster
2. Choose **Connect your application**
3. Copy the connection string
4. Replace `<password>` with your database user password
5. Replace `<dbname>` with `bpo-scorecard`

Example:
```
mongodb+srv://bpo-scorecard-admin:<password>@cluster0.xxxxx.mongodb.net/bpo-scorecard?retryWrites=true&w=majority
```

### Step 4: Seed Initial Data (Optional)
You can seed the database with initial vendors and users:

```bash
# From server directory
cd server
node scripts/seed.js
```

---

## 🖥️ Part 2: Backend Deployment

### Option A: Deploy to Railway (Recommended)

**Why Railway?**
- Free tier available
- Automatic deployments from GitHub
- Built-in environment variables
- Easy MongoDB connection

**Steps:**

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Initialize Project**
   ```bash
   cd server
   railway init
   ```

4. **Set Environment Variables**
   ```bash
   railway variables set MONGODB_URI="your-mongodb-connection-string"
   railway variables set JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
   railway variables set NODE_ENV="production"
   railway variables set PORT="5000"
   railway variables set FRONTEND_URL="https://your-frontend-domain.com"
   ```

5. **Deploy**
   ```bash
   railway up
   ```

6. **Get Deployment URL**
   ```bash
   railway domain
   ```
   This will give you a URL like: `https://your-app.up.railway.app`

### Option B: Deploy to Heroku

1. **Install Heroku CLI**
   ```bash
   npm install -g heroku
   ```

2. **Login and Create App**
   ```bash
   heroku login
   cd server
   heroku create bpo-scorecard-api
   ```

3. **Set Environment Variables**
   ```bash
   heroku config:set MONGODB_URI="your-mongodb-connection-string"
   heroku config:set JWT_SECRET="your-super-secret-jwt-key"
   heroku config:set NODE_ENV="production"
   heroku config:set FRONTEND_URL="https://your-frontend.netlify.app"
   ```

4. **Create Procfile**
   ```
   web: npm start
   ```

5. **Deploy**
   ```bash
   git add .
   git commit -m "Deploy to Heroku"
   git push heroku main
   ```

### Option C: Deploy to AWS EC2

See detailed EC2 deployment guide in [AWS_DEPLOYMENT.md](./AWS_DEPLOYMENT.md)

---

## 🌐 Part 3: Frontend Deployment

### Step 1: Update Environment Variables

Create `.env.production` in the root directory:

```env
VITE_API_URL=https://your-backend-url.up.railway.app
VITE_APP_NAME=BPO Scorecard
VITE_ENV=production
```

### Step 2: Build the Frontend

```bash
# From project root
npm run build
```

This creates a `dist` folder with optimized production files.

### Option A: Deploy to Vercel (Recommended)

**Why Vercel?**
- Zero configuration
- Automatic HTTPS
- Global CDN
- Free tier generous

**Steps:**

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Follow Prompts**
   - Set up and deploy: Yes
   - Which scope: Your personal account
   - Link to existing project: No
   - Project name: bpo-scorecard
   - Directory: `./`
   - Override build command: No
   - Override output directory: No

4. **Set Environment Variables in Vercel Dashboard**
   - Go to project settings
   - Environment Variables
   - Add `VITE_API_URL` with your backend URL

5. **Deploy to Production**
   ```bash
   vercel --prod
   ```

### Option B: Deploy to Netlify

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Build and Deploy**
   ```bash
   npm run build
   netlify deploy --prod --dir=dist
   ```

3. **Set Environment Variables**
   - Go to Netlify dashboard
   - Site settings → Environment variables
   - Add `VITE_API_URL`

### Option C: Deploy to AWS S3 + CloudFront

See detailed S3 deployment guide in [AWS_DEPLOYMENT.md](./AWS_DEPLOYMENT.md)

---

## 🔐 Part 4: Security Configuration

### 1. Update CORS Settings

In `server/src/server.ts`, update CORS configuration:

```typescript
app.use(cors({
  origin: [
    'https://your-production-frontend.vercel.app',
    'https://your-custom-domain.com'
  ],
  credentials: true
}));
```

### 2. Generate Strong JWT Secret

```bash
# Generate a random 64-character string
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Use this as your `JWT_SECRET` environment variable.

### 3. Configure HTTPS

- Vercel/Netlify: Automatic HTTPS ✅
- Railway: Automatic HTTPS ✅
- Custom domains: Use Let's Encrypt or Cloudflare

### 4. Set Security Headers

Already configured in `server/src/server.ts` with Helmet.

---

## 👤 Part 5: Create Initial Admin User

After deployment, create an admin user:

### Method 1: Via API (Recommended)

```bash
curl -X POST https://your-backend-url.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourcompany.com",
    "password": "SecurePassword123!",
    "name": "Admin User",
    "role": "admin"
  }'
```

### Method 2: Via MongoDB Compass

1. Connect to your MongoDB Atlas cluster
2. Navigate to `bpo-scorecard` database → `users` collection
3. Insert document:
   ```json
   {
     "email": "admin@yourcompany.com",
     "password": "$2a$10$hashed-password",
     "name": "Admin User",
     "role": "admin",
     "active": true,
     "createdAt": { "$date": "2025-11-30T00:00:00.000Z" },
     "updatedAt": { "$date": "2025-11-30T00:00:00.000Z" }
   }
   ```

---

## 🧪 Part 6: Post-Deployment Testing

### 1. Health Check

```bash
curl https://your-backend-url.com/health
```

Expected response:
```json
{
  "success": true,
  "message": "BPO Scorecard API is running",
  "timestamp": "2025-11-30T15:00:00.000Z"
}
```

### 2. Frontend Accessibility

Visit `https://your-frontend-url.com` and verify:
- [ ] Login page loads
- [ ] Can log in with admin credentials
- [ ] Dashboard displays
- [ ] Can create new audit
- [ ] Duplicate detection works
- [ ] Validation works
- [ ] Save draft works
- [ ] Can view audit details

### 3. API Endpoints

Test critical endpoints:

```bash
# Get all audits (requires auth token)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://your-backend-url.com/api/audits

# Check duplicate
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://your-backend-url.com/api/audits/check/vendor1/2025-01
```

---

## 📊 Part 7: Monitoring & Maintenance

### Set Up Monitoring

**Backend (Railway/Heroku):**
- Enable application logs
- Set up log aggregation (LogDNA, Papertrail)
- Configure error alerts

**Frontend (Vercel/Netlify):**
- Enable Analytics
- Set up Sentry for error tracking
- Configure uptime monitoring (UptimeRobot, Pingdom)

### Database Monitoring

**MongoDB Atlas:**
- Enable alerts for high CPU/memory
- Set up automated backups (enabled by default)
- Monitor connection pool usage

### Regular Maintenance

- **Weekly:** Review error logs
- **Monthly:** Database performance review
- **Quarterly:** Security audit
- **As needed:** Update dependencies

---

## 🔄 Part 8: CI/CD Setup (Optional)

### GitHub Actions for Automated Deployment

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Deploy to Railway
        run: |
          npm install -g @railway/cli
          railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Build
        run: npm run build
      - name: Deploy to Vercel
        run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

---

## 🆘 Troubleshooting

### Common Issues

**1. CORS Errors**
- Ensure `FRONTEND_URL` in backend matches your actual frontend URL
- Check CORS configuration in `server.ts`

**2. Database Connection Failed**
- Verify MongoDB connection string
- Check IP whitelist in MongoDB Atlas
- Ensure database user has correct permissions

**3. JWT Errors**
- Ensure `JWT_SECRET` is set and matches between deployments
- Check token expiration settings

**4. Build Failures**
- Clear node_modules: `rm -rf node_modules && npm install`
- Check Node.js version compatibility
- Review build logs for specific errors

**5. Environment Variables Not Loading**
- Restart the application after setting variables
- Check variable names (case-sensitive)
- Verify `.env` files are not committed to git

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] MongoDB Atlas cluster created and configured
- [ ] Connection string obtained
- [ ] JWT secret generated (min 32 characters)
- [ ] Frontend built successfully (`npm run build`)
- [ ] Backend tested locally
- [ ] Environment variables documented

### Backend Deployment
- [ ] Backend deployed to hosting platform
- [ ] Environment variables configured
- [ ] Health check endpoint responding
- [ ] Database connection successful
- [ ] CORS configured correctly
- [ ] Logs accessible

### Frontend Deployment
- [ ] Frontend deployed to hosting platform
- [ ] API URL environment variable set
- [ ] Custom domain configured (if applicable)
- [ ] HTTPS enabled
- [ ] Build successful
- [ ] Application loads correctly

### Post-Deployment
- [ ] Admin user created
- [ ] Login functionality tested
- [ ] Create audit tested
- [ ] Duplicate detection tested
- [ ] Validation tested
- [ ] Save draft tested
- [ ] View details tested
- [ ] Delete audit tested
- [ ] Monitoring configured
- [ ] Backups verified
- [ ] Documentation updated

---

## 📞 Support & Resources

### Documentation
- [MongoDB Atlas Docs](https://www.mongodb.com/docs/atlas/)
- [Vercel Docs](https://vercel.com/docs)
- [Railway Docs](https://docs.railway.app/)
- [Express.js Docs](https://expressjs.com/)
- [React + Vite Docs](https://vitejs.dev/)

### Quick Commands Reference

```bash
# Backend
cd server
npm install              # Install dependencies
npm run dev             # Run development server
npm run build           # Build TypeScript
npm start               # Run production server

# Frontend
npm install              # Install dependencies
npm run dev             # Run development server
npm run build           # Build for production
npm run preview         # Preview production build

# Deployment
vercel --prod           # Deploy frontend to Vercel
railway up              # Deploy backend to Railway
```

---

## 🎉 Congratulations!

Your BPO Scorecard application is now deployed to production!

**Access URLs:**
- Frontend: Your Vercel/Netlify URL
- Backend API: Your Railway/Heroku URL
- Database: MongoDB Atlas dashboard

**Next Steps:**
1. Share application URL with team
2. Create user accounts for auditors
3. Configure vendors in admin panel
4. Start creating audits!

---

**Need Help?** Review the troubleshooting section or check the hosting platform's support documentation.

**Production Ready:** ✅  
**Deployment Guide Version:** 1.0  
**Last Updated:** 2025-11-30
