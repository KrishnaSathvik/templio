# Vercel Deployment Guide

Your app is ready for production deployment on Vercel! 🚀

## ✅ Pre-Deployment Checklist

All critical issues have been fixed:
- ✅ Toast notifications (replaced alerts)
- ✅ Error boundary
- ✅ Input validation & sanitization
- ✅ Production-safe logging
- ✅ Loading states
- ✅ HTTPS enforcement
- ✅ Build tested and working

## 🚀 Quick Deploy (5 minutes)

### Option 1: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Link to existing project? **No** (first time) or **Yes** (updates)
   - Project name: `html-code-saver` (or your choice)
   - Directory: `./` (current directory)
   - Override settings? **No**

4. **Set Environment Variables**:
   ```bash
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_ANON_KEY
   ```
   
   Or set them in Vercel Dashboard (see Option 2)

5. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via GitHub (Recommended for CI/CD)

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Ready for production"
   git push origin main
   ```

2. **Import to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Vite settings

3. **Configure Environment Variables**:
   - In Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add:
     - `VITE_SUPABASE_URL` = `https://your-project.supabase.co`
     - `VITE_SUPABASE_ANON_KEY` = `your-anon-key-here`
   - Make sure to add them for **Production**, **Preview**, and **Development**

4. **Deploy**:
   - Click "Deploy" button
   - Vercel will automatically build and deploy

## ⚙️ Vercel Configuration

Vercel automatically detects Vite projects, but you can customize:

### Build Settings (Auto-detected)
- **Framework Preset**: Vite
- **Build Command**: `pnpm build` (or `npm run build`)
- **Output Directory**: `dist`
- **Install Command**: `pnpm install` (or `npm install`)

### Environment Variables Required

Add these in Vercel Dashboard → Settings → Environment Variables:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**Important**: 
- Use the same values as your local `.env` file
- Add for all environments (Production, Preview, Development)
- Never commit these to Git (already in `.gitignore`)

## 🔒 Security Features Enabled

Your app includes:
- ✅ HTTPS enforcement (automatic on Vercel, but our code adds extra protection)
- ✅ HTML sanitization (XSS protection)
- ✅ Input validation
- ✅ Error boundary (prevents crashes)
- ✅ Production-safe logging

## 📊 Post-Deployment

### 1. Test Your Deployment

After deployment, test:
- [ ] Sign up / Sign in works
- [ ] Create a new template
- [ ] View template preview
- [ ] Edit template title
- [ ] Delete template
- [ ] Toggle favorites
- [ ] HTTPS is working (check URL bar)

### 2. Custom Domain (Optional)

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Vercel automatically provides SSL certificate

### 3. Monitor Performance

- Vercel Analytics (optional): Enable in Dashboard
- Check build logs: Dashboard → Deployments
- Monitor errors: Check browser console

## 🐛 Troubleshooting

### Build Fails

**Error: "Missing Supabase environment variables"**
- Solution: Make sure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in Vercel Dashboard

**Error: "Module not found"**
- Solution: Run `pnpm install` locally to ensure all dependencies are in `package.json`

### App Doesn't Work After Deploy

**Can't sign in/sign up**
- Check Supabase project is active
- Verify environment variables are correct
- Check Supabase Auth settings (email confirmation)

**Templates not loading**
- Check Supabase RLS policies are set up
- Verify database table exists
- Check browser console for errors

### Performance Issues

**Slow loading**
- Check Vercel Analytics for insights
- Consider enabling Vercel Edge Functions
- Optimize images (already done for screenshots)

## 📝 Notes

- **HTTPS**: Vercel automatically provides HTTPS for all deployments
- **Build Time**: ~1-2 minutes
- **Deploy Time**: ~30 seconds after build
- **Free Tier**: Vercel free tier is generous and perfect for this app

## 🎉 You're Ready!

Your app is production-ready and can be deployed to Vercel right now. All critical security and functionality issues have been resolved.

**Next Steps:**
1. Set environment variables in Vercel
2. Deploy (via CLI or GitHub)
3. Test your live app
4. Share with users!

---

**Need Help?**
- Vercel Docs: https://vercel.com/docs
- Vercel Support: https://vercel.com/support

