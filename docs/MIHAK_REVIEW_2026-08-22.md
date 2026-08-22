# مِحَك — مراجعة مستودع Saudi-Stock-Trading-Simulator

**تاريخ المراجعة:** 2026-08-22
**الفرع:** `claude/mihak-skill-dypzc8` (آخر التزام على `main`: `1692188`)
**نوع المشروع المكتشف:** **تطبيق ويب** (Web App) — وليس لعبة
**الدرجة الإجمالية:** **8.2 / 10**

> **منهجية التحقق:** كل رقم في هذا التقرير مأخوذ من تشغيل فعلي، لا من قراءة الأسماء.
> شغّلت `npm ci` و`npm run lint` و`npm run typecheck` و`npm run test:coverage` و`npm run build`
> و`npm audit`، وكتبت سكربتات فحص صغيرة للتحقق من تطابق مفاتيح الترجمة، وحجم حمولة
> `localStorage`، وسلوك محرك الأسعار عددياً. المقاطع المقتبسة منسوخة من الملفات كما هي.

---

## 1. نظرة عامة سريعة

**تداول** محاكي تعليمي لسوق الأسهم السعودي (تداول) يشتغل بالكامل في المتصفح بلا خادم ولا أي طلب شبكة
وقت التشغيل. يعطي المستخدم رأس مال افتراضي 50,000 ريال، و91 سهماً سعودياً ببيانات محاكاة، ومحرك
أسعار يشتغل كل دقيقة، مع أوامر سوقية ومحددة ووقف خسارة، ومؤشرات فنية، وأخبار مؤثرة على الأسعار،
وسيناريوهات تاريخية، ومسارات تعلم، وقاموس مصطلحات، وإحصائيات شخصية.

**البنية:** طبقات مفصولة بوضوح — `data/` (بيانات ثابتة) ← `engine/` (منطق الأعمال، بلا DOM إطلاقاً)
← `ui/` (عرض وربط أحداث) ← `utils/`. الطبقات ما تتصل ببعض دائرياً: `main.js` يحقن الـ callbacks في
طبقة الواجهة (`bindRenderCallbacks`, `bindStockDetailsCallbacks`, `bindScenariosCallbacks`) بدل ما
تستورد `ui/` من `main.js`. هذا قرار معماري صحيح ومطبّق بانضباط في كل الملفات.

**التقنيات:**

| البند | القيمة |
|---|---|
| البناء | Vite 8.1.5، ES Modules، `type: module` |
| الاعتماديات وقت التشغيل | `chart.js@4.5.1`، `@fontsource/ibm-plex-sans-arabic@5.3.0` — لا شيء غيرها |
| الاختبارات | Vitest 4.1.10 + jsdom 29، تغطية v8 مع عتبات إلزامية |
| الجودة | ESLint 10 + Prettier 3.9 + `tsc --checkJs` (TypeScript 7) على JSDoc |
| CI/CD | GitHub Actions: lint + typecheck + coverage + build، ونشر تلقائي على GitHub Pages |
| بلا | خادم، قاعدة بيانات، مصادقة، أي طلب HTTP وقت التشغيل |

**حجم المستودع:** 87 ملفاً تحت git، **~11,100 سطر** (JS + CSS + HTML)، منها 1,884 سطر CSS و958 سطر
بيانات أسهم و26 ملف اختبار. المراجعة غطّت **كل ملفات المصدر** — ما فيه عيّنات ولا تخمين.

**حجم الحزمة النهائية:** `dist/` = 804KB، منها JS واحد بحجم **310.65KB** (104KB مضغوط gzip)،
CSS 26KB (5.46KB gzip)، والباقي خطوط.

---

## 2. المراجعة التقنية والهندسية (45%)

### 2.1 البنية المعمارية وفصل المسؤوليات — **9/10**

الفصل حقيقي مو شكلي. `src/engine/` كله خالٍ من `document` و`window` — تأكدت بالبحث. هذا هو السبب
اللي خلّى 246 اختباراً ممكنة أصلاً. حقن الاعتماديات عبر callbacks بدل الاستيراد الدائري نظيف:

> `src/ui/render.js`:
> ```js
> let onSelectStock = () => {};
> export function bindRenderCallbacks(callbacks) {
>   onSelectStock = callbacks.onSelectStock ?? onSelectStock;
>   ...
> }
> ```

**الملاحظة الوحيدة:** منح مكافآت التحديات — وهو تغيير على `gameState.cash` و`initialCapital` — ينطلق
من داخل دالة عرض:

> `src/ui/render.js` — في `updateChallenges()`:
> ```js
> const { challenge1JustCompleted, challenge2JustCompleted } = evaluateChallenges({
>   pnlPercent, totalValue,
> });
> ```

`evaluateChallenges` نفسها في `engine/` (صح)، لكن نقطة استدعائها في طبقة العرض تعني إن أي إعادة رسم
تصير معاملة مالية. **الحل:** انقل النداء إلى `refreshAll()` في `src/main.js` قبل `updateChallenges()`،
وخلِّ `updateChallenges()` تستقبل النتيجة وترسم البارات فقط.

### 2.2 قابلية القراءة والصيانة — **9/10**

هذي أقوى نقطة في المشروع. التعليقات تشرح **ليش** لا **وش**، وكثير منها يوثّق خطأً سابقاً ويمنع تكراره:

> `src/engine/prices.js` — في `decayPriceImpact()`:
> ```js
> * This must NOT re-add the full `impact.value` to drift every tick (the
> * previous implementation did): since impact.value only shrinks 5%/tick,
> * doing so summed a geometric series to ~20x the original impact instead of
> * fading it out.
> ```

وحتى `tsconfig.json` يشرح ليش استثنى `src/ui/**` من فحص الأنواع بدل ما يستثنيه بصمت. هذا مستوى
توثيق نادر.

**الملاحظة:** `src/main.js` (585 سطراً) صار يحمل أربع مسؤوليات: تهيئة، ربط أحداث، توجيه (tabs)،
وترجمة التسميات الثابتة. `rebuildStaticLabels()` وحدها فيها خريطة من 33 مفتاحاً ثم 9 أسطر
`getElementById(...).textContent = t(...)` منفصلة عنها بلا سبب:

> `src/main.js` — في `rebuildStaticLabels()`:
> ```js
> const textById = { 'stat-label-cash': t('cashBalance'), ... };  // 33 مدخلاً
> Object.entries(textById).forEach(([id, text]) => { ... });
> // ثم بعدها مباشرة:
> document.getElementById('reset-btn').textContent = t('reset');
> document.getElementById('export-csv-btn').textContent = t('exportCsv');
> document.getElementById('sharia-filter-label-text').textContent = t('showShariaOnly');
> // ... 6 أسطر أخرى
> ```

**الحل:** ادمج التسعة في نفس الخريطة (كلها نفس النمط بالضبط)، وانقل `rebuildStaticLabels` +
`buildListFilterOptions` + `syncThemeToggle` إلى `src/ui/labels.js`. `main.js` ينزل تحت 400 سطر.

### 2.3 التكرار (DRY) و Code Smells — **8/10**

حساب نسبة التغير مكرّر حرفياً في أربعة مواضع:

> `src/ui/render.js` — في `updateStockPrices()` وفي `updateTicker()`،
> و`src/ui/stock-details.js` — في `renderStockDetails()`،
> و`src/engine/stock-filter.js` — في `changePercent()`:
> ```js
> const change = ((price - stock.basePrice) / stock.basePrice) * 100;
> ```

النسخة الوحيدة الآمنة (`changePercent` في `stock-filter.js`) تتحقق من القسمة على صفر؛ الثلاث الأخرى لا.
**الحل:** صدّر `changePercent` من `stock-filter.js` (أو انقلها إلى `utils/numbers.js`) واستعملها في
الثلاثة، مع دالة `changeGlyph()` صغيرة تعطي `▲/▼` و`positive/negative` مرة واحدة.

نمط تكرار ثانٍ في `src/ui/tour.js` — في `positionHighlight()`: كتلة "الرجوع للتوسيط بلا إبراز"
مكتوبة مرتين حرفياً (لما `target` فاضي، ولما `resolveTarget` يرجّع `null`). دمج الشرطين في سطر واحد
`const el = target ? resolveTarget(target) : null;` يشيل الازدواج كامل.

**Smell أخطر:** حلقة قد لا تنتهي:

> `src/ui/render.js` — في `displayRandomTips()`:
> ```js
> const selected = [];
> while (selected.length < 3) {
>   const tip = tips[Math.floor(Math.random() * tips.length)];
>   if (!selected.includes(tip)) selected.push(tip);
> }
> ```

حالياً آمنة (20 نصيحة لكل لغة، تحققت)، لكنها تعلّق المتصفح تعليقاً كاملاً لو نزل عدد النصائح تحت 3،
أو لو صار فيه تكرار في المصفوفة. **الحل:** `[...tips].sort(() => Math.random() - 0.5).slice(0, 3)`
أو خلط Fisher–Yates ثم `slice`.

### 2.4 معالجة الأخطاء والحالات الحدّية — **8/10**

طبقة التطهير (sanitization) لبيانات `localStorage` نموذجية: `sanitizeLoadedState()` و
`sanitizeLoadedStats()` في `src/state.js` تتحققان **حقلاً حقلاً** بدل `Object.assign` أعمى، وترفضان
الرموز غير الموجودة، والقيم غير المنتهية، والكميات السالبة. حتى الحفظات القديمة بلا `id` تُرمّم:

> ```js
> .map((order) => ({ ...order, id: order.id ?? Date.now() + Math.random() }));
> ```

وترتيب العمليات في `executeMarketOrder` مصحّح بوعي: `canFill()` يُنفَّذ **قبل** `applyMarketImpact()`
لأن الأخيرة تحرّك السوق بلا إمكانية تراجع.

**المشكلة الحقيقية — قسمة غير محدودة في محرك الأخبار:**

> `src/engine/prices.js` — في `gbmStep()`:
> ```js
> const elapsed = simElapsedMs(news.timestamp, gameState.speed) / 60000;
> if (elapsed < news.duration) {
>   const remaining = news.impact - news.appliedImpact;
>   const step = remaining / (news.duration - elapsed);
>   drift += step;
>   news.appliedImpact += step;
> }
> ```

المقام `(news.duration - elapsed)` يقترب من الصفر بلا أي حد أدنى. الكود يعتمد ضمنياً على إن كل نبضة
تزيد `elapsed` بمقدار 1.0 بالضبط، فتكون المقامات 4، 3، 2، 1 — وهذا صحيح **فقط** ما دام طور النبض
(tick phase) ثابتاً. لكن `setSpeed()` تستدعي `startPriceUpdates()` اللي تعمل `clearInterval` ثم
`setInterval` جديد، أي أن **كل تغيير سرعة يعيد ضبط الطور**. فحصتُ هذا عددياً بمحاكاة 200,000 حالة مع
إزاحة طور عشوائية عند تغيير السرعة: أسوأ نبضة أنتجت انحرافاً قدره **13,793%** في تحديث واحد.

عملياً المستخدم ما يشوف `Infinity` لأن الحدّين `MIN_PRICE_RATIO`/`MAX_PRICE_RATIO` يلقفان النتيجة —
لكن معناها أن السهم يصطدم فوراً بسقفه (×3) أو أرضيته (×0.3) بضربة واحدة، والحدود هي الشيء الوحيد
اللي يمنع الانفجار. أزرار السرعة (1x / 5x / 10x) ظاهرة دائماً، فالمسار مطروق.

**الحل (سطران):**
```js
const stepsLeft = Math.max(1, news.duration - elapsed);
const step = remaining / stepsLeft;
```

**مشكلة ثانية — سجل معاملات بلا سقف:** `gameState.transactions` تكبر بلا حد ولا تُقصّ أبداً، وتُسلسَل
كاملة إلى `localStorage` في **كل** نبضة عبر `saveGameState()`. الحل: احتفظ بآخر 500 معاملة
(`clean.transactions = clean.transactions.slice(-500)` داخل `sanitizeLoadedState`، ومثلها عند الدفع)،
أو صدّر CSV واقطع.

### 2.5 الأداء واستهلاك الموارد — **6/10** ← أضعف بند

طبقة الرسم نفسها ممتازة: `updateStockPrices()` ترقّع نصوص العُقد الموجودة عبر `stockItemRefs` بدل إعادة
بناء 91 صفاً كل دقيقة، والشريطان المتحركان يحتفظان بمراجعهما عشان ما تنقطع حركة الـ marquee. البحث
مؤجَّل (debounced) بـ 120ms. كل هذا صحيح ومعلَّل بتعليقات.

المشكلة في مكانين آخرين:

**(أ) الحزمة كاملة تُحمَّل مقدماً.** `src/ui/chart.js` يستورد Chart.js استيراداً ساكناً، و`main.js`
يستورد `chart.js` عبر `stock-details.js` — فينتهي الأمر بملف JS واحد بحجم **310.65KB** يُنزَّل قبل أول
رسمة. لكن الرسم البياني **ما يظهر إلا بعد اختيار سهم**، وهو فعل اختياري تماماً.

**الحل:** استيراد ديناميكي داخل `renderStockDetails`:
```js
const { renderChart } = await import('./chart.js');
```
Vite يقسم الحزمة تلقائياً. المتوقع: الحزمة الأولية تنزل إلى ~100KB (≈35KB gzip) — أي **ثلث** الحجم
الحالي، وهو فرق ملموس على شبكة جوال.

**(ب) كتابة ~216KB إلى `localStorage` كل نبضة.** `savePriceState()` تُسلسِل أسعار 91 سهماً مع
تاريخ 100 نقطة لكل سهم. حسبتُ الحمولة فعلياً: **220,826 بايت**. وتُستدعى من `startPriceUpdates()` كل
نبضة، ومن `handleSubmitOrder()` بعد كل صفقة:

> `src/main.js` — في `startPriceUpdates()`:
> ```js
> refreshAll();
> saveGameState();
> savePriceState();
> ```

`JSON.stringify` + `localStorage.setItem` عمليتان **متزامنتان** تحجبان الخيط الرئيسي. على 10x تصير
كل 6 ثوانٍ. **الحل:** اكتب تاريخ الأسعار كل N نبضات (أو عند `visibilitychange`/`beforeunload`)، وأبقِ
الحفظ اللحظي على `gameState` فقط (وهو أصغر بمراتب). أو قلّل `PRICE_HISTORY_MAX_POINTS` المحفوظة إلى
30 نقطة وأبقِ الـ100 في الذاكرة فقط.

### 2.6 الاختبارات — **8/10**

**246 اختباراً في 26 ملفاً، كلها ناجحة**، بتغطية مُقاسة فعلياً:

| المقياس | القيمة | العتبة في CI |
|---|---|---|
| Statements | 93.38% (1017/1089) | 90 |
| Branches | 82.93% (559/674) | 78 |
| Functions | 94.47% (171/181) | 90 |
| Lines | 96.08% (932/970) | 90 |

والعتبات مفروضة في `vitest.config.js` لا مجرد تقرير — يعني تراجع التغطية يكسر البناء. والاستثناءات
مكتوبة **ملفاً ملفاً** مع تعليق يشرح السبب:

> `vitest.config.js`:
> ```js
> // UI modules that still have no tests. Listed individually rather than
> // as a blanket 'src/ui/**' so the gap is visible and shrinks by
> // deleting a line, not by staying invisible.
> ```

هذا انضباط أعلى من أغلب المشاريع التجارية.

**الفجوات:** 8 وحدات واجهة بلا أي اختبار (`chart.js`, `candlestick.js`, `tour.js`, `learning.js`,
`scenarios.js`, `stats.js`, `glossary.js`, `stock-details.js`)، ولا يوجد أي اختبار end-to-end يفتح
الصفحة فعلاً. وتحديداً `stock-details.js` هي اللي فيها نموذج الأوامر — أهم تفاعل في التطبيق كله.

**سبب خفض الدرجة إلى 8:** البوابة نفسها **معطّلة الآن** (انظر 4.6) — `npm audit --audit-level=high`
يرجّع خروج 1 قبل ما يوصل إلى `npm run lint` أصلاً، فسلسلة CI حمراء بالكامل ولا تحرس شيئاً.

### 2.7 التوثيق — **7/10**

`README.md` مفيد ثنائي اللغة وفيه أوامر تشغيل صحيحة، لكنه **1,217 سطراً** وفيه أرقام قديمة:
"اختبارات وحدة بـ Vitest (59 اختباراً)" بينما العدد الفعلي 246.

وأخطر منه: المستودع يحمل **ثلاثة تقارير مراجعة سابقة بمجموع 2,216 سطراً**، أحدها في الجذر:

```
CODE_REVIEW_Saudi-Stock-Trading-Simulator_2026-08-03.md   1445 سطراً  (جذر المستودع)
docs/DESIGN_REVIEW_AR.md                                   472 سطراً
docs/ENGINEERING_REVIEW.md                                 299 سطراً  (يوثّق v3.0.0 و59 اختباراً)
```

يعني وثائق المراجعة (2,216 سطراً) تقارب خُمس حجم الكود، وبعضها يصف نسخة قديمة، وواحد منها يلوّث جذر
المستودع. **الحل:** انقل الثلاثة إلى `docs/archive/` مع ترويسة "أرشيف — يصف النسخة X"، وأبقِ في
`docs/` التقرير الأحدث فقط، وحدّث رقم الاختبارات في README (أو استبدله بشارة تُحدَّث آلياً).

في المقابل، التوثيق **داخل** الكود ممتاز: `src/data/stocks.js` يحمل تحذيراً صريحاً بأن تصنيف
`isShariaCompliant` تقدير مبدئي بالقطاع ويحتاج مراجعة شرعية قبل أي استخدام إنتاجي — هذه أمانة تُحسب
للمشروع.

### 2.8 اتفاقيات التسمية ونمط موحّد — **9/10**

`camelCase` في كل مكان، `SCREAMING_SNAKE` للثوابت، `kebab-case` لمعرّفات DOM وفئات CSS — بلا استثناء
واحد وجدته. Prettier مضبوط (`printWidth: 100`) و`npm run lint` نظيف بلا أي تحذير، وكذلك
`npm run typecheck`. كل الثوابت السحرية مجمّعة في `src/config.js` بلا أرقام متناثرة في المنطق.

الخصم الوحيد: أنماط سطرية مكتوبة يدوياً تكسر نظام الـ tokens:

> `src/ui/stats.js` — في `renderStatsContent()`:
> ```js
> value.style.fontSize = '15px';
> ```
> `src/ui/learning.js` — في `renderPathList()`:
> ```js
> item.style.textAlign = 'start';
> ```

**الحل:** انقلهما إلى `.stats-card-value` و`.lesson-list-item` في `main.css`.

### متوسط القسم الهندسي

(9 + 9 + 8 + 8 + 6 + 8 + 7 + 9) ÷ 8 = **8.0 / 10**

---

## 3. المظهر والتصميم وتجربة المستخدم (30%)

### 3.1 الاتساق البصري — **9/10**

نظام التصميم هنا من أفضل ما مرّ عليّ في مشروع بهذا الحجم. `src/styles/main.css` يعرّف **99 متغيّر
CSS**، ونِسَب التباين **محسوبة ومكتوبة بجانب كل لون**:

> `src/styles/main.css`:
> ```css
> --text: #e8eef7;       /* 14.76 on --surface-1 */
> --text-2: #a9b8cc;     /*  8.54 on --surface-1, 6.45 on --surface-3 */
> --gain: #3ddc91;       /*  9.71 on --surface-1 */
> ```

وفيه قاعدة معمارية مكتوبة: الأخضر والأحمر **محجوزان** لاتجاه السعر ويُمنع استعمالهما في أي عنصر
واجهة، عشان لا تفقد العين ربطهما بـ"صاعد/هابط". هذا تفكير تصميمي ناضج، مو مجرد اختيار ألوان.

والملف يوثّق حتى ليش تكرّر كتلة الثيم الفاتح مرتين بدل `light-dark()`: لأن `getComputedStyle` (اللي
تقرأ منه الرسوم البيانية على canvas) ما يحلّ `light-dark()`. تعليل صحيح تقنياً.

الخصم فقط للأنماط السطرية المذكورة في 2.8.

### 3.2 سهولة الاستخدام والتنقل — **7/10** ← أضعف بند في القسم

**🔴 لوحة تفاصيل السهم تتجمّد بينما بقية الصفحة تنبض.** `refreshAll()` تحدّث كل شيء ما عدا تفاصيل
السهم المختار:

> `src/main.js` — في `refreshAll()`:
> ```js
> updateStockPrices();
> renderPortfolio();
> renderPendingOrders();
> const { pnlPercent, totalValue } = updateStats();
> ... updateTicker(); updateNewsTicker(); updateMarketStatusBadge(); updateHijriDate();
> ```

ما فيها `renderStockDetails`. بحثتُ عن كل نداءات الدالة: كلها من `selectStock`، أو تبديل اللغة، أو
تبديل الثيم، أو تغيّر التخطيط — **ولا واحد منها من دورة التحديث**. النتيجة على الشاشات ≥1024px حيث
اللوحة الجانبية ظاهرة دائماً: "السعر الحالي" والرسم البياني يبقيان مجمّدين على لحظة الاختيار، بينما
القائمة **الملاصقة لهما** تتحرك كل دقيقة. يعني رقمان متناقضان لنفس السهم على نفس الشاشة.

**الحل:** أضف في نهاية `refreshAll()`:
```js
if (session.selectedStock) renderStockDetails(session.selectedStock);
```
لكن **لا تكفي وحدها** — لأنها تعيد بناء النموذج بالكامل، فتمسح ما كتبه المستخدم في حقل الكمية وتصفّر
مربّعات المؤشرات. الحل الصحيح: افصل `renderStockDetails` إلى `buildStockDetails()` (بناء كامل، عند
الاختيار فقط) و`patchStockDetailsPrices()` (ترقيع السعر ونسبة التغير + `chart.update()`) تُستدعى من
`refreshAll` — نفس النمط المطبَّق أصلاً وبنجاح في `updateStockPrices()`.

**🟠 مربّعات المؤشرات تُصفَّر عند أي إعادة رسم.** حالة SMA/RSI/MACD محفوظة في الـ DOM فقط:

> `src/ui/stock-details.js` — في `renderStockDetails()`:
> ```js
> <label><input type="checkbox" id="ind-sma20"> SMA 20</label>
> ```

فتبديل الثيم أو اللغة أو عبور نقطة الانكسار (1024px) يمسحها. **الحل:** ارفع الحالة إلى كائن وحدة
`const indicatorState = { candle:false, sma20:false, sma50:false, rsi:false, macd:false }` وأعد تطبيقه
بعد البناء.

**🟠 زر الدرس الأخير يحمل تسمية خاطئة.** في مسارات التعلم:

> `src/ui/learning.js` — في `renderLesson()`:
> ```js
> if (activeLessonIndex < path.lessons.length - 1) {
>   completeBtn.textContent = t('lessonNext');
> } else {
>   completeBtn.textContent = completed ? t('lessonClose') : t('lessonCompleted');
> }
> ```

`lessonCompleted` قيمتها `'✅ مكتمل'` — وهي **تسمية حالة**، مستعملة هنا كـ**نداء إلى فعل** على زر لم
يُضغط بعد. فالمستخدم في آخر درس يشوف زراً مكتوب عليه "✅ مكتمل" قبل أن يكمله. والمفارقة أن مفتاح
`lessonContinue` (`'متابعة'`) موجود في ملف الترجمة **وغير مستعمل إطلاقاً** — يبدو أنه المفتاح المقصود.
**الحل:** استبدلها بمفتاح جديد `lessonFinish` (`'إنهاء الدرس'`).

**🟡 الرسم بالشموع بلا أي تفاعل.** `renderCandlestick` يرسم على canvas يدوياً بلا tooltip ولا محور
زمني، بينما الرسم الخطي (Chart.js) عنده tooltip كامل. وفي `i18n.js` أربعة مفاتيح ميتة —
`candleOpen`, `candleHigh`, `candleLow`, `candleClose` — تدل على أن قراءة OHLC كانت مخططة ولم تُبنَ.
فالمستخدم يبدّل إلى الشموع ويخسر معلومات بدل ما يكسب.

**النقاط الإيجابية:** التنقل السفلي على الجوال، شريط إجراءات ينتقل بين سطح المكتب و"ورقة المزيد"،
جولة تعريفية من 5 خطوات تبدأ تلقائياً للمستخدم الجديد فقط، بحث + تصفية بالقطاع + ترتيب على قائمة
الأسهم. المسار الأساسي (اختر سهماً ← أدخل كمية ← اشترِ) نقرتان + كتابة. جيد.

### 3.3 الاستجابة (Responsive) — **9/10**

خمس نقاط انكسار مدروسة (640 / 1024 / 1400 / max-767)، وأحجام اللمس **مُرمَّزة** لا مخمَّنة:

> `src/styles/main.css`:
> ```css
> --tap-min: 44px;
> ```
مستعملة في 10 مواضع (`min-height: var(--tap-min)`). وأذكى قرار في المشروع: عند 1024px، عقدة
`#stock-details` **تُنقَل** فيزيائياً من داخل المودال إلى اللوحة الجانبية بدل تكرارها:

> `src/ui/responsive.js` — في `applyLayout()`:
> ```js
> moveTo(document.getElementById('stock-details'),
>   desktop ? document.getElementById('stock-panel-body')
>           : document.querySelector('#stock-modal .modal-content'));
> ```

فتبقى المعرّفات والمستمعون والحالة سليمة عبر نقطة الانكسار. هذا حل صحيح لمشكلة يخطئ فيها الأغلب.

**الخصم:** شرائح المؤشرات أقصر من الحد:
> `src/styles/main.css` — في `.indicator-controls label`:
> ```css
> min-height: 36px;
> ```
36px < 44px. التعليق فوقها يقرّ بأنها كانت 13px وتحسّنت — لكنها ما وصلت الحد. **الحل:**
`min-height: var(--tap-min)` مع `padding: 4px 12px`.

### 3.4 العربية و RTL — **9/10**

فحصتُ فعلياً ولم أكتفِ بوجود `dir="rtl"`:

| الفحص | النتيجة |
|---|---|
| خصائص فيزيائية (`margin-left`, `padding-right`, `left:`, `right:`) | **0** — صفر مطلق في 1,884 سطر CSS |
| خصائص منطقية (`inline-start`, `margin-inline`, `inset-inline`) | 18 استعمالاً |
| `dir`/`lang` على `<html>` | يُبدَّلان معاً في `rebuildStaticLabels()` |
| شكل الأرقام | **مُجبَرة على اللاتينية** — انظر أدناه |
| الخط العربي | IBM Plex Sans Arabic مستضاف ذاتياً، 3 أوزان فقط، `font-display: swap` |
| التاريخ الهجري | `Intl.DateTimeFormat('ar-SA-u-ca-islamic-nu-latn')` مع `try/catch` |
| تطابق مفاتيح الترجمة | **159 = 159**، صفر مفقود في الاتجاهين، و15 قطاعاً مترجماً بالكامل (تحققتُ بسكربت) |

مشكلة الأرقام محلولة بدقة وموثّقة:

> `src/utils/numbers.js` — في `formatCurrency()`:
> ```js
> // -u-nu-latn keeps Arabic grouping/decimal separators but forces Western
> // digits. Plain 'ar-SA' resolves to the `arab` numbering system, which put
> // ١٢٬٣٤٥٫٦٧ in three stat cards while the adjacent P&L card, built with
> // toFixed, showed 12345.67.
> const locale = lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US';
> ```

وأفضل من ذلك: تطبيع البحث العربي يتعامل مع الاختلافات الإملائية الحقيقية:

> `src/engine/stock-filter.js` — في `normaliseForSearch()`:
> ```js
> .replace(/[أإآٱ]/g, 'ا')
> .replace(/ة/g, 'ه')
> .replace(/[ىي]/g, 'ي')
> .replace(/[ً-ْـ]/g, '');   // التشكيل والتطويل
> ```
فمن يكتب "الاهلي" يجد "الأهلي". هذي تفصيلة يسقط فيها 90% من التطبيقات العربية.

**الخصم الوحيد:** تنظيف الإيموجي من تسميات التنقل السفلي هشّ:
> `src/main.js` — في `rebuildStaticLabels()`:
> ```js
> el.textContent = el.textContent.replace(/^\P{L}+/u, '');
> ```
يعتمد على أن كل ترجمة تبويب تبدأ بإيموجي ومسافة. أي تبويب مستقبلي بلا إيموجي، أو ترجمة تبدأ برقم،
يتشوّه. **الحل:** افصل الإيموجي عن النص في `i18n.js` (`marketTab: 'السوق'` + `marketTabIcon: '📊'`).

### 3.5 إمكانية الوصول — **8/10**

المطبَّق أكثر بكثير من المتوسط: `role="dialog"` + `aria-modal` على كل المودالات، فخّ تركيز حقيقي
عبر `AbortController` (فيُنظَّف كل مستمع عند الإغلاق مهما كان مسار الإغلاق)، `aria-selected` متزامنة
مع التبويبات، `role="progressbar"` مع `aria-valuenow` محدَّثة برمجياً، ودعم
`prefers-contrast: more` و`prefers-reduced-motion` بكتلتين منفصلتين.

وأذكى تفصيلة: الشريط المتحرك `aria-hidden` (لأنه غير قابل للاستعمال بقارئ شاشة)، لكن الأخبار تُعكَس
في منطقة حيّة مهذّبة:

> `src/ui/render.js` — في `announceLatestNews()`:
> ```js
> const live = document.getElementById('news-live');   // role="status" aria-live="polite"
> ```

**الفجوات الثلاث:**

1. **🟠 الجولة التعريفية بلا فخّ تركيز.** `startTour()` تفتح طبقة تغطي الشاشة بـ
   `style.display = 'block'` مباشرة، بلا `trapFocus()` وبلا `role="dialog"` — على عكس كل المودالات
   الأخرى. فمستخدم لوحة المفاتيح يستطيع الوصول بـ Tab إلى عناصر خلف الطبقة المعتمة. وهذي أول شاشة
   يشوفها المستخدم الجديد. **الحل:** مرّرها عبر `openModal('tour-overlay')` من `src/ui/modal.js`.
2. **🟡 حقل سعر مخفي داخل دورة الـ Tab.** `#order-price` يُخفى بـ `hidden` عند اختيار "سوق"، لكن
   `trapFocus` يجمع العناصر القابلة للتركيز مرة واحدة عند الفتح:
   > `src/ui/modal.js` — في `trapFocus()`:
   > ```js
   > const focusables = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
   > ```
   المُحدِّد ما يستثني `[hidden]`. **الحل:** أضف `:not([hidden])` إلى المُحدِّد.
3. **🟡 الخلفية تبقى مقروءة لقارئ الشاشة.** `aria-modal="true"` وحدها لا تكفي في كل التقنيات
   المساعدة. **الحل:** أضف `inert` على `.main-content` عند فتح أي مودال وأزلها عند الإغلاق (سطران
   في `openModal`/`closeModal`).

### 3.6 التغذية الراجعة — **8/10**

تأكيد قبل كل فعل مدمّر (`showConfirm` قبل إعادة التعيين وقبل إلغاء أمر وقبل استبدال سيناريو)، ورسائل
خطأ مترجمة ومحدّدة (`errorMessageFor` يحوّل 8 رموز خطأ إلى نصوص بشرية بدل "حدث خطأ")، وتحذير ظاهر
عند إغلاق السوق داخل نموذج الأمر، وإشعار عند إلغاء أمر معلّق تلقائياً — وهذا الأخير قرار تصميمي
واعٍ وموثّق:

> `src/engine/trading.js` — في `checkPendingOrders()`:
> ```js
> * An order whose trigger condition is met but whose execution then fails
> * ... is dropped rather than re-queued: retrying it every tick forever would
> * leave a "pending" order the user believes is live but that can never fill.
> ```

**الخصم:** كل صفقة ناجحة تفتح مودالاً حاجباً يتطلب ضغط "موافق":
> `src/main.js` — في `handleSubmitOrder()`:
> ```js
> closeStockModal();
> showAlert(msg);
> ```
في محاكي الهدف منه التدرّب بتكرار، هذا احتكاك مباشر: كل عملية شراء = نقرة إضافية إجبارية.
**الحل:** استبدلها بـ toast غير حاجب يختفي بعد 3 ثوانٍ (وأبقِ `showAlert` للأخطاء فقط).

### متوسط قسم UX/UI

(9 + 7 + 9 + 9 + 8 + 8) ÷ 6 = **8.3 / 10**

---

## 4. المراجعة الأمنية (25%)

> **تحديد النطاق:** التطبيق يعمل بالكامل في المتصفح — بلا خادم، بلا قاعدة بيانات، بلا مصادقة، وبلا أي
> طلب شبكة وقت التشغيل (`connect-src 'none'` في الـ CSP يفرض ذلك فعلياً). لذلك بنود **الصلاحيات
> والمصادقة**، و**تجزئة كلمات المرور**، و**حقن SQL**، و**CORS** — **لا تنطبق**، ولن أخترع لها ثغرات.
> الدرجة محسوبة من البنود المنطبقة فقط.

### 4.1 المفاتيح والأسرار — ✅ نظيف

بحثتُ في `src/` و`index.html` و`.github/` عن أنماط المفاتيح والأسرار والتوكنات: **لا شيء**. وفحصتُ
تاريخ git كاملاً (`git log --all --diff-filter=A`) عن أي ملف `.env` أو `secret` أو `key` أُضيف يوماً:
**لا شيء**. و`.gitignore` يغطي `.env` و`.env.local`. التطبيق أصلاً ما يحتاج أسراراً.

### 4.2 الحقن (XSS) — 🟡 **بسيط** (الكود سليم، لكن الحارس معطّل)

فيه 6 مواضع تكتب `innerHTML` (في `render.js` و`stock-details.js`)، وكلها تمرّ قيمها عبر
`escapeHtml()` من `src/ui/dom.js`، والدالة صحيحة (تغطي `& < > " '`). والتعليق فوقها يشرح ليش الهروب
مطلوب حتى مع بيانات ثابتة:

> `src/ui/dom.js`:
> ```js
> * Every `innerHTML` sink in the UI goes through this, even where the value is
> * currently bundled static data: the escaping is what makes those sinks safe to
> * keep once a value arrives from somewhere less trusted.
> ```

نيّة صحيحة. **لكن قاعدة ESLint الموضوعة لحراستها لا تعمل:**

> `eslint.config.js`:
> ```js
> 'no-restricted-properties': [
>   'warn',
>   { object: 'element', property: 'innerHTML', message: 'Build nodes or escape via escapeHtml().' },
> ],
> ```

`no-restricted-properties` بهذه الصيغة تُطابق **اسم المتغيّر حرفياً** — أي `element.innerHTML` فقط.
ولا واحد من الستة اسمه `element`؛ كلها `detailsEl`, `header`, `form`, `chartBlock`, `div`.

**تحققتُ عملياً:** أنشأتُ ملفاً مؤقتاً فيه:
```js
const div = document.createElement('div');
div.innerHTML = `<b>${userInput}</b>`;   // بلا أي هروب
```
وشغّلتُ `npx eslint` عليه → **خرج نظيفاً بلا تحذير واحد**. يعني الحارس المقصود لمنع نقطة XSS مستقبلية
غير فعّال إطلاقاً، والفريق يظن أنه محميّ.

**الحل:** احذف `object` واترك `property` فقط ليطابق أي كائن، وارفعها إلى `error`:
```js
'no-restricted-properties': [
  'error',
  { property: 'innerHTML', message: 'Build nodes or escape via escapeHtml().' },
],
```
(ستحتاج `// eslint-disable-next-line` على الستة القائمة، أو الأفضل: حوّلها إلى بناء عُقد مثل بقية
الملفات — `render.js` نفسه يبني عُقداً يدوياً في `buildStockItem` و`buildTicker`، فالنمط موجود أصلاً.)

**لا يوجد** `eval` ولا `new Function` ولا `document.write` ولا `insertAdjacentHTML` في المشروع كله.

### 4.3 التحقق من المدخلات — ✅ ممتاز

`safeParseNumber` في `src/utils/numbers.js` تفرض حدوداً صريحة وترفض `NaN`/`Infinity`/الفراغ، و
`validateOrder` في `src/engine/trading.js` تستعملها مع حدود من `config.js` وتميّز حالة "الكمية أكبر
من الحد" عن "كمية غير صالحة" لتعطي رسالة أدق. وطبقة `sanitizeLoadedState` تعامل محتوى `localStorage`
كمدخل **غير موثوق** بالكامل — وهذا هو السلوك الصحيح لأن المستخدم يقدر يعدّله من DevTools.

التلاعب بالحفظة (زيادة الرصيد يدوياً) ممكن نظرياً، لكن **لا يُعتبر ثغرة**: ما فيه خادم ولا لوحة صدارة
مشتركة ولا قيمة حقيقية — المستخدم يغش على نفسه فقط.

### 4.4 CSP والترويسات — ✅ قوي جداً، 🟡 مع قيد بنيوي

> `index.html`:
> ```html
> content="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline';
>          img-src 'self' data:; font-src 'self'; manifest-src 'self';
>          connect-src 'none'; base-uri 'none'; form-action 'none'"
> ```

هذي من أصرم السياسات الممكن التعبير عنها في وسم `<meta>`: `default-src 'none'` كأساس،
`connect-src 'none'` تمنع أي تسريب بيانات عبر الشبكة، `base-uri 'none'` تمنع حقن `<base>`،
`form-action 'none'` تمنع اختطاف الإرسال. و`'unsafe-inline'` مقصورة على الأنماط فقط ومعلَّلة. وقرار
استضافة الخط ذاتياً مأخوذ **من أجل** إبقاء `font-src 'self'` (موثّق في `src/main.js`).

**🟡 القيد:** `frame-ancestors` **تُتجاهَل** في CSP عبر `<meta>` (تتطلب ترويسة HTTP)، وGitHub Pages لا
يسمح بترويسات مخصصة. فالصفحة قابلة للتضمين في `<iframe>` من أي موقع. الأثر محدود (لا جلسات ولا
مصادقة، فما فيه clickjacking ذو قيمة)، لكن يستحق التوثيق بدل تركه فجوة صامتة. **الحل:** إما نشر عبر
Cloudflare Pages / Netlify (يدعمان `_headers`) لإضافة `frame-ancestors 'none'` و`X-Frame-Options`،
أو سطر في README يوضح القيد المقصود.

### 4.5 البيانات الحساسة — ✅ لا ينطبق

ما فيه بيانات شخصية ولا حسابات ولا معلومات مالية حقيقية. المحفوظ في `localStorage` ثلاثة مفاتيح
(`tadawulGame`, `tadawulPrices`, `tadawulStats`) كلها بيانات محاكاة. عدم تشفيرها **صحيح** — التشفير
من طرف العميل بمفتاح موجود عند العميل مسرحية لا أمان.

### 4.6 الاعتماديات — 🟠 **متوسط** — سلسلة CI حمراء الآن

شغّلت `npm ci` ثم `npm audit`:

| الحزمة | الخطورة | المسار |
|---|---|---|
| `undici` 7.0.0–7.28.0 | 🔴 High (5 تحذيرات) | تبعية تطوير غير مباشرة |
| `nanoid` <3.3.18 | 🔴 High | تبعية تطوير غير مباشرة (Vite/PostCSS) |
| `postcss` ≤8.5.22 | 🟠 Moderate | تبعية تطوير غير مباشرة (Vite) |

**الخبر الجيد:** `npm audit --omit=dev` → **0 vulnerabilities**. يعني ما يُشحَن للمستخدم نظيف تماماً؛
كلها أدوات بناء لا تصل إلى `dist/`.

**الخبر السيئ — وهذا الأهم:** ملف CI يحتوي:
> `.github/workflows/ci.yml`:
> ```yaml
> - run: npm audit --audit-level=high
> - run: npm run lint
> - run: npm run typecheck
> - run: npm run test:coverage
> - run: npm run build
> ```

نفّذتُ الأمر: `npm audit --audit-level=high` → **رمز الخروج 1**. وبما أنه **الخطوة الأولى**، فسلسلة
CI فاشلة بالكامل الآن، وخطوات lint وtypecheck والتغطية والبناء **لا تُنفَّذ أصلاً**. يعني كل بوابات
الجودة الممتازة الموصوفة في القسم 2.6 معطّلة عملياً على كل PR.

**الحل (خطوتان):**
1. `npm audit fix` — الثلاث كلها قابلة للإصلاح تلقائياً حسب مخرجات npm.
2. غيّر البوابة إلى `npm audit --omit=dev --audit-level=high` حتى يفشل البناء على ما **يُشحَن**
   فعلاً، وأضف خطوة منفصلة غير حاجبة `continue-on-error: true` لتحذيرات أدوات التطوير. الشكل الحالي
   يحوّل أي تحذير في أداة بناء إلى تعطيل كامل للمستودع.

كذلك: خطوات `actions/checkout@v4` و`setup-node@v4` مثبّتة بوسم major لا بـ SHA — و`dependabot.yml`
نفسه يقرّ بذلك ويوثّقه كخيار واعٍ. مقبول لمشروع تعليمي عام.

### درجة القسم الأمني: **8.5 / 10**

الأساس ممتاز (CSP صارم، صفر أسرار، تطهير مدخلات جادّ، صفر ثغرات في تبعيات الإنتاج). الخصم للحارس
المعطّل في ESLint وللبوابة الأمنية اللي كسرت CI بدل ما تحميه.

---

## 5. الدرجة الإجمالية المرجّحة

| الناحية | الدرجة | الوزن | المساهمة |
|---|---|---|---|
| تقنية وهندسية | 8.0 / 10 | 45% | 3.60 |
| UX / UI | 8.3 / 10 | 30% | 2.49 |
| أمن سيبراني | 8.5 / 10 | 25% | 2.13 |
| **الإجمالي** | | | **8.2 / 10** |

**الحساب:** (8.0 × 0.45) + (8.3 × 0.30) + (8.5 × 0.25) = 3.60 + 2.49 + 2.13 = **8.22**

**الخلاصة بصراحة:** هذا مشروع أقوى من متوسط ما يُنشَر بمراحل. الفصل المعماري حقيقي، 246 اختباراً
بتغطية 93% وعتبات مفروضة في CI، نظام تصميم بنِسَب تباين **محسوبة ومكتوبة**، معالجة RTL/عربية تتفوق
على تطبيقات تجارية (صفر خاصية CSS فيزيائية، تطبيع بحث عربي، إجبار الأرقام اللاتينية)، وCSP من أصرم ما
يمكن في `<meta>`. والتعليقات تشرح **ليش** لا **وش** — وكثير منها يوثّق خطأً سابقاً حتى لا يعود.

ما يمنعه من 9+ ثلاثة أشياء ملموسة: **سلسلة CI حمراء الآن** فكل هذي البوابات معطّلة عملياً؛ **لوحة
التفاصيل تتجمّد** بينما القائمة الملاصقة لها تنبض — تناقض بصري يراه كل مستخدم سطح مكتب؛ و**الأداء**
(حزمة 310KB تُحمَّل كاملة قبل أول رسمة، و216KB تُكتب إلى `localStorage` كل نبضة). كلها إصلاحات
محدودة النطاق، ولا واحد منها يستدعي إعادة كتابة أو تغييراً معمارياً.

---

## 6. خطة الإصلاح المرتبة بالأولوية

| # | الأولوية | الناحية | المشكلة | الحل المقترح | التأثير المتوقع بعد الحل |
|---|---|---|---|---|---|
| 1 | 🔴 حرج | أمن/CI | `npm audit --audit-level=high` أول خطوة في `ci.yml` ويرجّع خروج 1 (undici/nanoid/postcss) → **كل** خطوات الجودة لا تُنفَّذ | `.github/workflows/ci.yml`: نفّذ `npm audit fix`، وغيّر البوابة إلى `npm audit --omit=dev --audit-level=high`، وأضف خطوة منفصلة بـ `continue-on-error: true` لتحذيرات أدوات التطوير | تعود بوابات lint/typecheck/coverage/build للعمل على كل PR — أعلى مردود لأقل جهد في القائمة |
| 2 | 🔴 حرج | UX | لوحة تفاصيل السهم (السعر + الرسم) مجمّدة بينما القائمة الملاصقة تنبض كل دقيقة — `refreshAll()` لا تستدعي `renderStockDetails` | `src/ui/stock-details.js`: افصلها إلى `buildStockDetails()` (عند الاختيار) و`patchStockDetailsPrices()` (ترقيع السعر + `chart.update()`)، واستدعِ الثانية من `refreshAll()` في `src/main.js` | يختفي التناقض بين رقمين لنفس السهم على نفس الشاشة، بلا مسح مدخلات المستخدم |
| 3 | 🟠 مهم | هندسة | قسمة غير محدودة في محرك الأخبار: `remaining / (news.duration - elapsed)` — قِست تجريبياً عند 13,793% انحراف في نبضة واحدة بعد تغيير السرعة | `src/engine/prices.js` — في `gbmStep()`: `const step = remaining / Math.max(1, news.duration - elapsed);` | يختفي الاصطدام المفاجئ بسقف/أرضية السعر؛ تصير الحدود احتياطاً لا خط الدفاع الوحيد |
| 4 | 🟠 مهم | أمن | قاعدة ESLint الحارسة لـ `innerHTML` لا تُطابق شيئاً (تشترط اسم متغيّر `element`) — تحققتُ: سينك بلا هروب يمرّ نظيفاً | `eslint.config.js`: احذف `object` وأبقِ `property: 'innerHTML'` فقط، وارفعها إلى `'error'` مع استثناءات صريحة على الستة القائمة | يصير الحارس فعّالاً: أي سينك XSS مستقبلي يُوقَف عند الـ lint لا في الإنتاج |
| 5 | 🟠 مهم | أداء | حزمة JS واحدة 310KB (104KB gzip) تُحمَّل قبل أول رسمة، مع أن Chart.js لا يُستعمل إلا بعد اختيار سهم | `src/ui/stock-details.js`: `const { renderChart } = await import('./chart.js');` — Vite يقسّم تلقائياً | الحزمة الأولية تنزل إلى ~100KB (≈35KB gzip): **ثلث** الحجم، فرق واضح على شبكة الجوال |
| 6 | 🟠 مهم | أداء | `savePriceState()` تُسلسِل وتكتب **220,826 بايت** إلى `localStorage` بشكل متزامن كل نبضة (كل 6 ثوانٍ على 10x) | `src/main.js`: نادِ `savePriceState()` كل N نبضات + على `visibilitychange`/`beforeunload`؛ أو احفظ 30 نقطة تاريخ بدل 100 | يختفي حجب الخيط الرئيسي الدوري؛ الحفظ اللحظي يبقى على `gameState` الصغير فقط |
| 7 | 🟠 مهم | a11y | الجولة التعريفية طبقة ملء شاشة بلا فخّ تركيز وبلا `role="dialog"` — وهي أول شاشة للمستخدم الجديد | `src/ui/tour.js`: مرّر `#tour-overlay` عبر `openModal()`/`closeModal()` من `src/ui/modal.js` بدل `style.display` المباشر | مستخدم لوحة المفاتيح ما يعود يتسرّب خلف الطبقة المعتمة |
| 8 | 🟠 مهم | UX | زر الدرس الأخير مكتوب عليه `'✅ مكتمل'` (تسمية حالة) قبل إكماله؛ ومفتاح `lessonContinue` معرَّف وغير مستعمل | `src/ui/learning.js` — في `renderLesson()`: استبدل `t('lessonCompleted')` بمفتاح جديد `lessonFinish` (`'إنهاء الدرس'` / `'Finish lesson'`) في `src/ui/i18n.js` | يفهم المتعلّم وش يسوي الزر بدل ما يظن أن الدرس اكتمل تلقائياً |
| 9 | 🟠 مهم | هندسة | `gameState.transactions` تكبر بلا سقف وتُسلسَل كاملة كل نبضة | `src/state.js`: `clean.transactions = clean.transactions.slice(-500)` في `sanitizeLoadedState`، ونفس القصّ بعد `push` في `recordExecution` | حجم الحفظة يبقى محدوداً مهما طالت الجلسة |
| 10 | 🟡 تحسين | UX | حالة مربّعات المؤشرات (SMA/RSI/MACD/شموع) محفوظة في DOM فقط، فتُصفَّر مع كل تبديل ثيم/لغة/تخطيط | `src/ui/stock-details.js`: ارفعها إلى كائن وحدة `indicatorState` وأعد تطبيقه بعد كل بناء | تبقى إعدادات التحليل الفني ثابتة عبر إعادة الرسم |
| 11 | 🟡 تحسين | UX/PWA | `manifest.webmanifest` كامل لكن **لا يوجد service worker** — فالتثبيت الفعلي على أندرويد لا يتحقق، ولا يشتغل أوفلاين رغم أنه لا يحتاج شبكة إطلاقاً (`connect-src 'none'`) | أضف SW بسيط بـ cache-first على أصول `dist/` (أو `vite-plugin-pwa`)، وسجّله في `src/main.js` | تطبيق قابل للتثبيت فعلاً ويعمل بلا إنترنت — مكسب كبير لتطبيق مبني أصلاً ليكون مكتفياً ذاتياً |
| 12 | 🟡 تحسين | هندسة | 8 وحدات واجهة بلا اختبارات، أهمها `stock-details.js` (نموذج الأوامر — أهم تفاعل في التطبيق) | أضف اختبار jsdom لـ `stock-details.js`: يبني النموذج، يغيّر نوع الأمر، يتحقق من ظهور/إخفاء حقل السعر، ويؤكد حمولة `onSubmitOrder`؛ ثم احذف السطر من استثناءات `vitest.config.js` | تغطية أهم مسار غير مختبَر، والاستثناءات تنكمش بحذف سطر كما نصّ التعليق نفسه |
| 13 | 🟡 تحسين | UX | الرسم بالشموع بلا tooltip ولا محور زمني (بينما الخطي عنده)، والمفاتيح `candleOpen/High/Low/Close` معرَّفة وميتة | `src/ui/candlestick.js`: أضف `mousemove` يحسب الشمعة تحت المؤشر ويعرض OHLC بالمفاتيح الأربعة الجاهزة + تسميات زمنية أسفل المحور | تبديل نوع الرسم يصير مكسب معلومات لا خسارة |
| 14 | 🟡 تحسين | هندسة | تكرار: `((price - basePrice) / basePrice) * 100` في 4 ملفات، ثلاثة منها بلا حماية من القسمة على صفر | صدّر `changePercent()` من `src/engine/stock-filter.js` (أو انقلها إلى `utils/numbers.js`) واستعملها في `render.js` (موضعان) و`stock-details.js` | مصدر واحد للحقيقة + حماية من القسمة على صفر في كل المواضع |
| 15 | 🟡 تحسين | هندسة | حلقة `while` قد لا تنتهي في `displayRandomTips()` لو نقص عدد النصائح عن 3 | `src/ui/render.js`: `const selected = [...tips].sort(() => Math.random() - 0.5).slice(0, 3);` | يستحيل تعليق المتصفح مهما تغيّرت بيانات النصائح |
| 16 | 🟡 تحسين | a11y | `trapFocus` يجمع `input` بلا استثناء `[hidden]`، فحقل السعر المخفي يبقى في دورة الـ Tab | `src/ui/modal.js` — في `trapFocus()`: أضف `:not([hidden])` إلى المُحدِّد | دورة Tab ما توقف على حقل غير مرئي |
| 17 | 🟡 تحسين | a11y | لمس شرائح المؤشرات 36px < 44px | `src/styles/main.css` — في `.indicator-controls label`: `min-height: var(--tap-min); padding: 4px 12px;` | التزام كامل بحد اللمس الذي عرّفه المشروع لنفسه |
| 18 | 🟡 تحسين | هندسة | مكافآت التحديات (تعديل `cash` و`initialCapital`) تنطلق من داخل دالة عرض | انقل نداء `evaluateChallenges()` إلى `refreshAll()` في `src/main.js`، وخلِّ `updateChallenges()` في `render.js` ترسم البارات فقط | لا تصير إعادة الرسم معاملة مالية؛ يكتمل فصل الطبقات |
| 19 | 🟡 تحسين | توثيق | ثلاثة تقارير مراجعة بمجموع 2,216 سطراً (أحدها 1,445 سطراً في جذر المستودع)، وبعضها يصف v3.0.0؛ وREADME يذكر "59 اختباراً" بينما العدد 246 | انقل `CODE_REVIEW_*.md` و`docs/ENGINEERING_REVIEW.md` و`docs/DESIGN_REVIEW_AR.md` إلى `docs/archive/` بترويسة "أرشيف — يصف النسخة X"، وحدّث رقم الاختبارات في README | جذر نظيف، وتاريخ مراجعات مقروء بدل وثائق متناقضة |
| 20 | 🟡 تحسين | أمن | `frame-ancestors` مُتجاهَلة في CSP عبر `<meta>`، وGitHub Pages لا يدعم ترويسات مخصصة | إما النشر عبر Cloudflare Pages/Netlify مع `_headers` يضيف `frame-ancestors 'none'` و`X-Frame-Options: DENY`، أو وثّق القيد صراحة في README | الفجوة تصير قراراً موثّقاً بدل ثغرة صامتة |
| 21 | 🟡 تحسين | هندسة | 20 مفتاح ترجمة ميت (10 × لغتين): `enterStopPrice`, `hijriDate`, `transactions`, `typeBuy`, `typeSell`, `candleOpen/High/Low/Close`, `navMore`, `lessonContinue` — تحققتُ بسكربت يقارن كل نداءات `t()` بالمفاتيح المعرَّفة | احذف الميت فعلاً، أو استعمله (البند 8 يستهلك واحداً، والبند 13 يستهلك أربعة) | ملف ترجمة يعكس الواجهة الفعلية |
| 22 | 🟡 تحسين | UX | كل صفقة ناجحة تفتح مودالاً حاجباً يتطلب "موافق" — احتكاك في تطبيق هدفه التكرار | `src/main.js` — في `handleSubmitOrder()`: استبدل `showAlert(msg)` بـ toast غير حاجب (3 ثوانٍ)، وأبقِ `showAlert` للأخطاء | تدفق تداول أسرع بلا نقرة إجبارية بعد كل أمر |
| 23 | 🟡 تحسين | هندسة | `src/main.js` = 585 سطراً بأربع مسؤوليات؛ و`rebuildStaticLabels()` تخلط خريطة من 33 مفتاحاً مع 9 أسطر منفصلة بنفس النمط | ادمج التسعة في نفس الخريطة، وانقل `rebuildStaticLabels` + `buildListFilterOptions` + `syncThemeToggle` إلى `src/ui/labels.js` | `main.js` ينزل تحت 400 سطر ويصير ملف تشغيل (bootstrap) صافياً |
| 24 | 🟡 تحسين | دقة المحاكاة | ما يسمّى GBM ليس GBM: `Math.random()*2-1` توزيع منتظم لا طبيعي، وبلا تصحيح إيتو (−σ²/2). قِست الانحراف المعياري الفعلي: **0.055%** للنبضة، مقابل **0.60%** لنبضة خبر — أي أن الأخبار أقوى ~11× والمحرك "العشوائي" شبه ساكن | `src/engine/prices.js`: استعمل Box–Muller لعيّنة طبيعية، وارفع `sigma` بما يعادل √3 لتعويض فرق التوزيع، أو أعد معايرة `mu/sigma` في `src/data/stocks.js` مقابل `dt = 1/252` | تتحرك الأسعار بواقعية بين الأخبار بدل خطوط شبه مسطحة، ويصير اسم النموذج مطابقاً لسلوكه |

---

## ملحق — ما تم التحقق منه بالتشغيل الفعلي

| الفحص | الأمر | النتيجة |
|---|---|---|
| التثبيت | `npm ci` | ناجح |
| Lint | `npm run lint` | **نظيف** — صفر أخطاء وصفر تحذيرات |
| فحص الأنواع | `npm run typecheck` | **نظيف** — صفر أخطاء |
| الاختبارات | `npm run test:coverage` | **246/246 ناجحة** في 26 ملفاً — 93.38% عبارات |
| البناء | `npm run build` | ناجح في 665ms — `dist/` = 804KB، JS = 310.65KB (104KB gzip) |
| تدقيق أمني (الكل) | `npm audit` | 3 ثغرات (2 عالية، 1 متوسطة) — كلها تبعيات تطوير |
| تدقيق أمني (إنتاج) | `npm audit --omit=dev` | **0 ثغرات** |
| بوابة CI الأمنية | `npm audit --audit-level=high` | **خروج 1 — سلسلة CI حمراء الآن** |
| تطابق الترجمة | سكربت يقارن `translations.ar` و`.en` | 159 = 159، صفر مفقود، 15 قطاعاً مترجماً |
| مفاتيح `t()` المستعملة | سكربت يمسح كل `src/**/*.js` | 130 مفتاحاً مستعملاً، صفر مفقود، **20 مفتاحاً ميتاً** |
| حمولة `localStorage` | حساب بحجم البيانات الحقيقي (91 سهماً × 100 نقطة) | **220,826 بايت** لكل استدعاء `savePriceState()` |
| فعالية حارس XSS | ملف تجريبي فيه `div.innerHTML = \`<b>${input}</b>\`` | **مرّ نظيفاً** — القاعدة غير فعّالة |
| انفجار قسمة الأخبار | محاكاة 200,000 حالة بإزاحة طور | أسوأ انحراف نبضة واحدة: **13,793%** |
| سلوك محرك GBM | محاكاة 390 نبضة | انحراف معياري 0.055%/نبضة مقابل 0.60% لنبضة خبر |
| فحص الأسرار | `grep` على `src/` + `git log --all --diff-filter=A` | **لا شيء** — نظيف في العامل وفي التاريخ |
| بيانات الأسهم | سكربت تحقق من السلامة | 91 سهماً، صفر رمز مكرر، صفر حقل ناقص، 15 قطاعاً، 82 متوافقاً شرعياً (تقدير مبدئي موثّق) |
