# ☁️ POS System ကို Internet ပေါ် အခမဲ့တင်နည်း (Docker မလို၊ Computer ထဲ Install ဘာမှမလို)

ဒီနည်းလမ်းက **Docker** အစား **Cloud (Internet ပေါ်က Server)** ကို သုံးပါမယ်။ Database ကအစ Browser ကနေ Account ဖွင့်ပြီး setup လုပ်ရတာဖြစ်တဲ့အတွက် ကွန်ပျူတာထဲ ဘာမှ install လုပ်စရာမလိုပါ။ Result အနေနဲ့ Link (URL) တစ်ခုရရှိမှာဖြစ်ပြီး ဘယ်နေရာကမှ (ဖုန်းကနေပါ) ဖွင့်ကြည့်နိုင်ပါမယ်။

**Account အခမဲ့ ၃ ခု ဖွင့်ရပါမယ်:**
1. **GitHub** — Code ကို သိမ်းမယ့်နေရာ
2. **Neon** — Database (PostgreSQL) အခမဲ့ Host
3. **Render** — App ကို Run ပေးမယ့် Server အခမဲ့ Host

⏱️ စုစုပေါင်း ၁၅-၂၀ မိနစ်လောက် ကြာနိုင်ပါတယ်။ အောက်က အဆင့်တွေကို အစဉ်လိုက် လုပ်ပါ။

---

## အဆင့် ၁ — GitHub မှာ Code တင်ခြင်း

1. **https://github.com** သွားပြီး Account အသစ် Sign up လုပ်ပါ (Email လိုပါမယ်)။
2. Login ဝင်ပြီးရင် ညာဘက်အပေါ်က **"+"** ကိုနှိပ်ပြီး **"New repository"** ကို ရွေးပါ။
3. Repository name မှာ `pos-system` လို့ ရိုက်ထည့်ပါ (Public ရွေးထားလို့ရပါတယ်) → **"Create repository"** နှိပ်ပါ။
4. ပွင့်လာတဲ့ Page မှာ **"uploading an existing file"** ဆိုတဲ့ Link ကို ရှာပြီး နှိပ်ပါ။
5. `pos-system.zip` ကို Extract လုပ်ထားတဲ့ Folder ထဲက **Files/Folder အားလုံး** ကို ဒီ Page ပေါ်မှာ Drag-and-Drop ဆွဲချပါ (Folder တစ်ခုလုံးကို တန်းဆွဲချလို့ ရပါတယ်)။
6. Upload ပြီးရင် အောက်ဆုံးက **"Commit changes"** (အစိမ်းရောင် Button) ကို နှိပ်ပါ။

✅ ဒီအဆင့်ပြီးရင် Code တွေ GitHub ပေါ်တင်ပြီးပါပြီ။

---

## အဆင့် ၂ — Neon မှာ Database တည်ဆောက်ခြင်း

1. **https://neon.tech** သွားပြီး Sign up လုပ်ပါ (GitHub account နဲ့ပဲ Login ဝင်လို့ရပါတယ်)။
2. **"Create a project"** နှိပ်ပါ — Project name အလွတ်ပေးလို့ ရပါတယ် (e.g. `pos-system`) → **Create** နှိပ်ပါ။
3. Project ပွင့်လာရင် **"Connection string"** ဆိုတဲ့ Box ကို ရှာပါ (ပုံစံက `postgresql://...` နဲ့ စပါတယ်) → **Copy** နှိပ်ပြီး ဘယ်ကို Save ထားပါ (Notepad ထဲ ထည့်ထားလို့ရပါတယ်) — **အဆင့် ၄ မှာ ပြန်လိုပါမယ်**။
4. ဘယ်ဘက် Menu ထဲက **"SQL Editor"** ကို နှိပ်ပါ။
5. `pos-system/backend/schema.sql` ဖိုင်ကို Text Editor (Notepad) နဲ့ ဖွင့်ပြီး **အကုန်လုံး Copy** လုပ်ပါ → Neon ရဲ့ SQL Editor box ထဲ Paste လုပ်ပါ → **"Run"** နှိပ်ပါ။
6. အောက်က Box ကို Clear လုပ်ပြီး `pos-system/backend/seed.sql` ဖိုင်ကိုလည်း အလားတူ Copy → Paste → **"Run"** နှိပ်ပါ။

✅ Database အသင့်ဖြစ်ပါပြီ — Demo account တွေ၊ Sample ပစ္စည်းတွေ အကုန်ပါပြီ။

---

## အဆင့် ၃ — Render မှာ App ကို Deploy လုပ်ခြင်း

1. **https://render.com** သွားပြီး Sign up လုပ်ပါ (GitHub account နဲ့ Login ဝင်ရင် ပိုလွယ်ပါတယ် — GitHub repo တွေကို အလိုအလျောက် မြင်ရမှာပါ)။
2. Dashboard မှာ **"New +"** → **"Web Service"** ကို ရွေးပါ။
3. GitHub repo list ထဲက `pos-system` ကို ရှာပြီး **"Connect"** နှိပ်ပါ။
4. အောက်က Setting တွေကို ဖြည့်ပါ:
   | Field | တန်ဖိုး |
   |---|---|
   | **Name** | `pos-system` (ဒါမှမဟုတ် ကြိုက်တဲ့နာမည်) |
   | **Root Directory** | `backend` |
   | **Runtime** | `Node` |
   | **Build Command** | `npm install` |
   | **Start Command** | `node server.js` |
   | **Instance Type** | `Free` |
5. **"Environment Variables"** ဆိုတဲ့ နေရာမှာ အောက်ပါ ၃ ခုကို Add ပါ (**"Add Environment Variable"** ကို ၃ ကြိမ် နှိပ်ပါ):
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | (Neon ကနေ Copy ထားတဲ့ Connection string ကို Paste ပါ) |
   | `JWT_SECRET` | မည်သည့် Random စာလုံးအတွဲမှ ရိုက်ထည့်ပါ (e.g. `mySuperSecretKey2026XYZ`) |
   | `JWT_EXPIRES_IN` | `8h` |
6. **"Create Web Service"** ကို နှိပ်ပါ။

Render က Build + Deploy ကို အလိုအလျောက် စလုပ်ပါမယ် (၂-၅ မိနစ်လောက် ကြာနိုင်ပါတယ်)။ Log ထဲမှာ `POS backend API running...` ဆိုတဲ့ စာတန်း မြင်ရရင် အောင်မြင်ပါပြီ။

✅ Page အပေါ်ဘက်မှာ **`https://pos-system-xxxx.onrender.com`** ပုံစံ Link တစ်ခု ပေါ်လာပါမယ် — ဒါက သင့် POS App ရဲ့ Link ဖြစ်ပါတယ်။

---

## အသုံးပြုနည်း

Link ကို Browser (ဖုန်း/ကွန်ပျူတာ မရွေး) မှာ ဖွင့်ပါ။ Login screen ပေါ်လာပါမယ် — Demo account တွေနဲ့ ဝင်ပါ:

| Username | Password | Role |
|---|---|---|
| admin | admin123 | Admin |
| manager | manager123 | Manager |
| cashier | cashier123 | Cashier |

⚠️ **Free tier ရဲ့ သဘောသဘာဝ:** အသုံးမပြုတာ ၁၅ မိနစ်လောက် ကြာရင် Server က "အိပ်" သွားပါတယ် (cost မကုန်ရအောင်)။ နောက်တစ်ခါ ပြန်ဖွင့်တဲ့အခါ ပထမတစ်ကြိမ် load ဖို့ ၃၀ စက္ကန့်လောက် ကြာနိုင်ပါတယ် — ဒါက Bug မဟုတ်ပါ၊ Free tier ရဲ့ Normal behavior ပါ။

⚠️ **အရေးကြီး:** Real ဆိုင်စာရင်းအတွက် သုံးခင် Demo password တွေကို admin account ကနေ ပြောင်းပါ (ဒါမှမဟုတ် User အသစ် ဖန်တီးပါ)။

---

## နောက်ပိုင်း Code ပြောင်းချင်ရင် (Update)

`pos-system` folder ထဲက ဖိုင်တွေကို ပြင်ပြီးရင်:
1. GitHub repo Page ကို သွားပါ → ပြင်ထားတဲ့ ဖိုင်ကို ရှာပြီး Click ပါ → ✏️ (Edit) Icon နှိပ်ပါ → ပြင်ပြီးရင် **"Commit changes"** နှိပ်ပါ။
2. Render က GitHub ပြောင်းလဲမှုကို အလိုအလျောက် သိပြီး App ကို ပြန် Deploy ပေးပါလိမ့်မယ် (Render Dashboard ထဲမှာ "Auto-Deploy" ဖွင့်ထားရင်)။

---

## တစ်ခုခု မှားယွင်းနေရင် (Troubleshooting)

- **Render Log ထဲမှာ "Cannot connect to database" ဆိုတဲ့ Error:** `DATABASE_URL` ကို Neon ကနေ မှန်မှန် Copy ထားလားဆိုတာ ပြန်စစ်ပါ (`postgresql://` နဲ့ စရမှာပါ)။
- **Login လုပ်လို့ မရရင်:** Neon SQL Editor ထဲမှာ `schema.sql` နဲ့ `seed.sql` ကို Run ပြီးမြီလားဆိုတာ ပြန်စစ်ပါ (SQL Editor ထဲမှာ `SELECT * FROM users;` ရိုက်ပြီး Run ကြည့်ရင် Account ၃ ခု မြင်ရရပါမယ်)။
- **Render Build Fail ဖြစ်ရင်:** Root Directory ကို `backend` ဟုတ်/မဟုတ် ပြန်စစ်ပါ။
- **App ပွင့်ပေမယ့် ပုံပျက်နေရင် (CSS မလာ):** Render Build ထပ် run ကြည့်ပါ (Render Dashboard → "Manual Deploy" → "Clear build cache & deploy")။
