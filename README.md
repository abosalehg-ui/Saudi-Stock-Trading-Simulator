# تداول - محاكاة سوق الأسهم السعودي 📈

<div align="center">

![Version](https://img.shields.io/badge/version-3.1.0-orange)
![License](https://img.shields.io/badge/license-MIT-blue)
![Language](https://img.shields.io/badge/languages-Arabic%20%7C%20English-green)
![Platform](https://img.shields.io/badge/platform-Web-purple)

**محاكي احترافي لتداول الأسهم السعودية مع أكثر من 90 سهماً حقيقياً وأخبار مؤثرة**

[العربية](#arabic) | [English](#english)

</div>

---

<a name="arabic"></a>
## 📋 نظرة عامة

**تداول** هي لعبة محاكاة واقعية لسوق الأسهم السعودي (تداول) تتيح لك تعلم التداول دون مخاطر مالية حقيقية. تحتوي على أكثر من 90 سهماً سعودياً حقيقياً من مختلف القطاعات مع نظام أخبار ديناميكي يؤثر على الأسعار بشكل واقعي.

## 🚧 التطوير المحلي (Local development)

```bash
npm install      # تثبيت الاعتماديات
npm run dev      # تشغيل خادم التطوير على http://localhost:5173
npm test         # تشغيل اختبارات Vitest
npm run lint     # فحص الكود عبر ESLint
npm run build    # توليد مجلد dist/ للنشر
npm run preview  # معاينة محلية للبناء النهائي
```

النشر تلقائي عبر GitHub Actions على GitHub Pages عند الدفع إلى `main`.

### 🆕 إضافات الإصدار 3.0 — تجربة تعليمية شاملة
- **📖 قاموس مصطلحات** ثنائي اللغة (25 مصطلحاً) مع بحث فوري
- **🏆 إحصائيات شخصية** دائمة: أعلى ربح، أفضل/أسوأ صفقة، إجمالي الصفقات، التحديات المُكملة، إجمالي العمولات، عدد الجلسات
- **🎓 جولة تعريفية تفاعلية** تظهر تلقائياً للمستخدم الجديد (5 خطوات، قابلة للتخطي)
- **🕯️ رسوم شموع يابانية** (Candlestick) مع تجميع OHLC تلقائي من تاريخ الأسعار
- **📚 مسارات تعلم متسلسلة** ثلاثة مستويات (مبتدئ، متوسط، متقدم) — 9 دروس مع تتبع التقدم
- **📜 سيناريوهات تاريخية** قابلة للتشغيل: انهيار 2006، طرح أرامكو 2019، صدمة نفطية، رفع الفائدة (تُعدّل مضاعفات الدريفت والتقلب على القطاعات المتأثرة لمدة محددة)

### 🆕 إضافات الإصدار 2.0
- بنية مودولية (Vite + ES Modules)، تقسيم index.html إلى `src/` مع JSDoc
- اختبارات وحدة بـ Vitest (59 اختباراً) لمنطق التداول، المؤشرات الفنية، ساعات السوق، السيناريوهات، OHLC، الإحصائيات، حفظ الحالة
- أوامر **وقف الخسارة (stop-loss)** بالإضافة إلى الأوامر السوقية والمحددة
- مؤشرات فنية على الرسم البياني: SMA 20/50 و RSI 14 و MACD
- فرض **ساعات تداول السوق السعودي** (الأحد-الخميس، 10ص-3م بتوقيت الرياض) مع وضع تجاوز "24/7"
- مرشّح **الأسهم الشرعية** 🕌 (تصنيف مبدئي، يحتاج مراجعة فقهية)
- **تاريخ هجري** بجانب الميلادي في الواجهة
- **تصدير CSV** لسجل المعاملات (UTF-8 BOM)
- تحسينات a11y: ARIA labels، تنقّل كيبورد، focus trap في المودالات، أحجام لمس ≥ 44px
- تحقق صارم من المدخلات (NaN، سالب، تجاوز الحد) مع رسائل خطأ ودودة
- ESLint + Prettier + GitHub Actions (CI + نشر)

### 🎯 الهدف من المشروع
- تعليم أساسيات التداول في سوق الأسهم
- محاكاة واقعية لتحركات الأسعار
- توفير بيئة آمنة لتجربة استراتيجيات التداول
- تقديم نصائح مالية تعليمية

---

## ✨ المميزات الرئيسية

### 📊 سوق أسهم واقعي
- **90+ سهماً سعودياً حقيقياً** من جميع القطاعات:
  - 🏦 البنوك (الراجحي، الأهلي، الرياض، وغيرها)
  - ⚗️ البتروكيماويات (سابك، معادن، اللجين)
  - 📱 الاتصالات (STC، موبايلي، زين)
  - 🛒 التجزئة (جرير، النهدي، ساكو)
  - 🏗️ الأسمنت والعقار
  - 🌾 الزراعة والأغذية
  - 🏭 الصناعة والطاقة
  - ✈️ النقل والتأمين

### 📰 نظام أخبار ديناميكي
- **14 نوع خبر** مختلف (7 إيجابية، 7 سلبية)
- تظهر الأخبار كل دقيقة بشكل عشوائي
- **تأثير حقيقي على الأسعار**: ±2% إلى ±5%
- التأثير تدريجي على مدى 5 دقائق (واقعي)
- شريط أخبار متحرك مع أيقونات ملونة 📈📉

### 💡 نصائح مالية تعليمية
- **20 نصيحة مالية** احترافية
- تغطي مواضيع مثل:
  - التنويع وإدارة المخاطر
  - الاستثمار طويل الأجل
  - التحليل الأساسي والفني
  - علم النفس في التداول
- **3 نصائح عشوائية** تظهر في كل جلسة
- متاحة باللغتين العربية والإنجليزية

### 💼 إدارة محفظة متقدمة
- **رأس مال ابتدائي**: 50,000 ريال
- عرض تفصيلي للمحفظة:
  - إجمالي الأصول
  - الرصيد النقدي
  - قيمة المحفظة
  - الربح/الخسارة (مبلغ ونسبة)
- تحليل مفصل لكل سهم:
  - متوسط تكلفة الشراء
  - السعر الحالي
  - القيمة بعد البيع (شاملة العمولة)
  - الربح/الخسارة المتوقعة

### 📈 نظام تداول احترافي
- **ثلاثة أنواع من الأوامر**:
  - أوامر سوق (Market Orders): تنفذ فورياً
  - أوامر محددة (Limit Orders): تنفذ عند سعر معين
  - **أوامر وقف الخسارة (Stop-loss)**: بيع تلقائي عند هبوط السعر
- **إدارة الأوامر المعلقة**:
  - عرض جميع الأوامر المعلقة
  - متابعة الفرق بين السعر الحالي والمحدد
  - إلغاء الأوامر في أي وقت
- **عمولات واقعية**: 0.155% لكل صفقة
- **انزلاق السعر**: محاكاة واقعية لتغير الأسعار
- **ساعات تداول حقيقية**: الأحد-الخميس 10ص-3م بتوقيت الرياض، مع وضع 24/7 اختياري للتدريب

### 🎓 تجربة تعليمية متكاملة (جديد في 3.0)
- **جولة تعريفية تفاعلية**: 5 خطوات تُعرّفك بالواجهة، تظهر تلقائياً عند أول استخدام
- **قاموس المصطلحات**: 25 مصطلحاً تداولياً (الأمر السوقي، RSI، MACD، Stop-loss، Blue Chip…) مع بحث فوري
- **مسارات تعلم متسلسلة**:
  - 🟢 المبتدئ: ما هو السهم؟ أنواع الأوامر، العمولات
  - 🟡 المتوسط: التنويع، الشموع اليابانية، SMA و RSI
  - 🔴 المتقدم: علم نفس التداول، تحجيم المراكز، تحليل القطاعات
  - تتبّع تقدّمك في كل مسار
- **سيناريوهات تاريخية**: عش أحداثاً تاريخية مع تأثيرات حقيقية على القطاعات
  - انهيار 2006 (ضغط على البنوك والعقار)
  - طرح أرامكو 2019 (ارتفاع في الطاقة والقيادية)
  - صدمة نفطية (ضرر للبتروكيماويات)
  - رفع أسعار الفائدة (تأثير مختلط على البنوك والعقار)
- **إحصائياتي الشخصية**: تتبّع دائم لـ:
  - أعلى ربح حققته
  - أفضل وأسوأ صفقة (مع الأسهم)
  - إجمالي الصفقات والعمولات المدفوعة
  - التحديات المُكملة وعدد الجلسات

### 🎯 نظام التحديات
- **التحدي الأول**: ربح 10% → مكافأة 100,000 ريال
- **التحدي الثاني**: ربح 20% → مكافأة 300,000 ريال
- شريط تقدم مرئي لكل تحدي

### 📊 تحليل مرئي
- **رسم بياني تفاعلي** لكل سهم باستخدام Chart.js
- عرض آخر 100 نقطة سعرية
- تحديث مباشر للأسعار
- **مؤشرات فنية** قابلة للتفعيل: SMA 20، SMA 50، RSI 14
- **رسوم شموع يابانية** (Candlestick) ✨ — تجميع OHLC تلقائي

### ⚡ سرعة المحاكاة
- **3 سرعات**: 1x، 5x، 10x
- تسريع الوقت لاختبار الاستراتيجيات بسرعة

### 🌐 واجهة ثنائية اللغة
- **تبديل فوري** بين العربية والإنجليزية
- جميع النصوص والأخبار والنصائح مترجمة
- دعم RTL للعربية و LTR للإنجليزية

### 💾 حفظ تلقائي
- حفظ تلقائي لحالة اللعبة في المتصفح
- استئناف من حيث توقفت
- حفظ:
  - الرصيد والمحفظة
  - الأوامر المعلقة (بما فيها وقف الخسارة)
  - تاريخ المعاملات
  - التحديات المكتملة
  - تقدّم الدروس المُكملة
  - الإحصائيات الشخصية الدائمة
  - السيناريو النشط (إن وُجد)

---

## 🚀 كيفية الاستخدام

### 1️⃣ البدء في التداول
```
1. افتح اللعبة في متصفحك
2. ستبدأ برأس مال 50,000 ريال
3. تصفح قائمة الأسهم المتاحة
```

### 2️⃣ شراء الأسهم
```
1. انقر على أي سهم من القائمة
2. ستظهر نافذة تفصيلية تحتوي على:
   - السعر الحالي
   - الرسم البياني
   - نموذج الشراء/البيع
3. اختر نوع الأمر (سوق أو محدد)
4. أدخل الكمية
5. انقر على "شراء"
```

### 3️⃣ بيع الأسهم
```
1. انتقل إلى تبويب "المحفظة"
2. ستجد جميع أسهمك مع تفاصيلها
3. انقر على "بيع الكل" لبيع سهم معين
4. أو انقر على السهم واختر كمية معينة للبيع
```

### 4️⃣ الأوامر المحددة
```
1. اختر "محدد" عند إنشاء الأمر
2. أدخل السعر الذي تريد الشراء/البيع عنده
3. سيظهر الأمر في تبويب "الأوامر"
4. سيُنفذ تلقائياً عند وصول السعر
```

### 5️⃣ متابعة الأخبار
```
- راقب شريط الأخبار في الأعلى
- الأخبار الإيجابية 📈 ترفع السعر
- الأخبار السلبية 📉 تخفض السعر
- التأثير تدريجي على مدى 5 دقائق
```

### 6️⃣ الاستفادة من النصائح
```
- اقرأ النصائح المالية أسفل الصفحة
- تتغير عند تحديث الصفحة
- تطبيق النصائح يحسن أداءك
```

---

## 🎮 الأدوات والأزرار

| الأداة | الوظيفة |
|--------|----------|
| 📊 **السوق** | عرض جميع الأسهم المتاحة للتداول |
| 💼 **المحفظة** | عرض أسهمك الحالية وأدائها |
| 📋 **الأوامر** | إدارة الأوامر المعلقة |
| 🔄 **إعادة تعيين** | بدء لعبة جديدة (مسح كل البيانات) |
| **1x / 5x / 10x** | تسريع/تبطيء الوقت |
| 🌐 **E / ع** | تبديل اللغة |

---

## 📊 البيانات المعروضة

### شريط الإحصائيات العلوي
```
┌─────────────┬──────────────┬───────────────┬──────────────┐
│ الرصيد النقدي │ قيمة المحفظة │ إجمالي الأصول │ الربح/الخسارة │
└─────────────┴──────────────┴───────────────┴──────────────┘
```

### تفاصيل السهم (عند النقر)
- اسم الشركة ورمز السهم
- السعر الحالي
- نسبة التغير
- رسم بياني للأسعار
- نموذج تداول

### تفاصيل المحفظة
- عدد الأسهم
- متوسط سعر الشراء
- إجمالي التكلفة
- القيمة السوقية الحالية
- القيمة بعد البيع (بعد العمولة)
- الربح/الخسارة المتوقعة

---

## 💻 المتطلبات التقنية

### المتصفحات المدعومة
- ✅ Google Chrome (موصى به)
- ✅ Mozilla Firefox
- ✅ Microsoft Edge
- ✅ Safari
- ✅ Opera

### الحد الأدنى من المواصفات
- متصفح حديث يدعم:
  - HTML5
  - CSS3
  - JavaScript ES6+
  - LocalStorage API
  - Canvas API (لـ Chart.js)

### المكتبات والأدوات المستخدمة
- **Vite 5**: أداة البناء والـ dev server
- **Chart.js 3.9.1** (عبر npm): للرسوم البيانية الخطية والمؤشرات
- **Canvas API**: للرسوم الشمعية المخصصة (بدون اعتماديات إضافية)
- **Vitest + jsdom**: لاختبارات الوحدة (59 اختباراً)
- **ESLint + Prettier**: لجودة الكود وتنسيقه
- **Intl.DateTimeFormat**: للتاريخ الهجري (native، بدون مكتبات)
- **GitHub Actions**: للـ CI والنشر التلقائي على GitHub Pages

### بنية المشروع
```
src/
├── main.js                  # نقطة الدخول
├── config.js                # الثوابت
├── state.js                 # حالة اللعبة والإحصائيات + localStorage
├── data/                    # بيانات (أسهم، أخبار، نصائح، دروس، سيناريوهات، قاموس)
├── engine/                  # منطق الأعمال (أسعار، تداول، مؤشرات، ساعات السوق، OHLC، سيناريوهات، إحصائيات)
├── ui/                      # طبقة الواجهة (عرض، مودالات، رسوم، جولة، قاموس، تعلم...)
├── utils/                   # دوال مساعدة (أرقام، تواريخ)
└── styles/main.css          # كل أنماط CSS

tests/                       # اختبارات Vitest
.github/workflows/           # ci.yml + deploy.yml
```

---

## 🎨 التصميم والألوان

### نظام الألوان
```css
الخلفية الرئيسية: #1a1a2e → #16213e (gradient)
الشريط العلوي: #0f3460
اللون الأساسي: #16a085 (أخضر فيروزي)
اللون الثانوي: #6b16a0 (بنفسجي)
الإيجابي: #2ecc71 (أخضر)
السلبي: #e74c3c (أحمر)
التحذير: #f39c12 (برتقالي)
```

### تصميم متجاوب
- تصميم كامل لشاشات الكمبيوتر
- واجهة مُحسّنة للجوال والتابلت
- شريط الإحصائيات ثابت عند التمرير (Mobile)

---

## 🔧 استخدامات تعليمية

### 📚 للمبتدئين
- **تعلم أساسيات التداول** دون مخاطر
- فهم مفاهيم مثل:
  - العمولات
  - أوامر السوق والأوامر المحددة
  - الربح والخسارة
  - التنويع

### 📈 للمتداولين
- **اختبار الاستراتيجيات** قبل التطبيق الفعلي
- تعلم إدارة المحفظة
- فهم تأثير الأخبار على الأسعار
- التدرب على ضبط النفس

### 🎓 للمعلمين
- أداة تعليمية تفاعلية
- شرح مفاهيم السوق المالي
- تطبيق عملي للنظريات الاقتصادية
- تقييم فهم الطلاب

### 👨‍💼 لرواد الأعمال
- فهم أساسيات سوق الأسهم
- تعلم قراءة الرسوم البيانية
- إدراك أهمية الأخبار الاقتصادية

---

## 📝 نصائح للفوز

### 💎 استراتيجيات ناجحة
1. **نوّع محفظتك**: لا تضع كل أموالك في سهم واحد
2. **تابع الأخبار**: استغل الأخبار الإيجابية للشراء
3. **استخدم الأوامر المحددة**: للشراء بسعر أفضل
4. **كن صبوراً**: الاستثمار طويل الأجل أكثر أماناً
5. **راقب العمولات**: تكلفك 0.155% لكل صفقة

### ⚠️ أخطاء يجب تجنبها
- ❌ المضاربة السريعة المتكررة
- ❌ الشراء عند القمة والبيع عند القاع
- ❌ تجاهل النصائح المالية
- ❌ عدم متابعة الأخبار
- ❌ الاستثمار بكامل الرصيد

---

## 🏆 معلومات عن الأسهم

### القطاعات المتاحة
```
🏦 البنوك (10 أسهم)
⚗️ البتروكيماويات (10 أسهم)
📱 الاتصالات (4 أسهم)
🛒 التجزئة (8 أسهم)
🏥 الرعاية الصحية (سهم واحد)
🛡️ التأمين (9 أسهم)
🏗️ الأسمنت (8 أسهم)
⚡ الطاقة (3 أسهم)
🏘️ العقار (7 أسهم)
🚚 النقل (3 أسهم)
📺 الإعلام (سهمان)
🏨 الفنادق والسياحة (3 أسهم)
🌾 الزراعة والأغذية (7 أسهم)
🏭 الصناعة (11 سهماً)
👷 التشييد والبناء (5 أسهم)
```

### كيفية اختيار الأسهم
1. **ابحث عن التنوع**: وزّع على قطاعات مختلفة
2. **راقب التغيرات**: الأسهم الخضراء صاعدة
3. **تابع الأخبار**: شراء عند الأخبار الإيجابية
4. **احسب التكلفة**: تأكد من قدرتك الشرائية

---

## 🔐 الخصوصية والأمان

### 🛡️ بياناتك آمنة
- ✅ **لا توجد خوادم**: كل شيء محلي في متصفحك
- ✅ **لا تسجيل دخول**: لا حاجة لحساب
- ✅ **لا بيانات شخصية**: لا نجمع أي معلومات
- ✅ **LocalStorage فقط**: البيانات محفوظة محلياً

### 📁 البيانات المحفوظة
```javascript
// tadawulGame — حالة اللعبة
{
  "cash": 50000,
  "portfolio": {...},
  "transactions": [...],
  "pendingOrders": [...],
  "speed": 1,
  "initialCapital": 50000,
  "challenge1Completed": false,
  "challenge2Completed": false,
  "shariaFilter": false,
  "allow24Trading": false,
  "tourCompleted": false,
  "completedLessons": {...},
  "activeScenario": null,
  "schemaVersion": 1
}
// إضافة إلى: tadawulPrices (الأسعار وتاريخها)، tadawulStats (الإحصائيات الشخصية)، tadawulLang (اللغة)
```

---

## 🛠️ التقنيات المستخدمة

### Frontend
```
HTML5        ████████████████████ 100%
CSS3         ████████████████████ 100%
JavaScript   ████████████████████ 100%
```

### المكتبات
- **Chart.js 3.9.1**: الرسوم البيانية التفاعلية (مضمّنة في حزمة Vite، بدون CDN)

### APIs
- **LocalStorage API**: حفظ البيانات
- **Canvas API**: رسم الرسوم البيانية

### تقنيات متقدمة
- **Geometric Brownian Motion**: لمحاكاة حركة الأسعار
- **Event-Driven Architecture**: لتحديث الواجهة
- **Responsive Design**: تصميم متجاوب بالكامل

---

## 📄 الترخيص

هذا المشروع مفتوح المصدر تحت رخصة MIT.

```
MIT License

Copyright (c) 2024 Abdulkareem Al-Aboud

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

---

## 👨‍💻 المطور

**تطوير: عبدالكريم العبود**

📧 البريد الإلكتروني: [abo.saleh.g@gmail.com](mailto:abo.saleh.g@gmail.com)

---

## 🤝 المساهمة

نرحب بمساهماتكم! إذا كان لديك اقتراحات أو تحسينات:

### كيفية المساهمة
1. **Fork** المشروع
2. أنشئ **Branch** جديد (`git checkout -b feature/amazing-feature`)
3. **Commit** تغييراتك (`git commit -m 'Add amazing feature'`)
4. **Push** إلى Branch (`git push origin feature/amazing-feature`)
5. افتح **Pull Request**

### مجالات المساهمة
- 🐛 إصلاح الأخطاء
- ✨ إضافة ميزات جديدة
- 📝 تحسين الوثائق
- 🎨 تحسين التصميم
- 🌍 إضافة لغات جديدة
- 🧪 كتابة اختبارات

---

## 🔄 سجل التحديثات

### الإصدار 3.1.0
```
✅ حفظ الأسعار وتاريخها بين الجلسات (لا تعود الأسعار للصفر عند التحديث)
✅ حفظ تفضيل اللغة، وترجمة الأخبار النشطة فور تبديل اللغة
✅ تحقق صارم من الحفظات المحملة (schemaVersion) لمنع فساد البيانات
✅ تدقيق بيانات الأسهم: تصحيح رموز وقطاعات (الراجحي 1120، الأهلي 1180، الكهرباء 5110…)
✅ إصلاح احتساب مكافآت التحديات ضمن رأس المال بدل الربح
✅ إلغاء الأوامر المعلقة بمعرّف ثابت، وتسجيل كل الصفقات في الإحصائيات
✅ تنفيذ الأوامر المحددة على سعر السوق الحالي (الأفضل)
✅ ملف LICENSE رسمي (MIT)
```

### الإصدار 3.0.0
```
✅ قاموس مصطلحات ثنائي اللغة مع بحث فوري
✅ إحصائيات شخصية دائمة وجولة تعريفية تفاعلية
✅ رسوم شموع يابانية ومسارات تعلم ثلاثية المستويات
✅ سيناريوهات تاريخية قابلة للتشغيل
```

### الإصدار 2.0.0
```
✅ بنية مودولية (Vite + ES Modules) واختبارات Vitest
✅ أوامر وقف الخسارة ومؤشرات SMA/RSI
✅ ساعات تداول السوق السعودي مع وضع 24/7
✅ مرشح الأسهم الشرعية وتاريخ هجري وتصدير CSV
✅ تحسينات إتاحة (a11y) وESLint + Prettier + CI
```

### الإصدار 1.0.0 (2024)
```
✅ إطلاق الإصدار الأول
✅ 90+ سهماً سعودياً حقيقياً
✅ نظام أخبار ديناميكي مؤثر على الأسعار
✅ 20 نصيحة مالية تعليمية
✅ أوامر سوق ومحددة
✅ نظام تحديات بمكافآت
✅ رسوم بيانية تفاعلية
✅ دعم كامل للعربية والإنجليزية
✅ حفظ تلقائي
✅ تصميم متجاوب
```

---

## 🌟 الميزات المستقبلية

### قريباً
- [ ] **وضع المنافسة**: تنافس مع لاعبين آخرين
- [ ] **لوحة المتصدرين**: أفضل المتداولين
- [ ] **تحليل محفظة متقدم**: مؤشرات أداء إضافية
- [ ] **تنبيهات الأسعار**: إشعارات عند وصول السعر لحد معين

### مخطط له
- [ ] **مؤشر MACD على الرسم البياني** (الخوارزمية جاهزة ومختبرة في `src/engine/indicators.js`)
- [ ] **توزيعات الأرباح**: محاكاة توزيعات نقدية
- [ ] **التقارير المالية**: ملخص شهري للأداء
- [ ] **الوضع الفاتح**: Light Mode
- [ ] **تعدد العملات**: دولار، يورو، الخ
- [ ] **أسواق عالمية**: NYSE, NASDAQ

> ملاحظة: وقف الخسارة، مؤشرات RSI/SMA، وتصدير CSV أصبحت ميزات منفَّذة منذ الإصدار 2.0.

---

## 📊 إحصائيات المشروع

```
عدد الأسهم:        91
عدد القطاعات:      15
أنواع الأخبار:     14
النصائح المالية:  20
اللغات المدعومة:   2
```

---

## 🎯 الجمهور المستهدف

- 🎓 **الطلاب**: تعلم أساسيات التداول
- 👨‍💼 **المبتدئون**: بداية آمنة قبل التداول الحقيقي
- 📈 **المتداولون**: اختبار الاستراتيجيات
- 👨‍🏫 **المعلمون**: أداة تعليمية تفاعلية
- 💼 **رواد الأعمال**: فهم الأسواق المالية

---

## 💡 أسئلة شائعة

### ❓ هل هذا تداول حقيقي؟
**لا**، هذه محاكاة تعليمية. لا أموال حقيقية متضمنة.

### ❓ هل يمكنني خسارة أموال؟
**لا**، الأموال افتراضية. يمكنك إعادة التعيين في أي وقت.

### ❓ هل الأسعار حقيقية؟
الأسهم حقيقية والأسعار الأساسية واقعية، لكن التحركات محاكاة.

### ❓ كيف أبدأ؟
افتح رابط التطبيق في متصفحك وابدأ التداول مباشرة!

### ❓ هل يعمل على الجوال؟
نعم، التصميم متجاوب ويعمل على جميع الأجهزة.

### ❓ هل بياناتي محفوظة؟
نعم، تُحفظ محلياً في متصفحك تلقائياً.

### ❓ كيف أتعلم التداول؟
اقرأ النصائح المالية، جرب استراتيجيات مختلفة، وتعلم من أخطائك!

---

## 🎓 مصادر تعليمية

### للتعلم أكثر عن التداول
- [هيئة السوق المالية السعودية](https://cma.org.sa/)
- [تداول السعودية](https://www.saudiexchange.sa/)
- [أكاديمية التداول](https://www.tadawul.com.sa/wps/portal/tadawul/education)

### كتب موصى بها
- 📚 "المستثمر الذكي" - بنجامين جراهام
- 📚 "تداول في المنطقة" - مارك دوغلاس
- 📚 "التحليل الفني للأسواق المالية" - جون ميرفي

---

## 🔗 روابط مفيدة

- 📧 **التواصل**: abo.saleh.g@gmail.com
- 🌐 **GitHub**: [[abosalehg-ui](https://github.com/abosalehg-ui)]
- 📱 **التطبيق**: [[أنقر هنا](https://abosalehg-ui.github.io/Saudi-Stock-Trading-Simulator)]

---

## ⚠️ إخلاء مسؤولية

> **تنبيه**: هذا المشروع لأغراض تعليمية فقط. لا يُعتبر نصيحة استثمارية. التداول الفعلي في الأسواق المالية ينطوي على مخاطر. استشر مستشاراً مالياً مرخصاً قبل اتخاذ أي قرارات استثمارية.

---

## 🙏 شكر وتقدير

- **Chart.js**: للمكتبة الرائعة للرسوم البيانية
- **سوق الأسهم السعودي**: للبيانات المرجعية
- **المجتمع التعليمي**: للدعم والتشجيع

---

<div align="center">

### 📈 ابدأ رحلتك الاستثمارية اليوم - بدون مخاطر! 

**تداول** - تعلم، جرب، انجح

---

Made with ❤️ by **Abdulkareem Al-Aboud**

⭐ إذا أعجبك المشروع، لا تنسَ وضع نجمة!

</div>

---

<a name="english"></a>
# Tadawul - Saudi Stock Market Simulator 📈

<div align="center">

![Version](https://img.shields.io/badge/version-3.1.0-orange)
![License](https://img.shields.io/badge/license-MIT-blue)
![Language](https://img.shields.io/badge/languages-Arabic%20%7C%20English-green)
![Platform](https://img.shields.io/badge/platform-Web-purple)

**Professional Saudi stock trading simulator with 90+ real stocks and dynamic news**

</div>

---

## 📋 Overview

**Tadawul** is a realistic simulation of the Saudi Stock Exchange (Tadawul) that allows you to learn trading without real financial risks. Features 90+ real Saudi stocks from various sectors with a dynamic news system that realistically affects prices.

---

## ✨ Key Features

### 📊 Realistic Stock Market
- **90+ Real Saudi Stocks** from all sectors
- Real company names and symbols
- Realistic price movements using Geometric Brownian Motion
- Multiple sectors: Banking, Petrochemicals, Telecom, Retail, and more

### 📰 Dynamic News System
- **14 Different News Types** (7 positive, 7 negative)
- News appears randomly every minute
- **Real Impact on Prices**: ±2% to ±5%
- Gradual impact over 5 minutes (realistic)
- Scrolling news ticker with colored icons 📈📉

### 💡 Educational Financial Tips
- **20 Professional Financial Tips**
- Topics include:
  - Diversification and risk management
  - Long-term investing
  - Technical and fundamental analysis
  - Trading psychology
- **3 Random Tips** displayed per session
- Available in both Arabic and English

### 💼 Advanced Portfolio Management
- **Starting Capital**: 50,000 SAR
- Detailed portfolio display:
  - Total assets
  - Cash balance
  - Portfolio value
  - Profit/Loss (amount and percentage)
- Detailed analysis for each stock:
  - Average purchase cost
  - Current price
  - Value after selling (including commission)
  - Expected profit/loss

### 📈 Professional Trading System
- **Three Order Types**:
  - Market Orders: Execute immediately
  - Limit Orders: Execute at specific price
  - Stop-loss Orders: Automatic sell when the price drops
- **Pending Orders Management**:
  - View all pending orders
  - Track difference between current and limit price
  - Cancel orders anytime
- **Realistic Commissions**: 0.155% per trade
- **Price Slippage**: Realistic price change simulation

### 🎯 Challenge System
- **Challenge 1**: Earn 10% → Reward 100,000 SAR
- **Challenge 2**: Earn 20% → Reward 300,000 SAR
- Visual progress bars for each challenge

### 📊 Visual Analysis
- **Interactive Charts** for each stock using Chart.js
- Display last 100 price points
- Real-time price updates

### ⚡ Simulation Speed
- **3 Speeds**: 1x, 5x, 10x
- Fast-forward time to test strategies quickly

### 🌐 Bilingual Interface
- **Instant Toggle** between Arabic and English
- All texts, news, and tips translated
- RTL support for Arabic, LTR for English

### 💾 Auto-Save
- Automatic game state saving in browser
- Resume from where you left off
- Saves:
  - Balance and portfolio
  - Pending orders
  - Transaction history
  - Completed challenges

---

## 🚀 How to Use

### 1️⃣ Start Trading
```
1. Open the game in your browser
2. Start with 50,000 SAR capital
3. Browse available stocks
```

### 2️⃣ Buy Stocks
```
1. Click any stock from the list
2. A detailed window appears showing:
   - Current price
   - Chart
   - Buy/Sell form
3. Choose order type (Market or Limit)
4. Enter quantity
5. Click "Buy"
```

### 3️⃣ Sell Stocks
```
1. Go to "Portfolio" tab
2. Find all your stocks with details
3. Click "Sell All" for specific stock
4. Or click stock and choose quantity to sell
```

### 4️⃣ Limit Orders
```
1. Choose "Limit" when creating order
2. Enter price at which you want to buy/sell
3. Order appears in "Orders" tab
4. Executes automatically when price reached
```

### 5️⃣ Follow News
```
- Watch news ticker at top
- Positive news 📈 raises price
- Negative news 📉 lowers price
- Impact is gradual over 5 minutes
```

### 6️⃣ Use Tips
```
- Read financial tips at bottom
- Change when refreshing page
- Applying tips improves performance
```

---

## 🎮 Tools and Buttons

| Tool | Function |
|------|----------|
| 📊 **Market** | View all available stocks |
| 💼 **Portfolio** | View your current stocks and performance |
| 📋 **Orders** | Manage pending orders |
| 🔄 **Reset** | Start new game (clear all data) |
| **1x / 5x / 10x** | Speed up/slow down time |
| 🌐 **E / ع** | Toggle language |

---

## 💻 Technical Requirements

### Supported Browsers
- ✅ Google Chrome (Recommended)
- ✅ Mozilla Firefox
- ✅ Microsoft Edge
- ✅ Safari
- ✅ Opera

### Minimum Specifications
- Modern browser supporting:
  - HTML5
  - CSS3
  - JavaScript ES6+
  - LocalStorage API
  - Canvas API (for Chart.js)

### Libraries Used
- **Chart.js 3.9.1**: Interactive charts (bundled via npm/Vite)
- **Vanilla JavaScript**: All functionality

---

## 🎨 Design and Colors

### Color System
```css
Main Background: #1a1a2e → #16213e (gradient)
Top Bar: #0f3460
Primary Color: #16a085 (Teal Green)
Secondary Color: #6b16a0 (Purple)
Positive: #2ecc71 (Green)
Negative: #e74c3c (Red)
Warning: #f39c12 (Orange)
```

### Responsive Design
- Full design for desktop screens
- Optimized interface for mobile and tablet
- Sticky statistics bar on scroll (Mobile)

---

## 🔧 Educational Uses

### 📚 For Beginners
- **Learn trading basics** without risks
- Understand concepts like:
  - Commissions
  - Market and limit orders
  - Profit and loss
  - Diversification

### 📈 For Traders
- **Test strategies** before real application
- Learn portfolio management
- Understand news impact on prices
- Practice self-control

### 🎓 For Teachers
- Interactive teaching tool
- Explain financial market concepts
- Practical application of economic theories
- Assess student understanding

### 👨‍💼 For Entrepreneurs
- Understand stock market basics
- Learn to read charts
- Realize importance of economic news

---

## 📝 Winning Tips

### 💎 Successful Strategies
1. **Diversify portfolio**: Don't put all money in one stock
2. **Follow news**: Use positive news to buy
3. **Use limit orders**: To buy at better price
4. **Be patient**: Long-term investing is safer
5. **Watch commissions**: Cost 0.155% per trade

### ⚠️ Mistakes to Avoid
- ❌ Frequent quick speculation
- ❌ Buying at peak and selling at bottom
- ❌ Ignoring financial tips
- ❌ Not following news
- ❌ Investing entire balance

---

## 🏆 Stock Information

### Available Sectors
```
🏦 Banking (10 stocks)
⚗️ Petrochemicals (10 stocks)
📱 Telecom (4 stocks)
🛒 Retail (8 stocks)
🏥 Healthcare (1 stock)
🛡️ Insurance (9 stocks)
🏗️ Cement (8 stocks)
⚡ Energy (3 stocks)
🏘️ Real Estate (7 stocks)
🚚 Transportation (3 stocks)
📺 Media (2 stocks)
🏨 Hotels & Tourism (3 stocks)
🌾 Agriculture & Food (7 stocks)
🏭 Industrial (11 stocks)
👷 Construction (5 stocks)
```

---

## 🔐 Privacy and Security

### 🛡️ Your Data is Safe
- ✅ **No Servers**: Everything local in your browser
- ✅ **No Login**: No account needed
- ✅ **No Personal Data**: We collect no information
- ✅ **LocalStorage Only**: Data saved locally

---

## 🛠️ Technologies Used

### Frontend
```
HTML5        ████████████████████ 100%
CSS3         ████████████████████ 100%
JavaScript   ████████████████████ 100%
```

### Libraries
- **Chart.js 3.9.1**: Interactive charts (bundled via Vite, no CDN)

### APIs
- **LocalStorage API**: Data persistence
- **Canvas API**: Chart rendering

### Advanced Techniques
- **Geometric Brownian Motion**: Price movement simulation
- **Event-Driven Architecture**: UI updates
- **Responsive Design**: Fully responsive

---

## 📄 License

This project is open source under MIT License.

```
MIT License

Copyright (c) 2024 Abdulkareem Al-Aboud

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

---

## 👨‍💻 Developer

**Developed by: Abdulkareem Al-Aboud**

📧 Email: [abo.saleh.g@gmail.com](mailto:abo.saleh.g@gmail.com)

---

## 🤝 Contributing

Contributions are welcome! If you have suggestions or improvements:

### How to Contribute
1. **Fork** the project
2. Create a **Branch** (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to Branch (`git push origin feature/amazing-feature`)
5. Open a **Pull Request**

### Contribution Areas
- 🐛 Bug fixes
- ✨ New features
- 📝 Documentation improvements
- 🎨 Design enhancements
- 🌍 New languages
- 🧪 Writing tests

---

## 🔄 Changelog

### Version 3.1.0
```
✅ Prices and price history persist across sessions
✅ Language preference persists; active news re-renders on language toggle
✅ Strict validation of loaded saves (schemaVersion)
✅ Stock data audit: corrected symbols and sectors
✅ Challenge rewards now count as capital, not profit
✅ Cancel pending orders by stable id; all executions recorded in stats
✅ Limit orders fill at the current market price
✅ Official MIT LICENSE file
```

### Version 3.0.0
```
✅ Bilingual glossary, personal stats, interactive tour
✅ Candlestick charts, tiered learning paths, historical scenarios
```

### Version 2.0.0
```
✅ Modular architecture (Vite + ES Modules) with Vitest tests
✅ Stop-loss orders, SMA/RSI indicators, Saudi market hours + 24/7 mode
✅ Sharia filter, Hijri dates, CSV export, a11y, ESLint + Prettier + CI
```

### Version 1.0.0 (2024)
```
✅ First release
✅ 90+ real Saudi stocks
✅ Dynamic news system affecting prices
✅ 20 educational financial tips
✅ Market and limit orders
✅ Challenge system with rewards
✅ Interactive charts
✅ Full Arabic and English support
✅ Auto-save
✅ Responsive design
```

---

## 🌟 Future Features

### Coming Soon
- [ ] **Competition Mode**: Compete with other players
- [ ] **Leaderboard**: Top traders
- [ ] **Advanced Portfolio Analysis**: Additional performance metrics
- [ ] **Price Alerts**: Notifications when price reaches limit

### Planned
- [ ] **MACD on the chart** (the indicator itself is implemented and tested in `src/engine/indicators.js`)
- [ ] **Dividends**: Cash distribution simulation
- [ ] **Financial Reports**: Monthly performance summary
- [ ] **Light Mode**: Light theme
- [ ] **Multi-Currency**: Dollar, Euro, etc.
- [ ] **Global Markets**: NYSE, NASDAQ

> Note: stop-loss orders, RSI/SMA indicators, and CSV export shipped in v2.0.

---

## 📊 Project Statistics

```
Number of Stocks:     91
Number of Sectors:    15
News Types:           14
Financial Tips:       20
Supported Languages:  2
```

---

## 🎯 Target Audience

- 🎓 **Students**: Learn trading basics
- 👨‍💼 **Beginners**: Safe start before real trading
- 📈 **Traders**: Test strategies
- 👨‍🏫 **Teachers**: Interactive teaching tool
- 💼 **Entrepreneurs**: Understand financial markets

---

## 💡 FAQ

### ❓ Is this real trading?
**No**, this is an educational simulation. No real money involved.

### ❓ Can I lose money?
**No**, money is virtual. You can reset anytime.

### ❓ Are prices real?
Stocks are real and base prices realistic, but movements are simulated.

### ❓ How do I start?
Just open the app URL in your browser and start trading immediately!

### ❓ Does it work on mobile?
Yes, the design is responsive and works on all devices.

### ❓ Is my data saved?
Yes, saved locally in your browser automatically.

### ❓ How do I learn trading?
Read financial tips, try different strategies, and learn from mistakes!

---

## 🎓 Educational Resources

### Learn More About Trading
- [Saudi Capital Market Authority](https://cma.org.sa/)
- [Saudi Stock Exchange](https://www.saudiexchange.sa/)
- [Tadawul Academy](https://www.tadawul.com.sa/wps/portal/tadawul/education)

### Recommended Books
- 📚 "The Intelligent Investor" - Benjamin Graham
- 📚 "Trading in the Zone" - Mark Douglas
- 📚 "Technical Analysis of Financial Markets" - John Murphy

---

## 🔗 Useful Links

- 📧 **Contact**: abo.saleh.g@gmail.com
- 🌐 **GitHub**: [[abosalehg-ui](https://github.com/abosalehg-ui)]
- 📱 **App**: [[App URL](https://abosalehg-ui.github.io/Saudi-Stock-Trading-Simulator)]

---

## ⚠️ Disclaimer

> **Warning**: This project is for educational purposes only. Not considered investment advice. Real trading in financial markets involves risks. Consult a licensed financial advisor before making any investment decisions.

---

## 🙏 Acknowledgments

- **Chart.js**: For the amazing charting library
- **Saudi Stock Market**: For reference data
- **Educational Community**: For support and encouragement

---

<div align="center">

### 📈 Start Your Investment Journey Today - Risk Free!

**Tadawul** - Learn, Practice, Succeed

---

Made with ❤️ by **Abdulkareem Al-Aboud**

⭐ If you like the project, don't forget to star it!

</div>
