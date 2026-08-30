
1) افتح PowerShell في مجلد frontend

```powershell
cd "C:\xampp\htdocs\accsystem\accore_erp\frontend"
```

2) شغّل السكربت الذي يجهز الـ runtime

```powershell
node .\scripts\prepare-server-runtime.mjs windows-x86_64
```

هذا السكربت موجود في:
`frontend/scripts/prepare-server-runtime.mjs`

هو يقوم بـ:
- يكتشف target الجهاز
- ينزل ملفات FrankenPHP و MariaDB من الروابط الرسمية
- يتحقق من SHA-256
- يضعها في:
  `frontend/src-tauri/resources/server-runtime/windows-x86_64`

3) إذا كان ملف الـ agent مفقود، ابنيه

```powershell
cd "C:\xampp\htdocs\accsystem\accore_erp\distribution\crates\accore-server-agent"
cargo build --release
```

الملف الناتج يكون هنا عادةً:
```powershell
C:\xampp\htdocs\accsystem\accore_erp\distribution\crates\accore-server-agent\target\release\accore-server-agent.exe
```

4) انسخ الـ agent إلى مجلد binaries الخاص بـ Tauri

```powershell
$src = "C:\xampp\htdocs\accsystem\accore_erp\distribution\crates\accore-server-agent\target\release\accore-server-agent.exe"
$dstDir = "C:\xampp\htdocs\accsystem\accore_erp\frontend\src-tauri\binaries"

New-Item -ItemType Directory -Force -Path $dstDir | Out-Null
Copy-Item $src "$dstDir\accore-server-agent.exe" -Force
Copy-Item $src "$dstDir\accore-server-agent-x86_64-pc-windows-msvc.exe" -Force
```

5) تحقق أن الـ runtime صحيح ومكتمل

```powershell
cd "C:\xampp\htdocs\accsystem\accore_erp\frontend"
node .\scripts\verify-server-runtime-package.mjs windows-x86_64
```

السكريبت موجود هنا:
`frontend/scripts/verify-server-runtime-package.mjs`

6) الآن شغّل البناء النهائي

```powershell
cd "C:\xampp\htdocs\accsystem\accore_erp\frontend"
npm run desktop:server:build
```

مهم:
- Tauri في `frontend/src-tauri/tauri.server.conf.json` يحتاج:
  - `binaries/accore-server-agent.exe`
  - `resources/server-runtime/windows-x86_64/...`
- بدون هذا، البناء ينهار بنفس الخطأ الذي ظهرت لك

إذا تحب، أقدر أكتب لك نسخة PowerShell واحدة "one-click" فقط، بحيث تضعها في مجلد المشروع وتشغلها مرة واحدة وتنجز كل الخطوات تلقائيًا.