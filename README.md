# Twitch & Kick Bing Translator

افزونه Chrome/Chromium برای ترجمه خودکار پیام‌های چت Twitch و Kick به فارسی.

## نصب
1. وارد chrome://extensions شوید.
2. Developer mode را روشن کنید.
3. Load unpacked را بزنید.
4. پوشه این ریپو را انتخاب کنید.
5. Twitch یا Kick را باز کنید.

## وضعیت MVP
- Twitch و Kick
- ترجمه به فارسی
- Bing Translator
- cache ترجمه
- صف با حداکثر ۲ درخواست همزمان
- حذف ترجمه برای پیام‌های بسیار کوتاه مثل lol و gg

## Bing
این نسخه از endpoint وب Bing Translator (ttranslatev3) و token داخلی صفحه Translator استفاده می‌کند، مشابه MouseTooltipTranslator. این API رسمی Azure Translator نیست و ممکن است تغییر کند یا محدود شود.

برای انتشار عمومی و پایدار، بهتر است بعداً Azure Translator هم به‌عنوان adapter اضافه شود.
