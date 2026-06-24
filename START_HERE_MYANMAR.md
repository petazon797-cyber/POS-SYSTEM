# 🛒 POS System — စတင်အသုံးပြုနည်း (Computer အကြောင်း နားမလည်သူများအတွက်)

## ပထမဆုံး လုပ်ရမှာ — Docker Desktop ကို install လုပ်ပါ
ဒါက program "ဘောက်စ်" တစ်ခုလိုပါပဲ — ဒီတစ်ခုတည်း install လုပ်ထားရင် ကျန်တာအကုန် အလုပ်လုပ်ပါမယ်။

👉 ဒီနေရာကနေ Download လုပ်ပါ: **https://www.docker.com/products/docker-desktop/**

- Download ပြီးရင် install လုပ်ပါ (Next, Next နှိပ်ရုံပါ)
- Install ပြီးရင် Docker Desktop ကို တစ်ခါဖွင့်ပါ (icon ကို double-click)။ "Docker is running" ဆိုတဲ့ စာတန်း (သို့) အစိမ်းရောင် icon မြင်ရရင် အဆင်သင့်ဖြစ်ပါပြီ။

## ဒုတိယအဆင့် — Folder ကို ဖွင့်ပြီး command တစ်ခုတည်း run ပါ

1. Download ထားတဲ့ zip ဖိုင် (`pos-system.zip`) ကို Extract / Unzip လုပ်ပါ။
2. Extract လုပ်ထားတဲ့ folder (`pos-system`) ကို ဖွင့်ပါ။
3. Folder အလွတ်နေရာမှာ:
   - **Windows:** Folder ထဲက လမ်းကြောင်း (address bar) မှာ `cmd` ရိုက်ပြီး Enter နှိပ်ပါ — Terminal ပွင့်လာပါမယ်။
   - **Mac:** Folder ပေါ်မှာ right-click ပြီး "New Terminal at Folder" ကို ရွေးပါ။
4. Terminal ထဲမှာ အောက်က command ကို ရိုက်ပြီး Enter နှိပ်ပါ:
   ```
   docker compose up
   ```
5. ပထမဆုံးအကြိမ် run တာဖြစ်တဲ့အတွက် (download + setup အတွက်) ၂-၃ မိနစ်လောက် ကြာနိုင်ပါတယ်။ Terminal ကို ပိတ်မထားပါနဲ့ — ဒါက server ကို run နေတာပါ။

## တတိယအဆင့် — Browser ဖွင့်ပြီး အသုံးပြုပါ

Browser (Chrome/Edge) ဖွင့်ပြီး ဒီ link ကို ရိုက်ထည့်ပါ:

👉 **http://localhost:4000**

Login screen ပေါ်လာပါမယ်။ အောက်က account တွေနဲ့ Login ဝင်နိုင်ပါတယ် (sample အကောင့်တွေ ကြိုပြင်ထားပါတယ်):

| Username  | Password    | ရာထူး          |
|-----------|-------------|------------------|
| admin     | admin123    | စီးပွားရေးပိုင်ရှင်/Admin |
| manager   | manager123  | Store Manager    |
| cashier   | cashier123  | ရောင်းကောင်တာ (Cashier) |

⚠️ **အရေးကြီး:** ဒါတွေက Demo password တွေပါ။ စစ်မှန်တဲ့ဆိုင်မှာ အသုံးပြုခင် Password တွေကို ပြောင်းပါ (admin အကောင့်ကနေ user အသစ်ဖန်တီးနိုင်ပါတယ်)။

ဆိုင်ထဲမှာ ရောင်းကြည့်လို့ ပစ္စည်း sample ၁၀ မျိုးနဲ့ Coupon code (`WELCOME10`) လည်း ထည့်ပြီးပါပြီ — Checkout ကို ချက်ချင်းစတင် စမ်းနိုင်ပါတယ်။

## ရပ်ချင်ရင် / နောက်တစ်ခါ ပြန်ဖွင့်ချင်ရင်

- **ရပ်ဖို့:** Terminal မှာ `Ctrl + C` ကို နှိပ်ပါ၊ (သို့) `docker compose down` ကို run ပါ။
- **ပြန်ဖွင့်ဖို့:** Folder ထဲကနေ `docker compose up` ကို ထပ်ရိုက်ပါ — ရောင်းခဲ့တဲ့ စာရင်းတွေ၊ ထည့်ထားတဲ့ ပစ္စည်းတွေ အကုန် မပျောက်ပါ (Database က Docker ထဲမှာ သိမ်းထားတာပါ)။

## ဘာများ ပါသလဲ

- **Checkout (ရောင်းကောင်တာ)** — Barcode scan/SKU ရိုက်ထည့်တာ၊ Product list ကနေ Click ရွေးတာ၊ Cash/KPay/WavePay/Card ပေးချေမှု၊ Coupon Code
- **Inventory** — ပစ္စည်းစာရင်း၊ Stock နည်းနေတာ/Expire နီးနေတာ Alert
- **Suppliers** — Supplier စာရင်း၊ Purchase Order ဖန်တီးခြင်း၊ ပစ္စည်းအသစ် Stock ထဲ Receive လုပ်ခြင်း
- **Reports** — နေ့စဉ်/အပတ်စဉ်/လစဉ် အရောင်း Report, အမြတ်(Profit), အရောင်းရဆုံးပစ္စည်း, Excel/PDF Export

## တစ်ခုခု မှားယွင်းနေရင် (Troubleshooting)

- `docker compose up` run လို့ error တက်ရင် → Docker Desktop ဖွင့်ထားလားဆိုတာ ပထမဆုံး စစ်ပါ။
- Port 4000 or 5432 ကို တခြား program က အသုံးပြုနေရင် error တက်နိုင်ပါတယ် — တခြား program (XAMPP, postgres အသုံးပြုနေတဲ့ app) တွေကို ပိတ်ကြည့်ပါ။
- လုံးဝ အသစ်ပြန်စချင်ရင် (Database အကုန်ဖျက်ပြီး sample data ပြန်ထည့်ချင်ရင်):
  ```
  docker compose down -v
  docker compose up
  ```
  (`-v` က Database volume ကိုပါ ဖျက်တာပါ — ရောင်းထားသမျှ စာရင်းတွေ ပျောက်သွားမှာဖြစ်တဲ့အတွက် သတိထားပါ။)
