# APIMart Integration Deployment Guide

## 🎉 Overview

This guide walks you through deploying the **new APIMart integration** that replaces the problematic KIE API setup.

### What Changed?

**Before (KIE API - Had Issues):**
- ❌ Complex prompt causing 422 errors
- ❌ Callback never triggered
- ❌ QueryTask always returned 404
- ❌ No visible task execution

**After (APIMart - Working Solution):**
- ✅ Two-step process: Gemini 2.5 Flash for analysis + Gemini 3 Pro Image for card
- ✅ Simplified, optimized prompts
- ✅ Direct API calls (no internal routing issues)
- ✅ Single unified endpoint: `/api/reports/generateWithAPImart`
- ✅ Better pricing (~$0.06-0.10 per complete flow)

**Latest Fix (2024-12-03):**
- ✅ Refactored to call APIMart API directly instead of internal Vercel endpoints
- ✅ Fixes "Unexpected token 'T', 'The page c'..." JSON parsing errors
- ✅ All logic now inline in single endpoint file

---

## 📋 Prerequisites

1. **APIMart Account**
   - Visit: https://apimart.ai
   - Sign up and get API key
   - Your API key: `sk-mB5obV7W006eRN0QCWbpvoNVZPcB8Tdx4olHBlgGx3UoDw3p`

2. **Vercel Account**
   - Access to: https://vercel.com/rebootmindful/natalcodex

---

## 🚀 Deployment Steps

### Step 1: Set Environment Variables in Vercel

1. Go to: https://vercel.com/rebootmindful/natalcodex/settings/environment-variables

2. Add the following variable:

   ```
   APIMART_API_KEY = sk-mB5obV7W006eRN0QCWbpvoNVZPcB8Tdx4olHBlgGx3UoDw3p
   ```

   **Important:** Make sure to check:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

3. (Optional) You can comment out or remove the old KIE API variables:
   - `KIE_API_KEY`
   - `KIE_CALLBACK_URL`
   - `KIE_CALLBACK_TOKEN`

### Step 2: Deploy the Code

The code is already committed to GitHub. Vercel will auto-deploy when you push.

```bash
# Code is ready, just verify deployment status
# Visit: https://vercel.com/rebootmindful/natalcodex
```

### Step 3: Trigger Redeploy (Important!)

Even though environment variables are set, you **MUST redeploy** for them to take effect:

1. Go to: https://vercel.com/rebootmindful/natalcodex
2. Click on the latest deployment
3. Click **"..."** menu → **"Redeploy"**
4. Confirm redeploy

⏳ Wait ~30-60 seconds for deployment to complete (green checkmark).

### Step 4: Test the Integration

#### Method 1: Use Test Page

Visit: `https://natalcodex.vercel.app/test-apimart.html`

1. The form is pre-filled with sample data
2. Click **"🧪 Test Complete Flow"**
3. Watch the status updates:
   - ✅ Step 1/4: API called
   - ✅ Step 2/4: Report generated
   - ✅ Step 3/4: Analysis data received
   - ✅ Step 4/4: Image generated

4. You should see:
   - Complete report text
   - JSON analysis data (with BaZi + MBTI)
   - Generated Soul Codex card image

#### Method 2: Use Existing Result Page

Visit: `https://natalcodex.vercel.app/result.html?test=1`

**Note:** The existing result.html page still uses KIE API. You can either:
- Update it to use APIMart endpoints (recommended)
- Use the new test page for now

---

## 📂 New Files Created

### API Endpoints

1. **`api/apimart/config.js`**
   - Configuration for APIMart API
   - Models: Gemini 3 Pro (chat) + Gemini 3 Pro Image

2. **`api/apimart/chat.js`**
   - Endpoint: `POST /api/apimart/chat`
   - Purpose: Analyze BaZi + MBTI using Gemini 3 Pro
   - Input: `{ birthData: {...} }`
   - Output: `{ success: true, analysis: {...} }`

3. **`api/apimart/generateImage.js`**
   - Endpoint: `POST /api/apimart/generateImage`
   - Purpose: Create image generation task
   - Input: `{ analysisData: {...}, userName: "..." }`
   - Output: `{ success: true, taskId: "..." }`

4. **`api/apimart/queryTask.js`**
   - Endpoint: `GET /api/apimart/queryTask?taskId=xxx`
   - Purpose: Poll image generation status
   - Output: `{ status: "completed", imageUrl: "..." }`

5. **`api/reports/generateWithAPImart.js`**
   - Endpoint: `POST /api/reports/generateWithAPImart`
   - Purpose: Complete flow (analysis + report + image)
   - Input: `{ orderId: "...", birthData: {...} }`
   - Output: `{ reportContent: "...", imageUrl: "...", analysis: {...} }`

### Test Page

6. **`test-apimart.html`**
   - Standalone test page with full UI
   - Pre-filled sample data
   - Real-time status updates
   - Displays report, analysis JSON, and image

### Documentation

7. **`APIMART_INTEGRATION_PLAN.md`**
   - Complete technical plan
   - Architecture details
   - Code examples

8. **`APIMART_DEPLOYMENT_GUIDE.md`** (this file)

---

## 🔍 How It Works

### Complete Flow

```
User Input (birth data)
        ↓
[1] POST /api/reports/generateWithAPImart
    ├─ Call APIMart Chat API (https://api.apimart.ai/v1/chat/completions)
    │  → Gemini 2.5 Flash analyzes BaZi + MBTI
    │  → Returns JSON: { bazi: {...}, mbti: {...}, soul_title: "..." }
    │
    ├─ Build report from analysis data
    │  → Format: Markdown text
    │
    ├─ Call APIMart Image API (https://api.apimart.ai/v1/images/generations)
    │  → Build optimized visual prompt (English)
    │  → Gemini 3 Pro Image
    │  → Returns: { task_id: "..." }
    │
    └─ Poll APIMart Task API (https://api.apimart.ai/v1/tasks/{taskId})
       → Poll every 2 seconds (max 30 attempts)
       → Wait for: { status: "completed", result: { data: [{ url: "..." }] } }
        ↓
[2] Return complete result
    → reportContent (Markdown)
    → imageUrl (CDN link)
    → analysis (JSON data)
```

**Key Architecture Change:**
- **All API calls go directly to APIMart** (https://api.apimart.ai/v1/*)
- **No internal Vercel endpoint routing** (avoids HTML error pages)
- **Single unified serverless function** at `/api/reports/generateWithAPImart.js`

### Key Improvements

**1. Two-Step Prompt Strategy**

**Step 1 - Gemini 3 Pro (Logic):**
```
Input: Birth date, time, location, etc.
Task: Calculate BaZi, analyze MBTI, generate structured data
Output: JSON with all calculation results
```

**Step 2 - Gemini 3 Pro Image (Visual):**
```
Input: JSON data from Step 1
Task: Generate image using PURE VISUAL description
Output: Soul Codex card image (9:16 portrait)
```

**2. Optimized Image Prompt**

❌ **Old (Caused 422 Error):**
```
你同时精通《渊海子平》《滴天髓》... [1500+ Chinese characters]
请严格按以下7步执行：
1. 用真太阳时精准排出我的四柱八字...
2. 用传统古法排出我的日主五行旺衰...
[Complex logical reasoning required]
```

✅ **New (Works!):**
```
Create a mystical Chinese astrology card in vertical 9:16...

TOP SECTION:
- Golden seal script title: "张三的灵魂契合卡"
- Holographic purple-black gradient

LEFT PANEL:
- Circular BaZi wheel: Year 甲子, Month 丙寅...
- Ten Gods: 偏印, 食神...

[Pure visual description, no logic required]
```

---

## 🧪 Testing Checklist

After deployment, verify:

- [ ] Environment variable `APIMART_API_KEY` is set
- [ ] Redeployment triggered and completed
- [ ] Test page loads: `/test-apimart.html`
- [ ] Click "Test Complete Flow" button
- [ ] See "Step 1/4" - API called successfully
- [ ] See "Step 2/4" - Report generated
- [ ] See "Step 3/4" - Analysis JSON displayed
- [ ] See "Step 4/4" - Image appears (may take 5-15 seconds)
- [ ] Image is downloadable (click link)
- [ ] No errors in browser console
- [ ] Check Vercel logs for `[APIMart Chat]` and `[APIMart Image]` entries

---

## 📊 Monitoring & Logs

### Vercel Logs

Visit: https://vercel.com/rebootmindful/natalcodex/logs

**Search for:**

1. `[APIMart Chat]` - Gemini analysis logs
   ```
   [APIMart Chat] Starting BaZi + MBTI analysis...
   [APIMart Chat] API Response received
   [APIMart Chat] Analysis completed: 戊土建筑师·INTJ
   ```

2. `[APIMart Image]` - Image generation logs
   ```
   [APIMart Image] Starting image generation...
   [APIMart Image] Task created: task_abc123
   ```

3. `[APIMart Query]` - Task polling logs
   ```
   [APIMart Query] Checking task: task_abc123
   [APIMart Query] Task status: completed
   ```

4. `[GenerateWithAPImart]` - Complete flow logs
   ```
   [GenerateWithAPImart] Step 1/4: Analyzing with Gemini...
   [GenerateWithAPImart] Step 2/4: Building report...
   [GenerateWithAPImart] Step 3/4: Creating image task...
   [GenerateWithAPImart] Step 4/4: Waiting for image...
   [GenerateWithAPImart] Complete flow finished successfully
   ```

### Expected Timeline

- **Analysis (Step 1):** ~3-8 seconds
- **Report building (Step 2):** <1 second
- **Image task creation (Step 3):** ~1-2 seconds
- **Image generation (Step 4):** ~5-15 seconds
- **Total:** ~10-25 seconds

---

## 🐛 Troubleshooting

### Issue: "Unexpected token 'T', 'The page c'..." (FIXED)

**Cause:** Previous version made internal HTTP fetch() calls to other Vercel endpoints (/api/apimart/chat, etc.), which returned HTML error pages instead of JSON

**Symptoms:**
- Frontend shows: `Error: Unexpected token 'T', "The page c"... is not valid JSON`
- All three sections fail: Report, Analysis, Image

**Fix Applied (2024-12-03):**
- Refactored `/api/reports/generateWithAPImart.js` to call APIMart API directly
- Removed internal endpoint dependencies
- All API calls now go to `https://api.apimart.ai/v1/*` with Authorization header

**Status:** ✅ RESOLVED - Deploy latest version from GitHub

---

### Issue: "API Error: 401"

**Cause:** APIMART_API_KEY not set or incorrect

**Fix:**
1. Verify environment variable in Vercel settings
2. Ensure it's enabled for Production
3. Trigger Redeploy

### Issue: "Model not found"

**Cause:** Model name changed or unavailable

**Fix:**
1. Check available models: `GET https://api.apimart.ai/v1/models`
2. Update `api/apimart/config.js` if needed:
   ```javascript
   MODELS: {
     CHAT: 'gemini-3-pro-preview',
     IMAGE: 'gemini-3-pro-image-preview'
   }
   ```

### Issue: Image generation timeout

**Cause:** Task takes longer than 60 seconds

**Current behavior:** API returns report + analysis, but `imageUrl: null`

**Solutions:**
1. Frontend can continue polling with `taskId`
2. Increase `maxAttempts` in `generateWithAPImart.js`
3. Implement webhook (optional, for instant callback)

### Issue: Image prompt not working

**Cause:** Prompt may need further optimization

**Fix:**
1. Check Vercel logs for actual prompt sent
2. Test prompt directly via APIMart dashboard
3. Simplify prompt further if needed
4. Adjust in `api/apimart/generateImage.js` → `buildImagePrompt()`

---

## 🔄 Rollback Plan

If APIMart integration has issues, you can temporarily revert:

1. **Keep both integrations:**
   - Old: `/api/kie/*` endpoints (KIE API)
   - New: `/api/apimart/*` endpoints (APIMart)

2. **Switch frontend:**
   - Update `result.html` to call old or new endpoints
   - Use feature flag in code

3. **Environment variables:**
   - Both `KIE_API_KEY` and `APIMART_API_KEY` can coexist
   - Switch by changing API endpoint URLs

---

## 📈 Next Steps

### Phase 1: Basic Integration ✅ (Current)
- ✅ Gemini 3 Pro analysis
- ✅ Gemini 3 Pro Image generation
- ✅ Complete flow with polling
- ✅ Test page

### Phase 2: Production Ready
- [ ] Update `result.html` to use APIMart endpoints
- [ ] Add loading animations
- [ ] Error handling improvements
- [ ] Implement webhook for instant callback (optional)

### Phase 3: Optimization
- [ ] Cache analysis results (avoid re-analysis)
- [ ] Implement retry logic
- [ ] Add prompt A/B testing
- [ ] Monitor usage and costs

---

## 💰 Cost Estimation

### APIMart Pricing (Estimated)

- **Gemini 3 Pro Chat:** ~$0.01-0.02 per analysis
- **Gemini 3 Pro Image:** ~$0.05-0.08 per image
- **Total per complete flow:** ~$0.06-0.10

### Compared to KIE API

- **KIE API:** ~$0.10 per image (when working)
- **APIMart:** ~$0.06-0.10 per complete flow (analysis + image)

**Savings:** Similar cost, but **much more reliable** and **includes AI analysis**!

---

## 📞 Support

### APIMart Support
- Documentation: https://docs.apimart.ai/
- Dashboard: https://apimart.ai/dashboard
- API Status: Check models endpoint

### Project Issues
- GitHub: https://github.com/rebootmindful/NatalCodex/issues
- Check Vercel logs for detailed error traces

---

## ✅ Deployment Checklist

Before marking deployment as complete:

- [ ] Code committed to GitHub
- [ ] `APIMART_API_KEY` set in Vercel
- [ ] Redeploy triggered
- [ ] Deployment shows green checkmark
- [ ] Test page loads successfully
- [ ] Complete flow test passes
- [ ] Image generates successfully
- [ ] Vercel logs show successful execution
- [ ] No errors in browser console
- [ ] Documentation updated

---

**Status:** ✅ Ready to deploy!
**Estimated completion time:** 5-10 minutes (after code push)
**Risk level:** Low (old KIE endpoints unchanged, new system is additive)

🚀 **Let's deploy and test!**
