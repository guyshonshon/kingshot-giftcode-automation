# Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to: https://supabase.com
2. Sign up (free) or login
3. Click "New Project"
4. Fill in:
   - **Name:** `kingshot-giftcode-automation`
   - **Database Password:** (save this!)
   - **Region:** Choose closest to you
   - **Pricing Plan:** Free
5. Click "Create new project"
6. Wait 2-3 minutes for setup

## Step 2: Get API Keys

1. Go to Project Settings → API
2. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

## Step 3: Create Database Tables

1. Go to SQL Editor in Supabase dashboard
2. Click "New Query"
3. Copy and paste the contents of `supabase-schema.sql`
4. Click "Run"
5. Verify tables were created:
   - Go to Table Editor
   - You should see `players` and `audit_logs` tables

## Step 4: Set Environment Variables in Render

1. Go to your Render dashboard
2. Select your service
3. Go to Environment tab
4. Add these variables:
   - `SUPABASE_URL` = Your project URL
   - `SUPABASE_ANON_KEY` = Your anon/public key

## Step 5: Redeploy

Render will automatically redeploy when you add environment variables, or:
```bash
render deploy
```

## That's It! ✅

Your app now uses Supabase PostgreSQL instead of file storage!

## Benefits:

- ✅ **Persistent storage** (no data loss)
- ✅ **Free tier:** 500MB database, unlimited requests
- ✅ **Fast queries** with indexes
- ✅ **Automatic backups**
- ✅ **Better than file storage**

## Troubleshooting:

**Tables not created?**
- Check SQL Editor for errors
- Make sure you're in the correct project

**Connection errors?**
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct
- Check that RLS policies allow your operations

**Data not saving?**
- Check Render logs for Supabase errors
- Verify environment variables are set correctly

