# مراجعة كود شاملة — Saudi-Stock-Trading-Simulator

**تاريخ المراجعة:** 2026-08-03
**الفرع المُراجع:** `claude/senior-repo-review-8aijsc`
**آخر التزام:** `789daa8`

---

## الحكم النهائي

مشروع تعليمي مبني بعناية تفوق المتوسط بوضوح: طبقات مفصولة (`data` / `engine` / `ui` / `utils`)، تعليقات تشرح **سبب** القرار لا وصفه، 122 اختباراً ناجحاً بتغطية 91.53% للعبارات، وسلسلة أدوات كاملة (ESLint + Prettier + `tsc --checkJs` + Vitest + Dependabot + CI) تعمل جميعها بنجاح تحققتُ منه بالتشغيل الفعلي. لكنه يحمل ديناً حقيقياً: خلل في ترتيب العمليات داخل محرك التداول يترك أثراً سعرياً بعد أمر مرفوض، تنفيذ أوامر معلّقة أثناء إغلاق السوق يناقض منع الأوامر السوقية، وطبقة إتاحة (accessibility) بها نسب تباين تسقط دون WCAG AA مع شريطي أخبار يتحركان بلا توقف ودون أي `prefers-reduced-motion`.

**الدرجة المرجّحة: 6.6/10** — **ملف الأوزان المختار: A (تطبيق بواجهة رسومية) — 45% هندسي / 30% تجربة استخدام / 25% أمن.**

**هل المشروع جاهز للاستخدام/النشر؟ — بشروط.** هو منشور فعلياً على GitHub Pages ويعمل، لكن لا ينبغي اعتباره مرجعاً تعليمياً موثوقاً قبل إصلاح البندين الأول والثاني أدناه، ولا مقبولاً إتاحةً قبل الثالث.

أهم 3 مشاكل:

1. `applyMarketImpact` يعدّل `stockPrices` و`priceImpacts` **قبل** التحقق من كفاية الرصيد، فأمر شراء مرفوض يترك السوق متحركاً بلا صفقة — في `src/engine/trading.js`.
2. `checkPendingOrders` يُنفَّذ في كل نبضة بلا حارس لحالة السوق، فأمر محدد يمتلئ والسوق مغلق بينما الأمر السوقي يُرفض في الحالة نفسها — في `src/main.js`.
3. تباين لوني يسقط دون WCAG AA (2.68 و3.27 و3.28) وغياب `prefers-reduced-motion` مع حركتَي شريط لانهائيتين — في `src/styles/main.css`.

---

## 1. نظرة عامة

**ما يفعله المشروع:** محاكي تداول تعليمي لسوق الأسهم السعودي (تداول)، يعمل بالكامل في المتصفح دون خادم أو شبكة. يولّد الأسعار داخلياً عبر خطوة عشوائية لكل سهم، ويدعم أوامر سوقية ومحددة ووقف خسارة، مع محفظة وأخبار وتحديات ومسارات تعلّم وسيناريوهات تاريخية. الحالة كلها في `localStorage`.

**البنية:** نقطة الدخول `src/main.js` تنسّق بين `src/engine/*` (منطق الأعمال الخالص) و`src/ui/*` (طبقة العرض) عبر حالة مشتركة في `src/state.js` وثوابت مركزية في `src/config.js`. طبقة الواجهة لا تستورد `main.js`، بل تتلقى ردود النداء عبر `bindRenderCallbacks` و`bindStockDetailsCallbacks` و`bindScenariosCallbacks` — فصل صحيح للاتجاه.

**المكدّس التقني (مقروء من `package.json` و`package-lock.json` مباشرة، لا من الذاكرة):**

| الحزمة | الإصدار المطلوب | الإصدار المثبّت في القفل |
|---|---|---|
| `chart.js` (الاعتمادية الوحيدة وقت التشغيل) | `^4.5.1` | 4.5.1 |
| `vite` | `^8.1.5` | 8.1.5 |
| `vitest` | `^4.1.10` | 4.1.10 |
| `eslint` | `^10.7.0` | 10.7.0 |
| `typescript` | `^7.0.2` | 7.0.2 |
| `jsdom` | `^29.1.1` | 29.1.1 |
| `prettier` | `^3.9.5` | 3.9.5 |
| `@vitest/coverage-v8` | `^4.1.10` | 4.1.10 |

`engines.node` مضبوط على `>=18`، وسير عمل CI يستخدم Node 20.

**الحجم والتصنيف:**

- 31 ملف مصدر (`src/`) + 17 ملف اختبار + 6 ملفات إعداد + سير عملَي GitHub Actions.
- إجمالي الأسطر خارج `package-lock.json`: 9332 سطراً، منها 1210 للـ README و937 للـ CSS و958 لبيانات الأسهم.
- 91 سهماً موزعة على 15 قطاعاً، 82 منها مصنّفة متوافقة شرعياً و9 غير متوافقة.
- **تصنيف المشروع:** تطبيق ويب بواجهة رسومية، بلا خادم وبلا شبكة، يُبنى عبر Vite ويُنشر ملفات ساكنة.

**البنية التحتية الموجودة فعلياً (تحققتُ من كل بند بفتح الملف):** `.gitignore` ✅ · `LICENSE` (MIT) ✅ · `README.md` ✅ · `eslint.config.js` ✅ · `.prettierrc` ✅ · `tsconfig.json` ✅ · `vitest.config.js` مع عتبات تغطية ✅ · `.github/workflows/ci.yml` و`deploy.yml` ✅ · `.github/dependabot.yml` ✅ · `package-lock.json` ملتزَم ✅ · `tests/` تحتوي اختبارات حقيقية لا هيكلاً فارغاً ✅ · `.env.example` غير موجود — **وهذا صحيح**، فالمشروع لا يستخدم أي متغيرات بيئة.

**نتائج التشغيل الفعلي في هذه الجلسة:**

```
npm run lint       → نجح بلا أي تحذير
npm run typecheck  → نجح بلا أخطاء
npm run test:coverage → 17 ملف اختبار / 122 اختبار — كلها ناجحة
                        Statements 91.53% · Branches 82.91% · Functions 96.1% · Lines 93.12%
npm run build      → نجح في 187ms — 305.09 kB (gzip: 102.40 kB)
npm audit          → ثغرة واحدة عالية (brace-expansion، تبعية غير مباشرة في أدوات التطوير)
```

---

## 2. المراجعة التقنية والهندسية

### 2.1 المعمارية وفصل الاهتمامات — 7/10

الفصل حقيقي وليس شكلياً: `src/engine/trading.js` لا يعرف شيئاً عن الـ DOM، و`src/ui/render.js` يتلقى ردود النداء بدل استيراد المنسّق:

```js
export function bindRenderCallbacks(callbacks) {
  onSelectStock = callbacks.onSelectStock ?? onSelectStock;
  onCancelOrder = callbacks.onCancelOrder ?? onCancelOrder;
  onQuickTrade = callbacks.onQuickTrade ?? onQuickTrade;
}
```

هذا ما يجعل `tests/render-stocks.test.js` قابلاً للكتابة أصلاً. `src/config.js` يجمع كل الثوابت الرقمية في مكان واحد دون أرقام سحرية متناثرة، وهذا فوق المعتاد لمشروع بهذا الحجم.

الخصم على نقطتين. الأولى: `src/state.js` يصدّر كائنات قابلة للتغيير (`gameState`, `stockPrices`, `priceHistory`, `session`) يعدّلها المحرك والواجهة معاً مباشرة، فلا توجد نقطة واحدة تُراقَب فيها تغيّرات الحالة. الثانية: `src/ui/modal.js` يبني نظام حبس تركيز (focus trap) محترماً، ثم تتجاهله أربع نوافذ تفتح نفسها يدوياً — `src/ui/glossary.js` و`src/ui/stats.js` و`src/ui/learning.js` و`src/ui/scenarios.js`، جميعها بالنمط ذاته:

```js
export function openStatsModal() {
  renderStatsContent();
  document.getElementById('stats-modal').style.display = 'block';
}
```

**التصنيف:** `مؤكد`

**الإصلاح المقترح** — توسيع `modal.js` بدالة عامة واستخدامها في النوافذ الأربع:

```js
// قديم — في src/ui/stats.js
export function openStatsModal() {
  renderStatsContent();
  document.getElementById('stats-modal').style.display = 'block';
}
export function closeStatsModal() {
  document.getElementById('stats-modal').style.display = 'none';
}
```

```js
// جديد — في src/ui/modal.js
export function openModal(id, onClose) {
  const modal = document.getElementById(id);
  lastFocused = document.activeElement;
  modal.style.display = 'block';
  trapFocus(modal, () => closeModal(id, onClose));
}
export function closeModal(id, onClose) {
  const modal = document.getElementById(id);
  modal.style.display = 'none';
  releaseTrap(modal);
  if (typeof onClose === 'function') onClose();
  restoreFocus();
}

// جديد — في src/ui/stats.js
import { openModal, closeModal } from './modal.js';
export function openStatsModal() {
  renderStatsContent();
  openModal('stats-modal');
}
export function closeStatsModal() {
  closeModal('stats-modal');
}
```

---

### 2.2 القراءة وقابلية الصيانة — 8/10

هذه أقوى نواحي المشروع، والدرجة 8 مستحقة بأدلة محددة لا بانطباع:

**أولاً**، التعليقات تشرح المنطق خلف القرار لا الكود نفسه. مثال من `src/engine/prices.js` في `decayPriceImpact`:

```js
 * This must NOT re-add the full `impact.value` to drift every tick (the
 * previous implementation did): since impact.value only shrinks 5%/tick,
 * doing so summed a geometric series to ~20x the original impact instead of
 * fading it out.
```

**ثانياً**، `src/engine/sim-time.js` لا يوثّق ما يفعله فقط، بل يُعلن حدوده صراحة:

```js
 * Known limitation: if speed changes while an event is active, this
 * reinterprets the *entire* elapsed window at the new speed, not just the
 * time since the change ...
```

**ثالثاً**، `tsconfig.json` يبرّر نطاقه بدل أن يفرضه، ويُشغَّل فعلياً في CI فلا تتعفّن أنواع JSDoc:

```
 * Scope is deliberately the business-logic layer (engine/state/data/utils),
 * the same boundary vitest.config.js already draws for coverage.
```

الخصم الوحيد: `src/main.js` بـ383 سطراً يخلط تركيب المستمعين وإعادة بناء التسميات ومنطق الجلسة في ملف واحد؛ لو انفصل `attachEventListeners` و`rebuildStaticLabels` إلى وحدتين لصار الملف منسّقاً خالصاً.

**التصنيف:** `مؤكد` — **لا يحتاج إصلاحاً عاجلاً**

---

### 2.3 التكرار وروائح الكود — 5/10

**أ) دالة تفريغ العنصر مكرّرة أربع مرات رغم وجود نسخة جاهزة.** في `src/ui/render.js`:

```js
function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}
```

ثم تتكرر الحلقة نفسها حرفياً داخل `renderGlossary` في `src/ui/glossary.js`، و`renderStatsContent` في `src/ui/stats.js`، و`renderPathList` و`renderLesson` في `src/ui/learning.js`، و`renderScenariosContent` في `src/ui/scenarios.js` — ستة مواضع لمنطق سطر واحد.

**ب) قائمة معرّفات النوافذ مكرّرة مرتين في نفس الملف** — في `attachEventListeners` داخل `src/main.js`، مرة لمستمع النقر ومرة لمستمع `Escape`:

```js
['glossary-modal', 'stats-modal', 'learning-modal', 'scenarios-modal'].forEach((id) => {
```

**ج) تأخيرات سحرية بقيمة 100 مللي ثانية** تُستخدم كبديل عن تسلسل صريح، في ثلاثة مواضع بـ`src/main.js`. من `handleQuickTrade`:

```js
setTimeout(() => {
  const qty = document.getElementById('order-quantity');
  if (qty) qty.value = gameState.portfolio[symbol].quantity;
}, 100);
```

هذا يعمل لأن `renderStockDetails` متزامنة — أي أن التأخير غير ضروري أصلاً، وهو هشّ إن صارت غير متزامنة يوماً.

**د) شرط عشوائي مركّب بلا ثابت ولا شرح**، في `gbmStep` بـ`src/engine/prices.js`:

```js
if (Math.random() < 0.05 && Math.random() < 0.3) {
  randomShock += (Math.random() - 0.5) * 0.05;
}
```

احتمال فعلي 1.5%، مكتوب كحاصل ضرب رقمين سحريين، بينما كل ثابت آخر في المشروع مُصدَّر من `config.js`.

**هـ) تظليل اسم دالة الترجمة `t`** في `switchTab` بـ`src/main.js`:

```js
document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
```

الاسم `t` هنا يظلّل `t` المستوردة من `./ui/i18n.js` في نفس الملف. لا يسبب خطأ اليوم لأن الجسم لا يستدعي الترجمة، لكنه فخ جاهز، و`no-shadow` غير مفعّلة في `eslint.config.js`.

**التصنيف:** `مؤكد`

**الإصلاح المقترح** (البند د كنموذج):

```js
// قديم — src/engine/prices.js
if (Math.random() < 0.05 && Math.random() < 0.3) {
  randomShock += (Math.random() - 0.5) * 0.05;
}
```

```js
// جديد — src/config.js
export const SHOCK_PROBABILITY = 0.015;
export const SHOCK_MAGNITUDE = 0.05;

// جديد — src/engine/prices.js
if (Math.random() < SHOCK_PROBABILITY) {
  randomShock += (Math.random() - 0.5) * SHOCK_MAGNITUDE;
}
```

---

### 2.4 معالجة الأخطاء والحالات الحدّية — 6/10

الأساس ممتاز: كل نداء لـ`localStorage` محاط بـ`try/catch`، و`sanitizeLoadedState` في `src/state.js` يتحقق من كل حقل على حدة بدل الثقة في الـ JSON المحفوظ — وهذا نادر في مشاريع بهذا الحجم. لكن ثلاثة عيوب حقيقية في المحرك تخفض الدرجة.

#### 🔴 (أ) أثر سعري يبقى بعد أمر مرفوض — `src/engine/trading.js`

`executeMarketOrder` يستدعي `applyMarketImpact` أولاً، وهذه تُحدّث السعر الفوري وسجل الأثر التراكمي، ثم يُحتمل أن يفشل `applyBuy` — وقتها ترجع الدالة بلا أي تراجع:

```js
export function executeMarketOrder(order) {
  const avgCostBefore = gameState.portfolio[order.symbol]?.avgCost;
  const price = applyMarketImpact(order.symbol, order.type, order.quantity);
  const result =
    order.type === 'buy'
      ? applyBuy(order.symbol, price, order.quantity)
      : applySell(order.symbol, price, order.quantity);
  if (!result.ok) return result;
```

و`applyMarketImpact` تُحدث تعديلين دائمين قبل أي تحقق:

```js
  stockPrices[symbol] = price;
  return price;
```

**الأثر العملي:** مستخدم برصيد 50000 يحاول شراء 100000 سهم من سهم قيمته 85.5 → يُرفض الأمر بـ`INSUFFICIENT_FUNDS`، لكن سعر السهم قفز فعلياً و`gameState.priceImpacts[symbol].value` زاد، ثم يتحلل هذا الأثر عبر عشرات النبضات التالية. تكرار المحاولة الفاشلة يصبح آلية لتحريك السوق مجاناً — وهذا يفسد الغرض التعليمي مباشرة.

**التصنيف:** `مؤكد`

```js
// قديم — src/engine/trading.js
export function executeMarketOrder(order) {
  const avgCostBefore = gameState.portfolio[order.symbol]?.avgCost;
  const price = applyMarketImpact(order.symbol, order.type, order.quantity);
  const result =
    order.type === 'buy'
      ? applyBuy(order.symbol, price, order.quantity)
      : applySell(order.symbol, price, order.quantity);
  if (!result.ok) return result;
```

```js
// جديد — تحقُّق مسبق قبل أي تعديل على السوق
export function executeMarketOrder(order) {
  const avgCostBefore = gameState.portfolio[order.symbol]?.avgCost;
  const preCheck = canFill(order); // ترجع { ok:false, error } دون تعديل الحالة
  if (!preCheck.ok) return preCheck;
  const price = applyMarketImpact(order.symbol, order.type, order.quantity);
  const result =
    order.type === 'buy'
      ? applyBuy(order.symbol, price, order.quantity)
      : applySell(order.symbol, price, order.quantity);
  if (!result.ok) return result;
```

مع إضافة `canFill` بجوار `applyBuy`، تعيد `INSUFFICIENT_FUNDS` إذا كان `stockPrices[symbol] * quantity * (1 + COMMISSION) > gameState.cash` وتعيد `INSUFFICIENT_SHARES` إذا لم تكفِ الحيازة.

#### 🟠 (ب) الأوامر المعلّقة تُنفَّذ والسوق مغلق — `src/main.js`

الأمر السوقي محروس صراحة في `handleSubmitOrder`:

```js
if (!isMarketOpen() && !gameState.allow24Trading) {
  showAlert(t('marketClosedMessage'));
  return;
}
```

لكن نبضة المحاكاة لا تطبّق الحارس نفسه على الأوامر المعلّقة:

```js
session.updateInterval = setInterval(() => {
  updatePrices();
  const { cancelled } = checkPendingOrders();
```

بينما `updatePrices` نفسها تخرج مبكراً عند الإغلاق:

```js
export function updatePrices() {
  if (!gameState.allow24Trading && !isMarketOpen()) {
    return;
  }
```

**الأثر العملي:** يضع المستخدم أمر شراء محدد بسعر أعلى من السعر الحالي والسوق مغلق (وهذا مسموح، فوضع الأمر غير محروس) → يمتلئ في النبضة التالية خلال ثوانٍ، بينما لو ضغط "شراء سوقي" لرُفض. سلوكان متناقضان لنفس الحالة.

**التصنيف:** `مؤكد`

```js
// قديم — src/main.js
session.updateInterval = setInterval(() => {
  updatePrices();
  const { cancelled } = checkPendingOrders();
```

```js
// جديد
session.updateInterval = setInterval(() => {
  updatePrices();
  const marketLive = gameState.allow24Trading || isMarketOpen();
  const { cancelled } = marketLive ? checkPendingOrders() : { cancelled: [] };
```

#### 🟠 (ج) إعادة التعيين لا تُعيد ضبط وتيرة النبضة — `src/main.js`

`resetGameState()` تُرجع `gameState.speed` إلى 1، لكن `resetGame` لا تعيد إنشاء المؤقّت:

```js
resetGameState();
refreshAll();
closeStockModal();
displayRandomTips();
```

بينما `setSpeed` — المسار الوحيد الذي يعيد بناء المؤقّت — تفعل ذلك دائماً:

```js
function setSpeed(speed) {
  gameState.speed = speed;
  startPriceUpdates();
  startNewsUpdates();
```

**الأثر العملي:** مستخدم على سرعة 10x يضغط "إعادة تعيين" → الحالة تقول 1x وأزرار السرعة تعرض 1x، لكن المؤقّت يظل ينبض كل 6 ثوانٍ بدل 60 حتى يضغط زر سرعة يدوياً.

**التصنيف:** `مؤكد`

```js
// قديم — src/main.js داخل resetGame
resetGameState();
refreshAll();
```

```js
// جديد
resetGameState();
startPriceUpdates();
startNewsUpdates();
refreshAll();
```

#### 🟡 (د) `loadStats` بلا تحقق، على عكس `loadGameState`

في `src/state.js`، حالة اللعبة تُنقّى حقلاً حقلاً بينما الإحصاءات تُدمج كما هي:

```js
const loaded = JSON.parse(raw);
if (loaded && typeof loaded === 'object') {
  Object.assign(personalStats, defaultStats(), loaded);
}
```

بيانات تالفة (`NaN` أو نص) تصل إلى `personalStats.bestPnlPct.toFixed(2)` في `src/ui/stats.js` وتُظهر `NaN` أو ترمي استثناءً. المصدر هو تخزين المستخدم نفسه، فالأثر محدود، لكن التناقض مع المعيار الذي وضعه المشروع لنفسه واضح.

**التصنيف:** `مؤكد`

---

### 2.5 الأداء واستهلاك الموارد — 6/10

**الإيجابي، وهو مقصود وموثّق:** خريطة `stockItemRefs` في `src/ui/render.js` تتجنّب إعادة بناء 91 عقدة DOM في كل نبضة:

```js
// symbol -> { container, priceEl, changeEl }, rebuilt whenever renderStocks()
// does a full rebuild. Lets updateStockPrices() patch text on every price
// tick without recreating 90+ DOM nodes (and their listeners) each time.
```

**السلبي:** هذا التحسين لم يُعمَّم. `refreshAll` تستدعي في كل نبضة `renderPortfolio()` و`renderPendingOrders()` و`updateTicker()`، وكلها تعيد البناء الكامل. الأثقل هو الشريط في `updateTicker`:

```js
tickerEl.innerHTML = html + html;
```

هذا يبني ويحلّل نصاً بطول 182 عنصر `<span>` كل 60 ثانية — ويكون له أثر مرئي إضافي: استبدال `innerHTML` يُنشئ عقداً جديدة، فتُعاد الحركة `scrollTicker` إلى بدايتها، أي أن الشريط "يقفز" في كل نبضة بدل أن ينساب.

**التصنيف:** `مؤكد`

**ملاحظة ثانية على حجم الحزمة:** `src/ui/chart.js` يستورد `chart.js/auto`:

```js
import Chart from 'chart.js/auto';
```

المسار `/auto` يسجّل كل أنواع المخططات في المكتبة، والمشروع يستخدم `line` و`bar` فقط. الحزمة النهائية 305.09 kB (102.40 kB مضغوطة).

```js
// قديم — src/ui/chart.js
import Chart from 'chart.js/auto';
```

```js
// جديد — تسجيل ما يُستخدم فقط
import {
  Chart, LineController, BarController, LineElement, BarElement,
  PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler,
} from 'chart.js';
Chart.register(
  LineController, BarController, LineElement, BarElement,
  PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler
);
```

**ملاحظة ثالثة `محتمل`:** في `displayRandomTips` بـ`src/ui/render.js` حلقة `while` قد لا تنتهي:

```js
while (selected.length < 3) {
  const tip = tips[Math.floor(Math.random() * tips.length)];
  if (!selected.includes(tip)) selected.push(tip);
}
```

غير قابلة للوصول اليوم لأن `financialTips` يحوي عشرات النصائح لكل لغة، لكنها تتحول إلى تعليق كامل للمتصفح لحظة اختصار المصفوفة إلى أقل من 3 عناصر أو إدخال تكرار فيها.

---

### 2.6 الاختبارات والتغطية — 8/10

الاختبارات موجودة وحقيقية — فتحتُ `tests/` وشغّلتُ المجموعة، ولم أفترض وجودها من اسم المجلد. الدرجة 8 مبنية على أدلة محددة:

- **122 اختباراً في 17 ملفاً، كلها ناجحة**، بتغطية 91.53% عبارات و82.91% فروع و96.1% دوال.
- **العتبات مفروضة في CI**، لا مجرد تقرير — من `vitest.config.js`:
  ```js
  thresholds: { statements: 90, branches: 78, functions: 90, lines: 90 },
  ```
- **الاختبارات تغطي الحالات الحدّية الصعبة لا السعيدة فقط.** مثال من `tests/trading.test.js` يختبر بالضبط السلوك الذي يوثّقه تعليق `checkPendingOrders`:
  ```js
  const { executed, cancelled } = checkPendingOrders();
  expect(executed).toBe(1);
  expect(cancelled).toHaveLength(1);
  expect(cancelled[0].quantity).toBe(5);
  // Not re-queued: the failed order must not linger in pendingOrders forever.
  expect(gameState.pendingOrders).toHaveLength(0);
  ```
- **`tests/setup.js` يوفّر بديل `localStorage` ويُنظّفه قبل كل اختبار**، فلا تتسرب الحالة بين الاختبارات.

**الخصم:** `vitest.config.js` يستثني `src/ui/**` و`src/main.js` من قياس التغطية. توجد اختبارات واجهة فعلاً (`render-stocks.test.js` و`render-challenges.test.js` و`i18n.test.js`)، لكن جودتها غير مقيسة، ولا يوجد أي اختبار لـ`src/main.js` — وهو الملف الذي تعيش فيه عيوب 2.4 (ب) و(ج). الأخطاء الثلاثة التي وجدتها في هذه المراجعة تقع كلها في الحدود التي تتوقف عندها الاختبارات.

**التصنيف:** `مؤكد`

---

### 2.7 التوثيق — 5/10

توثيق الكود ممتاز (انظر 2.2). المشكلة في `README.md`: 1210 سطراً و42 كيلوبايت، وقسم "المكتبات والأدوات المستخدمة" فيه **معلومات خاطئة يمكن التحقق منها في نفس المستودع**:

```
- **Vite 5**: أداة البناء والـ dev server
- **Chart.js 3.9.1** (عبر npm): للرسوم البيانية الخطية والمؤشرات
- **Vitest + jsdom**: لاختبارات الوحدة (59 اختباراً)
```

الواقع من `package-lock.json` والتشغيل: Vite **8.1.5**، وChart.js **4.5.1**، وعدد الاختبارات **122**. ويتكرر الرقم الخاطئ في قسم "المكتبات": `**Chart.js 3.9.1**`. الشارة في أعلى الملف تعرض `version-3.1.0` بشكل صحيح، أي أن التحديث طال الرأس دون المتن.

**التصنيف:** `مؤكد`

```md
<!-- قديم — README.md -->
- **Vite 5**: أداة البناء والـ dev server
- **Chart.js 3.9.1** (عبر npm): للرسوم البيانية الخطية والمؤشرات
- **Vitest + jsdom**: لاختبارات الوحدة (59 اختباراً)
```

```md
<!-- جديد -->
- **Vite 8**: أداة البناء والـ dev server
- **Chart.js 4** (عبر npm): للرسوم البيانية الخطية والمؤشرات
- **Vitest + jsdom**: لاختبارات الوحدة (122 اختباراً، تغطية ~91%)
```

---

### 2.8 التسمية واتساق الأسلوب — 7/10

الأسلوب مفروض آلياً لا اتفاقياً: `.prettierrc` مضبوط، و`eslint.config.js` يفصل قواعد `src` عن `tests` بشكل صحيح ويشرح السبب:

```js
// Tests run in vitest's jsdom environment: both Node and browser
// globals (document, KeyboardEvent, ...) are legitimately in scope.
```

و`npm run lint` يمر بلا تحذير واحد. التسمية متسقة: `render*` للواجهة، `update*` للتحديث الجزئي، `apply*` للتعديل على الحالة، `record*` للتسجيل الإحصائي.

الخصم: قواعد مفقودة تسمح بروائح رصدتُها فعلاً — `no-shadow` (انظر 2.3 هـ) و`no-restricted-syntax` لمنع `innerHTML` (انظر 4.2). كذلك تنسيق العناصر يخلط بين البناء البرمجي عبر `createElement` والحقن النصي عبر `innerHTML` داخل نفس الملف `src/ui/render.js` — `renderStocks` تبني برمجياً بينما `renderPortfolio` تحقن نصاً.

**التصنيف:** `مؤكد`

---

### **متوسط الناحية التقنية والهندسية: (7 + 8 + 5 + 6 + 6 + 8 + 5 + 7) ÷ 8 = 6.5/10**

---

## 3. المظهر والتصميم وتجربة المستخدم

### 3.1 الاتساق البصري — 6/10

اللوحة اللونية منضبطة ومطبَّقة بثبات (`#0f3460` للأسطح، `#16a085` للأساسي، `#1a1a2e` للبطاقات الداخلية). لكن لا يوجد **نظام تصميم**: لا متغيّرات CSS مخصّصة إطلاقاً، بل قيم سداسية حرفية مكرّرة عبر 937 سطراً — `#16a085` وحده يظهر في أكثر من 15 موضعاً. والأسوأ أن الألوان تتسرّب إلى JavaScript، في `renderPortfolio` و`renderPendingOrders` بـ`src/ui/render.js`:

```js
p.style.color = '#95a5a6';
```

وفي `src/ui/glossary.js` و`src/ui/stats.js`:

```js
empty.style.cssText = 'text-align:center;color:#95a5a6;padding:20px;';
```

أي تغيير في السمة يتطلب تعديل CSS وأربعة ملفات JS.

**التصنيف:** `مؤكد`

```css
/* جديد — أعلى src/styles/main.css */
:root {
  --surface: #0f3460;
  --surface-alt: #1a1a2e;
  --primary: #16a085;
  --text-muted: #95a5a6;
  --positive: #2ecc71;
  --negative: #e74c3c;
}
```

```js
// قديم — src/ui/render.js
p.style.color = '#95a5a6';
```

```js
// جديد — يستخدم صنفاً بدل لون مضمّن
p.className = 'empty-state';
```

---

### 3.2 سهولة الاستخدام ووضوح التنقل — 7/10

البنية مفهومة: ثلاث تبويبات، شريط إجراءات، نوافذ منفصلة لكل ميزة، وجولة تعريفية تبدأ تلقائياً للمستخدم الجديد فقط — والشرط في `maybeAutoStart` بـ`src/ui/tour.js` مكتوب بذكاء، إذ لا يزعج من لديه تقدم محفوظ:

```js
const freshGame =
  gameState.transactions.length === 0 && Object.keys(gameState.portfolio).length === 0;
```

ملاحظة على هشاشة التنقل: `switchTab` في `src/main.js` يعتمد على ترتيب العناصر لا على معرّفاتها، رغم أن المعرّفات موجودة ومستخدمة في نفس الدالة لاختيار اللوحة:

```js
document.querySelector('.tab:nth-child(1)').classList.add('active');
```

إضافة أي عنصر داخل `<nav class="tabs">` تكسر هذا صامتاً. المشكلة نفسها في `rebuildStaticLabels` التي تعتمد على ترتيب `querySelectorAll('.panel-title')` — تحميها اليوم فقط الحماية `if (i < panelTitles.length)`.

كذلك يوجد CSS ميت: الصنف `.main-content` معرّف بقاعدتين (شبكة عمودين، وتحوّل إلى عمود واحد تحت 768 بكسل) ولا يظهر في `index.html` إطلاقاً.

**التصنيف:** `مؤكد`

```js
// قديم — src/main.js
document.querySelector('.tab:nth-child(1)').classList.add('active');
```

```js
// جديد
document.getElementById(`tab-${tab}`).classList.add('active');
document.getElementById(`${tab}-tab`).classList.add('active');
```

---

### 3.3 الاستجابة عبر نقاط الكسر — 6/10

نقطة كسر واحدة فقط (`max-width: 768px`)، وهي تعالج الأهم: تحويل الشبكات إلى عمود واحد، وتثبيت شريط الإحصاءات، وتصغير الخطوط. تثبيت الشريط منسّق بعناية مع الشريطين العلويين (`top: 104px` مقابل `top: 0` و`top: 36px`).

الخصم على شريط الإحصاءات نفسه:

```css
.stats {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}
```

بلا `flex-wrap`، والبطاقات الأربع تنضغط في صف واحد مهما ضاقت الشاشة. على عرض 360 بكسل تحصل كل بطاقة على نحو 80 بكسل، وتُعرض داخلها قيمة مثل `١٢٬٣٤٥٫٦٧ ريال` بحجم 13 بكسل — نص يفيض أو يُقصّ. لا توجد نقطة كسر ثانية دون 768 بكسل تعالج هذا.

**التصنيف:** `مؤكد`

```css
/* قديم */
.stats {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
```

```css
/* جديد */
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
}
```

---

### 3.4 دعم العربية و RTL — 5/10

**ما نُفّذ بشكل صحيح:** `index.html` يبدأ بـ`<html lang="ar" dir="rtl">`، والاتجاه يُبدَّل فعلياً عند تغيير اللغة في `rebuildStaticLabels` بـ`src/main.js`:

```js
document.documentElement.lang = lang;
document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
```

والتاريخ الهجري مُنفَّذ عبر `Intl` الأصلي بلا مكتبات، مع تراجع آمن في `formatHijriToday` بـ`src/utils/dates.js`. وبعض الأنماط الحديثة تستخدم خصائص منطقية صحيحة (`border-inline-start` و`padding-inline-start` و`margin-inline-start` في أقسام القاموس والدروس والسيناريوهات). هذا فوق المتوسط بوضوح.

لكن أربعة عيوب حقيقية:

#### (أ) ثلاثة عناوين نوافذ لا تُترجَم أبداً — `مؤكد`

المفاتيح موجودة في `src/ui/i18n.js` باللغتين:

```js
statsTitle: 'إحصائياتي الشخصية',
learningTitle: 'مسارات التعلم',
scenariosTitle: 'سيناريوهات تاريخية',
closeBtn: 'إغلاق',
```

وهي **غير مستدعاة في أي مكان**. `renderGlossary` وحدها تضبط عنوانها:

```js
const title = document.getElementById('glossary-title');
if (title) title.textContent = t('glossaryTitle');
```

بينما `openStatsModal` و`openLearningModal` و`openScenariosModal` لا تفعل. النتيجة: في الوضع الإنجليزي تُفتح ثلاث نوافذ بعناوين عربية ثابتة من `index.html`. ونفس الأمر لأزرار الإغلاق التي تحمل `aria-label="إغلاق"` مكتوبة يدوياً في `index.html` رغم وجود `closeBtn` جاهزاً بترجمتيه.

كذلك نصوص التحديات في `index.html` عربية ثابتة بلا مقابل إنجليزي:

```html
<div><strong>التحدي 1:</strong> ربح 10% من رأس المال</div>
<div style="color: #f39c12; margin-top: 5px">المكافأة: دعم 100,000 ريال</div>
```

```js
// جديد — src/ui/stats.js
export function openStatsModal() {
  document.getElementById('stats-title').textContent = t('statsTitle');
  renderStatsContent();
  openModal('stats-modal');
}
```

#### (ب) نمطان مختلفان للأرقام في نفس الصف — `مؤكد`

`formatCurrency` في `src/utils/numbers.js` تستخدم `ar-SA`:

```js
const locale = lang === 'ar' ? 'ar-SA' : 'en-US';
const formatted = Number(value).toLocaleString(locale, {
```

ونظام الترقيم المُستنتَج لـ`ar-SA` هو `arab`، فالناتج **أرقام هندية عربية**: `١٢٬٣٤٥٫٦٧`. بينما في نفس الدالة `updateStats` بـ`src/ui/render.js`، تُبنى قيمة الربح/الخسارة بـ`toFixed`:

```js
pnlEl.textContent = `${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} ${t('sar')} (${pnl >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%)`;
```

والناتج **أرقام غربية**: `12345.67`. أي أن بطاقات "الرصيد النقدي" و"قيمة المحفظة" و"إجمالي الأصول" تعرض `١٢٬٣٤٥٫٦٧ ريال` بينما بطاقة "الربح/الخسارة" المجاورة لها مباشرة تعرض `+1234.56 ريال` — في نفس الشريط، على نفس الشاشة. وينسحب التناقض على قائمة الأسهم كلها (`price.toFixed(2)`) وتفاصيل المحفظة والأوامر.

تحققتُ من السلوك عملياً:

```
(12345.67).toLocaleString('ar-SA', {minimumFractionDigits:2}) → ١٢٬٣٤٥٫٦٧
(12345.67).toFixed(2)                                        → 12345.67
```

الحل الأنظف هو توحيد المشروع على الأرقام الغربية (وهي المعتادة في الواجهات المالية السعودية) بتثبيت نظام الترقيم:

```js
// قديم — src/utils/numbers.js
const locale = lang === 'ar' ? 'ar-SA' : 'en-US';
```

```js
// جديد — يحافظ على فواصل الآلاف العربية بأرقام غربية
const locale = lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US';
```

#### (ج) خصائص فيزيائية في CSS تكسر الاتجاه الإنجليزي — `مؤكد`

زر إغلاق النوافذ مثبَّت يساراً بشكل مطلق:

```css
.close-modal {
  position: absolute;
  top: 15px;
  left: 15px;
```

وهذا صحيح في RTL وخاطئ في LTR (يجب أن يكون يميناً). نفس المشكلة في `.lang-switch { left: 20px }`. وأشرطة التمييز الجانبية كلها فيزيائية: `border-left` في `.stock-item` و`.stock-item:hover` و`.stock-item.selected` و`.tip-item` و`.challenge-item` و`.order-item` — ستة مواضع، بينما نفس الملف يستخدم `border-inline-start` بشكل صحيح في `.glossary-item` و`.lesson-path-card` و`.scenario-card`. الاتساق مفقود داخل نفس الملف.

```css
/* قديم */
.close-modal {
  top: 15px;
  left: 15px;
}
.stock-item {
  border-left: 4px solid transparent;
}
```

```css
/* جديد */
.close-modal {
  top: 15px;
  inset-inline-end: 15px;
}
.stock-item {
  border-inline-start: 4px solid transparent;
}
```

#### (د) معالجة اتجاه يدوية داخل JS — `مؤكد`

في `renderPendingOrders` بـ`src/ui/render.js` يُحسب اسم الخاصية من اللغة:

```js
<span style="color:#95a5a6;margin-${lang === 'ar' ? 'right' : 'left'}:10px;">(${order.symbol})</span>
```

وفي `buildStockItem`:

```js
right.style.textAlign = 'left';
```

وفي `renderPathList` بـ`src/ui/learning.js`:

```js
item.style.textAlign = lang === 'ar' ? 'right' : 'left';
```

الثلاثة تُحل بخاصية منطقية واحدة تعمل في الاتجاهين دون شرط:

```js
// قديم
item.style.textAlign = lang === 'ar' ? 'right' : 'left';
```

```js
// جديد
item.style.textAlign = 'start';
```

**ملاحظة على الخط:** `body` يستخدم `font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif` — لا توجد أي خطوط عربية في السلسلة. Tahoma تغطي العربية على ويندوز، لكن على macOS وأندرويد ولينكس يقع العرض على `sans-serif` الافتراضي بجودة متفاوتة. إضافة `'Noto Sans Arabic', 'IBM Plex Sans Arabic'` قبل `sans-serif` تكلفة سطر واحد.

---

### 3.5 الإتاحة (Accessibility) — 4/10

**ما نُفّذ جيداً:** حبس تركيز حقيقي في `src/ui/modal.js` مبني على `AbortController` — وهذا نمط نظيف لا يُسرّب مستمعين:

```js
const controller = new AbortController();
traps.set(modal, controller);
```

وحلقة تركيز مرئية عالية التباين:

```css
button:focus-visible,
input:focus-visible,
[tabindex]:focus-visible {
  outline: 3px solid #f1c40f;
  outline-offset: 2px;
}
```

وعناصر الأسهم قابلة للوصول بلوحة المفاتيح مع `role="button"` و`tabindex="0"` ومعالج `Enter`/`Space`، وصنف `.sr-only` مُنفَّذ بشكل صحيح.

**لكن أربع مشاكل حقيقية:**

#### (أ) نسب تباين تسقط دون WCAG AA — `مؤكد`

حسبتُ النسب فعلياً من قيم CSS الموجودة:

| المقدمة | الخلفية | النسبة | الاستخدام | الحكم |
|---|---|---|---|---|
| `#9b59b6` | `#0f3460` | **2.68** | `.market-status.override` (13 بكسل عريض) | ❌ يسقط في AA وAA-large معاً |
| `#e74c3c` | `#0f3460` | **3.27** | `.market-status.closed` (13 بكسل عريض) | ❌ يسقط في AA للنص العادي |
| `#ffffff` | `#16a085` | **3.28** | نص كل أزرار `.btn-primary` (14 بكسل عريض) | ❌ يسقط في AA |
| `#ffffff` | `#e74c3c` | **3.82** | نص كل أزرار `.btn-danger` | ❌ يسقط في AA |
| `#e74c3c` | `#1a1a2e` | **4.46** | `.negative` داخل بطاقات المحفظة | ❌ أقل بقليل من 4.5 |

للمقارنة، بقية اللوحة سليمة: `#e0e0e0` على `#1a1a2e` تعطي 12.92، و`#bdc3c7` على `#1a1a2e` تعطي 9.58، و`#2ecc71` على `#0f3460` تعطي 5.95. المشكلة محصورة في البنفسجي والأحمر والأزرار الأساسية.

```css
/* قديم */
.market-status.override { color: #9b59b6; }
.market-status.closed { color: #e74c3c; }
.btn-primary { background: #16a085; color: white; }
```

```css
/* جديد — نسب محسوبة: 5.33 و5.56 و6.88 على التوالي */
.market-status.override { color: #c39bd3; }
.market-status.closed { color: #f1948a; }
.btn-primary { background: #0e6655; color: white; }
```

#### (ب) لا يوجد `prefers-reduced-motion` إطلاقاً — `مؤكد`

بحثتُ في كل `src/` ولا وجود للاستعلام. والصفحة تشغّل حركتين لانهائيتين طوال الوقت:

```css
.ticker-content {
  animation: scrollTicker 400s linear infinite;
}
.news-ticker-content {
  animation: scrollNews 50s linear infinite;
}
```

بالإضافة إلى `fadeIn` و`slideDown` لكل نافذة، و`transform: translateY(-2px)` عند كل تمرير فوق زر، و`transform: scale(1.2)` على زر الإغلاق، و`transform: translateX(-5px)` على كل سهم في القائمة. لمستخدم لديه حساسية دهليزية هذه صفحة غير قابلة للاستخدام، والإصلاح كتلة واحدة:

```css
/* جديد — أضف في نهاية src/styles/main.css */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

ويجب أن يقترن به تعطيل `scrollIntoView` السلس في `positionHighlight` بـ`src/ui/tour.js`:

```js
// قديم
el.scrollIntoView({ behavior: 'smooth', block: 'center' });
```

```js
// جديد
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
```

#### (ج) نمط التبويبات ناقص `aria-selected` — `مؤكد`

`index.html` يعلن الأدوار كاملة:

```html
<nav class="tabs" role="tablist">
  <button class="tab active" id="tab-market" role="tab" aria-controls="market-tab">
```

لكن `aria-selected` غير موجود في المستند كله، ولا تضبطه `switchTab` عند التبديل. قارئ الشاشة يعلن "تبويب" لثلاثة عناصر دون أن يعرف أياً منها نشط — وهذا أسوأ من عدم إعلان الدور أصلاً، لأن المستخدم يتوقع من `role="tab"` سلوكاً كاملاً. كذلك `role="tabpanel"` بلا `aria-labelledby` يربطه بتبويبه، وبلا `tabindex="0"` يجعله محطة تركيز.

```html
<!-- قديم -->
<button class="tab active" id="tab-market" role="tab" aria-controls="market-tab">
<div id="market-tab" class="tab-content active" role="tabpanel">
```

```html
<!-- جديد -->
<button class="tab active" id="tab-market" role="tab" aria-controls="market-tab" aria-selected="true">
<div id="market-tab" class="tab-content active" role="tabpanel" aria-labelledby="tab-market" tabindex="0">
```

```js
// جديد — في switchTab بـ src/main.js
document.querySelectorAll('.tab').forEach((el) => {
  el.classList.remove('active');
  el.setAttribute('aria-selected', 'false');
});
const activeTab = document.getElementById(`tab-${tab}`);
activeTab.classList.add('active');
activeTab.setAttribute('aria-selected', 'true');
```

#### (د) هدف لمس أصغر من الحد الأدنى — `مؤكد`

القاعدة العامة تحترم 44 بكسل:

```css
.btn {
  padding: 10px 15px;
  min-height: 44px;
}
```

ثم يُلغيها شريط الإجراءات لأزراره الخمسة:

```css
.action-bar .btn {
  font-size: 13px;
  padding: 8px 12px;
  min-height: auto;
}
```

الارتفاع الناتج نحو 33 بكسل، أي دون حد WCAG 2.2 (24 بكسل كحد أدنى مطلق، و44 بكسل للمستوى AAA وهو المستهدف هنا بدليل القاعدة العامة). خمسة أزرار متجاورة على الجوال بهذا الحجم = أخطاء لمس متكررة.

```css
/* قديم */
.action-bar .btn { font-size: 13px; padding: 8px 12px; min-height: auto; }
```

```css
/* جديد */
.action-bar .btn { font-size: 13px; padding: 8px 12px; min-height: 44px; }
```

**ملاحظة تصميمية `مؤكد`:** الشريطان العلويان يحملان `aria-hidden="true"` في `index.html`. هذا قرار صحيح لشريط الأسعار (تكرار ضجيجي لما في قائمة الأسهم)، لكنه يحجب عن قارئ الشاشة **الأخبار التي تحرّك الأسعار فعلياً** — وهي معلومة لا تظهر في أي مكان آخر في الواجهة. البديل: إبقاء `aria-hidden` على الشريط المتحرك وإضافة منطقة `aria-live="polite"` مخفية بصرياً تعلن الخبر الجديد مرة واحدة.

---

### 3.6 تغذية المستخدم الراجعة — 8/10

هذه أفضل نواحي تجربة الاستخدام، والدرجة 8 مبنية على أدلة لا انطباع:

**أولاً، كل إجراء مدمّر مؤكَّد.** لا يوجد `confirm()` أصلي واحد؛ بل نافذة مخصّصة تعيد وعداً، مع حبس تركيز — في `showConfirm` بـ`src/ui/modal.js`:

```js
const signal = trapFocus(modal, () => settle(false));
yesBtn.addEventListener('click', () => settle(true), { signal });
noBtn.addEventListener('click', () => settle(false), { signal });
```

مستخدَمة في `resetGame` و`handleCancelOrder` واستبدال السيناريو النشط.

**ثانياً، كل قائمة لها حالة فارغة مترجَمة** — المحفظة (`portfolioEmpty`) والأوامر (`noPendingOrders`) والقاموس (`لا توجد نتائج` / `No results`) والإحصاءات (`statsNoData`) وشريط الأخبار (`noNewNews`).

**ثالثاً، وهذا الأهم، الفشل الصامت مُعالَج صراحة.** أمر معلّق تحقق شرطه لكن تعذّر تنفيذه لا يختفي بهدوء — في `startPriceUpdates` بـ`src/main.js`:

```js
// Orders whose trigger fired but couldn't execute (e.g. two orders
// competing for the same shares) are dropped rather than retried forever;
// let the user know instead of a pending order silently vanishing.
if (cancelled.length > 0) {
  showAlert(t('pendingOrdersAutoCancelled'));
}
```

**رابعاً**، حالة السوق المغلق تُعرض في ثلاثة مستويات: شارة دائمة مع وقت الافتتاح القادم، وتحذير `role="alert"` داخل نافذة السهم، ورفض صريح عند محاولة التنفيذ.

**الخصم الوحيد:** لا توجد رسائل خطأ **مضمَّنة بجوار الحقل** — كل خطأ إدخال يفتح نافذة تحجب النموذج، فيفقد المستخدم سياق الحقل الذي أخطأ فيه، وعليه إغلاقها ليعود. لا حاجة لحالات تحميل هنا لأن كل العمليات متزامنة محلياً.

**التصنيف:** `مؤكد`

---

### **متوسط ناحية UX/UI: (6 + 7 + 6 + 5 + 4 + 8) ÷ 6 = 6.0/10**

---

## 4. المراجعة الأمنية

**نموذج التهديد أولاً**، لأن الشدّة تُقاس بقابلية الوصول لا بمطابقة النمط: هذا تطبيق ساكن بالكامل — بلا خادم، بلا استدعاءات شبكة وقت التشغيل، بلا مصادقة، وبلا معالجة لمعاملات URL. مصادر الإدخال ثلاثة فقط: حقلا رقم في نموذج الأمر، وحقل بحث نصي في القاموس، ومحتوى `localStorage` الذي يملكه المستخدم نفسه. كل نص معروض آخر مُجمَّع داخل الحزمة. لذلك أي "ثغرة حقن" هنا تُقيَّم بالنمط لا بالأثر، وأصنّفها بصراحة كذلك بدل تضخيمها.

### 4.1 الأسرار وبيانات الاعتماد — 9/10

بحثتُ في كل ملفات المستودع بما فيها المخفية: **لا توجد أي مفاتيح أو رموز أو نقاط نهاية أو بيانات اعتماد**. لا استدعاء شبكة واحد في `src/` (لا `fetch` ولا `XMLHttpRequest` ولا CDN في `index.html`). و`.gitignore` يغطي الحالتين احترازاً:

```
.env
.env.local
```

الدرجة 9 مبررة بثلاثة أدلة: صفر بيانات اعتماد، صفر مسار خروج شبكي يمكن تسريبها عبره، وملف تجاهل يغطي الأنماط الحساسة مسبقاً. حجبتُ الدرجة العاشرة لأن `index.html` ينشر بريد المطوّر الشخصي نصاً صريحاً في التذييل — وهو خيار المؤلف الواعي، لكنه سطح لجمع العناوين الآلي.

**التصنيف:** `مؤكد` · **الشدة: منخفض 🔵**

---

### 4.2 الحقن (XSS / CSV) — 7/10

**أ) `innerHTML` في خمسة مسارات عرض** — `renderPortfolio` و`renderPendingOrders` و`updateTicker` و`updateNewsTicker` في `src/ui/render.js`، و`renderStockDetails` في `src/ui/stock-details.js`. الأخطر شكلاً في `updateTicker`:

```js
html += `
  <span class="ticker-item">
    <strong>${lang === 'ar' ? stock.name : stock.nameEn}</strong>
    ${price.toFixed(2)}
```

**تقييم الشدة الواقعي:** `stock.name` يأتي من `src/data/stocks.js` المُجمَّع في الحزمة، و`price` رقم مُنسَّق. لا يوجد مسار يصل به نص من المستخدم أو من الشبكة إلى أي من هذه المصارف. **هذه ليست ثغرة قابلة للاستغلال في هذا المشروع**، والادعاء بغير ذلك تضخيم.

ما يستحق الملاحظة فعلاً هو **التناقض** الذي يُظهر أن الفريق يعرف الخطر ويطبّقه في موضع واحد فقط. الدالة موجودة في `src/ui/render.js`:

```js
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
```

ومستدعاة في `updateNewsTicker` وحدها:

```js
html += `<span class="news-item"><span class="${className}">${icon} 📰 ${escapeHtml(newsText(news, lang))}</span></span>`;
```

بينما `updateTicker` المجاورة لها مباشرة في نفس الملف لا تستدعيها. حماية غير متسقة تتحول إلى ثغرة حقيقية لحظة إضافة أي مصدر بيانات خارجي (خبر من API، اسم سهم من ملف يرفعه المستخدم) — وهو تطوّر متوقع لمحاكي أسواق.

**التصنيف:** `مؤكد` · **الشدة الحالية: منخفض 🔵** · **الشدة عند إضافة أي مدخل غير موثوق: عالي 🟠** · **التصنيف: CWE-79**

```js
// قديم — src/ui/render.js في updateTicker
html += `
  <span class="ticker-item">
    <strong>${lang === 'ar' ? stock.name : stock.nameEn}</strong>
```

```js
// جديد
html += `
  <span class="ticker-item">
    <strong>${escapeHtml(lang === 'ar' ? stock.name : stock.nameEn)}</strong>
```

**ب) حقن صيغ في CSV** — `escapeCsvField` في `src/ui/csv-export.js` يعالج علامات الاقتباس والفواصل والأسطر بشكل صحيح:

```js
if (/[",\n]/.test(str)) {
  return `"${str.replace(/"/g, '""')}"`;
}
```

لكنه لا يعالج البادئات `=` و`+` و`-` و`@` التي تفسّرها Excel وGoogle Sheets كصيغة. الحقول المُصدَّرة هي الاسم (بيانات ساكنة) والرمز والأرقام، فلا مسار وصول اليوم — لكن الملف يُفتح خارج التطبيق، أي أن حدود الثقة تُعبَر فعلاً.

**التصنيف:** `مؤكد` · **الشدة: منخفض 🔵** · **التصنيف: CWE-1236**

```js
// قديم
function escapeCsvField(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) {
```

```js
// جديد
function escapeCsvField(value) {
  let str = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
  if (/[",\n]/.test(str)) {
```

---

### 4.3 التحقق من المدخلات والتنقية — 8/10

الدرجة 8 مبنية على دليلين ملموسين.

**الأول:** `safeParseNumber` في `src/utils/numbers.js` تفرض حدوداً صريحة وترفض غير المنتهي، وتُستدعى مع حدود من `config.js` لا بأرقام مضمّنة:

```js
const parsed = Number(raw);
if (!Number.isFinite(parsed)) return null;
const num = integer ? Math.floor(parsed) : parsed;
if (num < min || num > max) return null;
```

**الثاني، وهو الأقوى:** `sanitizeLoadedState` في `src/state.js` يتعامل مع المحفوظات كمدخل غير موثوق حقلاً حقلاً، لا بـ`Object.assign` كسول. الأوامر المعلّقة مثالاً — يتحقق من وجود الرمز فعلاً في قائمة الأسهم، ومن النوع، ومن الصنف، ومن أن السعر المرجعي المطلوب لهذا الصنف تحديداً منتهٍ:

```js
order &&
findStock(order.symbol) &&
(order.type === 'buy' || order.type === 'sell') &&
(order.kind === 'limit' || order.kind === 'stop-loss') &&
Number.isFinite(order.quantity) &&
order.quantity > 0 &&
(order.kind !== 'limit' || Number.isFinite(order.limitPrice)) &&
(order.kind !== 'stop-loss' || Number.isFinite(order.stopPrice))
```

مع ترقية للمحفوظات القديمة تمنع كسر منطق الإلغاء:

```js
// Saves from older versions may predate order ids; cancellation looks orders up by id.
.map((order) => ({ ...order, id: order.id ?? Date.now() + Math.random() }));
```

هذا مستوى دفاع أعلى من المتوقع لمشروع بلا خادم.

**الخصمان:** ثغرتان في نفس الملف. الأولى وُصفت في 2.4 (د) — `loadStats` بلا أي تحقق. الثانية `completedLessons` التي تُنسخ كما هي دون التحقق من المفاتيح أو القيم:

```js
if (loaded.completedLessons && typeof loaded.completedLessons === 'object') {
  clean.completedLessons = { ...loaded.completedLessons };
}
```

الأثر تجميلي فقط (`pathProgress` تحسب `filter(l => completed[l.id])`، فمفاتيح غريبة تُتجاهل)، لكنه ينقض النمط الذي يفرضه باقي الدالة.

**التصنيف:** `مؤكد` · **الشدة: منخفض 🔵**

---

### 4.4 المصادقة والتفويض — `لا ينطبق`

لا حسابات ولا جلسات ولا خادم ولا مستخدمون متعددون. البند مستبعَد من حساب المتوسط بدل تسجيل صفر.

---

### 4.5 التعامل مع البيانات الحسّاسة — 8/10

لا بيانات شخصية على الإطلاق: المخزَّن هو حالة لعبة وأسعار وإحصاءات، تحت ثلاثة مفاتيح من `src/config.js` و`src/state.js` (`tadawulGame`, `tadawulPrices`, `tadawulLang`, `tadawulStats`). لا تشفير مطلوب لأن لا شيء يستحقه، ولا نقل عبر الشبكة أصلاً.

التسجيل نظيف كذلك — كل `console.error` يسجّل كائن الاستثناء فقط، لا محتوى المخزَّن:

```js
console.error('Failed to parse saved game; ignoring:', e);
```

الخصم على تفصيل واحد: `resetGame` في `src/main.js` تحذف مفتاحَي اللعبة والأسعار فقط:

```js
localStorage.removeItem(STORAGE_KEY);
localStorage.removeItem(PRICES_STORAGE_KEY);
```

بينما `tadawulStats` يبقى — وهذا قرار مقصود على الأرجح (إحصاءات مدى الحياة)، لكن نص التأكيد يَعِد بغير ذلك: «سيتم فقدان جميع التقدم!». الدالة `resetStats` موجودة ومختبَرة في `src/state.js` لكنها غير مستدعاة من مسار إعادة التعيين. إما أن يُصحَّح النص أو يُضاف خيار ثانٍ.

**التصنيف:** `مؤكد` · **الشدة: منخفض 🔵**

---

### 4.6 صحة الاعتماديات — 7/10

**الإيجابي، وهو حقيقي:** اعتمادية واحدة فقط وقت التشغيل (`chart.js`)، و`package-lock.json` ملتزَم، وسير CI يستخدم `npm ci` لا `npm install`، و`.github/dependabot.yml` مضبوط بوعي يشرح نفسه:

```yaml
ignore:
  - dependency-name: 'chart.js'
    update-types: ['version-update:semver-major']
```

مع مسار منفصل لتحديث إجراءات GitHub وتبرير مكتوب لذلك.

**السلبي:** تشغيل `npm audit` بعد `npm ci` في هذه الجلسة أعطى:

```
brace-expansion  4.0.0 - 5.0.7
Severity: high
brace-expansion: DoS via unbounded expansion length causing an out-of-memory process crash
fix available via `npm audit fix`
```

الإصدار المثبّت في القفل هو `brace-expansion@5.0.7`. **تقييم الشدة الواقعي:** هذه تبعية غير مباشرة لأدوات التطوير فقط، لا تدخل حزمة الإنتاج إطلاقاً (الحزمة النهائية 305 kB وتحتوي `chart.js` وكود المشروع فقط)، والاستغلال يتطلب تمرير نمط خبيث لأداة سطر أوامر محلية. أي: **متوسط 🟡 لا حرج**، وقابل للإصلاح بأمر واحد.

**ملاحظة ثانية:** لا يوجد `npm audit` في `.github/workflows/ci.yml`، فلا شيء يمنع دخول ثغرة تبعية بصمت بين مراجعتين.

**التصنيف:** `مؤكد` · **الشدة: متوسط 🟡**

```yaml
# قديم — .github/workflows/ci.yml
      - run: npm ci
      - run: npm run lint
```

```yaml
# جديد
      - run: npm ci
      - run: npm audit --audit-level=high
      - run: npm run lint
```

---

### 4.7 رؤوس الأمان و CSP — 5/10

`index.html` لا يحتوي أي `<meta http-equiv="Content-Security-Policy">`، والنشر على GitHub Pages لا يتيح التحكم في رؤوس HTTP، فالوسم داخل المستند هو الأداة الوحيدة المتاحة — ولم تُستخدم.

الظرف هنا مثالي لسياسة صارمة: التطبيق **لا يحتاج أي مصدر خارجي إطلاقاً** — لا خطوط ولا صور ولا نصوص برمجية من CDN ولا استدعاءات شبكة. سياسة تقفل كل شيء ستمر دون كسر أي وظيفة، وتحوّل مصارف `innerHTML` في 4.2 من خطر كامن إلى خطر مُخفَّف بعمق دفاعي حقيقي.

**التصنيف:** `مؤكد` · **الشدة: منخفض 🔵**

```html
<!-- قديم — src/../index.html داخل <head> -->
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

```html
<!-- جديد -->
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
/>
```

(`'unsafe-inline'` للأنماط ضروري لأن الشيفرة تضبط `style.display` و`style.width` برمجياً في عشرات المواضع؛ إزالته تتطلب إعادة هيكلة إلى أصناف CSS.)

---

### **متوسط الناحية الأمنية: (9 + 7 + 8 + 8 + 7 + 5) ÷ 6 = 7.3/10**

(بند المصادقة والتفويض مستبعَد كـ`لا ينطبق`.)

---

## 5. الدرجة الإجمالية المرجّحة

**ملف الأوزان: A — تطبيق بواجهة رسومية.** اخترتُه لأن المشروع تطبيق ويب تفاعلي كامل الواجهة يُبنى ويُنشر، لا مكتبة ولا أداة سطر أوامر (فيسقط B)، ولا أداة ملف واحد بلا بناء (فيسقط C)، ولا خدمة خلفية تعالج بيانات مستخدمين (فيسقط D). وزن الأمن 25% يبقى منصفاً رغم ضيق سطح الهجوم، لأن التقييم يقيس النضج الأمني (تنقية المدخلات، صحة الاعتماديات، العمق الدفاعي) لا عدد الثغرات المستغَلة فقط.

| الناحية | الدرجة | الوزن | المساهمة |
|---|---|---|---|
| تقنية وهندسية | 6.5/10 | 45% | 2.925 |
| UX/UI | 6.0/10 | 30% | 1.800 |
| أمن سيبراني | 7.3/10 | 25% | 1.825 |
| **الإجمالي** | | **100%** | **6.55 → 6.6/10** |

**الحساب التفصيلي:**

- الهندسي: `(7 + 8 + 5 + 6 + 6 + 8 + 5 + 7) ÷ 8 = 52 ÷ 8 = 6.5` → `6.5 × 0.45 = 2.925`
- تجربة الاستخدام: `(6 + 7 + 6 + 5 + 4 + 8) ÷ 6 = 36 ÷ 6 = 6.0` → `6.0 × 0.30 = 1.800`
- الأمن: `(9 + 7 + 8 + 8 + 7 + 5) ÷ 6 = 44 ÷ 6 = 7.33` → `7.33 × 0.25 = 1.833`
- **المجموع: `2.925 + 1.800 + 1.833 = 6.558` → `6.6/10`**

**موضع الدرجة على المقياس:** أعلى من "مشروع شخصي وظيفي نموذجي" (5-6) بفارق واضح تبرره سلسلة أدوات كاملة تعمل و122 اختباراً بعتبات مفروضة وتوثيق داخلي فوق المتوسط، ودون "جاهز للإنتاج" (7-8) بسبب ثلاثة عيوب سلوكية في المحرك وطبقة إتاحة تسقط في التباين والحركة.

---

## 6. خطة الإصلاح المرتّبة بالأولوية

| # | الأولوية | الناحية | المشكلة | الملف | الحل المقترح | الجهد | التأثير بعد الحل |
|---|---|---|---|---|---|---|---|
| 1 | حرج 🔴 | هندسي | أثر سعري يبقى في السوق بعد رفض الأمر لعدم كفاية الرصيد | `src/engine/trading.js` | تحقق مسبق `canFill` قبل `applyMarketImpact` | ساعة | إزالة أخطر خلل في نزاهة المحاكاة |
| 2 | حرج 🔴 | هندسي | تنفيذ الأوامر المعلّقة والسوق مغلق، خلافاً للأوامر السوقية | `src/main.js` | حارس `marketLive` قبل `checkPendingOrders` | دقائق | اتساق سلوك التداول مع ساعات السوق |
| 3 | حرج 🔴 | UX | نسب تباين 2.68 و3.27 و3.28 و3.82 دون WCAG AA | `src/styles/main.css` | استبدال 4 قيم لونية بالبدائل المحسوبة | دقائق | امتثال AA لكل النصوص والأزرار |
| 4 | مهم 🟠 | UX | لا `prefers-reduced-motion` مع شريطين لانهائيين وعشرات الانتقالات | `src/styles/main.css` + `src/ui/tour.js` | كتلة `@media` عامة + شرط `scrollIntoView` | دقائق | الصفحة تصبح قابلة للاستخدام مع الحساسية الدهليزية |
| 5 | مهم 🟠 | هندسي | إعادة التعيين لا تُعيد بناء المؤقّت فتبقى السرعة القديمة فعلياً | `src/main.js` | استدعاء `startPriceUpdates` و`startNewsUpdates` في `resetGame` | دقائق | تطابق السرعة المعروضة مع الفعلية |
| 6 | مهم 🟠 | UX | نمطا أرقام مختلفان (هندية عربية مقابل غربية) في نفس شريط الإحصاءات | `src/utils/numbers.js` | `ar-SA-u-nu-latn` في `formatCurrency` | دقائق | توحيد شكل الأرقام في الواجهة كلها |
| 7 | مهم 🟠 | UX | 3 عناوين نوافذ + `aria-label` أزرار الإغلاق + نصوص التحديات لا تُترجَم | `src/ui/stats.js`, `learning.js`, `scenarios.js`, `index.html` | استدعاء المفاتيح الموجودة أصلاً (`statsTitle` وأخواتها) | ساعة | ترجمة إنجليزية مكتملة |
| 8 | مهم 🟠 | UX | `role="tab"` بلا `aria-selected` و`tabpanel` بلا `aria-labelledby` | `index.html` + `src/main.js` | ضبط السمات في `switchTab` | ساعة | نمط تبويبات صحيح لقارئات الشاشة |
| 9 | مهم 🟠 | UX | 4 نوافذ (قاموس/إحصاءات/تعلم/سيناريوهات) بلا حبس تركيز ولا استعادته | `src/ui/glossary.js`, `stats.js`, `learning.js`, `scenarios.js` | `openModal`/`closeModal` عامتان في `modal.js` | ساعة | إتاحة متسقة + إزالة تكرار رباعي |
| 10 | مهم 🟠 | UX | `border-left` و`left:` فيزيائية تكسر الوضع الإنجليزي (6 مواضع + زرَّان مثبتان) | `src/styles/main.css` | `border-inline-start` و`inset-inline-end` | ساعة | صحة الاتجاهين معاً |
| 11 | مهم 🟠 | هندسي | `README` يعلن Vite 5 وChart.js 3.9.1 و59 اختباراً — والواقع 8 و4.5.1 و122 | `README.md` | تحديث قسمَي المكتبات | دقائق | إزالة معلومات خاطئة قابلة للتحقق |
| 12 | مهم 🟠 | أمن | ثغرة `brace-expansion` عالية في أدوات التطوير + غياب `npm audit` من CI | `package-lock.json`, `.github/workflows/ci.yml` | `npm audit fix` + خطوة تدقيق في CI | دقائق | إغلاق الثغرة ومنع تكرارها |
| 13 | مهم 🟠 | UX | هدف لمس 33 بكسل لأزرار شريط الإجراءات الخمسة | `src/styles/main.css` | إعادة `min-height: 44px` | دقائق | تقليل أخطاء اللمس على الجوال |
| 14 | تحسين 🟡 | أمن | غياب CSP رغم أن التطبيق لا يحتاج أي مصدر خارجي | `index.html` | وسم `Content-Security-Policy` صارم | دقائق | عمق دفاعي يغطي كل مصارف `innerHTML` |
| 15 | تحسين 🟡 | أمن | `escapeHtml` مطبَّقة على مصرف واحد من خمسة | `src/ui/render.js`, `src/ui/stock-details.js` | تعميمها + قاعدة ESLint تمنع `innerHTML` الخام | ساعة | حماية متسقة قبل إضافة أي مصدر خارجي |
| 16 | تحسين 🟡 | أمن | `loadStats` و`completedLessons` بلا تحقق، خلافاً لبقية `state.js` | `src/state.js` | تنقية حقلية على غرار `sanitizeLoadedState` | ساعة | منع `NaN` من الوصول إلى واجهة الإحصاءات |
| 17 | تحسين 🟡 | أمن | `escapeCsvField` لا يعالج بادئات الصيغ (`=`, `+`, `-`, `@`) | `src/ui/csv-export.js` | إضافة فحص البادئة | دقائق | تحصين ملف يُفتح خارج التطبيق |
| 18 | تحسين 🟡 | هندسي | إعادة بناء كاملة للمحفظة والأوامر والشريط في كل نبضة + قفز حركة الشريط | `src/ui/render.js` | تعميم نمط `stockItemRefs` على الشريط | يوم | حركة منسابة وتقليل عمل DOM المتكرر |
| 19 | تحسين 🟡 | هندسي | استيراد `chart.js/auto` يسجّل كل أنواع المخططات والمستخدَم اثنان | `src/ui/chart.js` | استيراد وتسجيل انتقائي | ساعة | تقليص جزء معتبر من 305 kB |
| 20 | تحسين 🟡 | UX | لا متغيّرات CSS، وألوان مضمّنة داخل 4 ملفات JS | `src/styles/main.css` + `src/ui/*` | `:root` بمتغيّرات + أصناف بدل `style.color` | يوم | تمكين تغيير السمة من مكان واحد |
| 21 | تحسين 🟡 | UX | شريط الإحصاءات بلا التفاف فيفيض تحت 400 بكسل | `src/styles/main.css` | `grid` بـ`auto-fit, minmax(140px, 1fr)` | دقائق | قابلية قراءة على الشاشات الضيقة |
| 22 | تحسين 🟡 | هندسي | تكرار: 6 نسخ من حلقة التفريغ، قائمة نوافذ مكرّرة، 3 مؤقتات بـ100 مللي، تظليل `t` | `src/ui/*`, `src/main.js` | تصدير `clearChildren`، توحيد القائمة، حذف المؤقتات، تفعيل `no-shadow` | يوم | تقليل مساحة الصيانة وإغلاق فخ التظليل |
| 23 | تحسين 🟡 | هندسي | `switchTab` و`rebuildStaticLabels` تعتمدان على ترتيب DOM لا على المعرّفات | `src/main.js` | استخدام `getElementById` الموجودة أصلاً | ساعة | مناعة ضد إعادة ترتيب الترميز |
| 24 | تحسين 🟡 | UX | `aria-hidden` يحجب الأخبار المؤثرة على الأسعار عن قارئات الشاشة | `index.html` + `src/ui/render.js` | منطقة `aria-live="polite"` مخفية بصرياً | ساعة | وصول المعلومة الوحيدة غير المكرّرة |
| 25 | تحسين 🟡 | هندسي | تغطية `src/ui/**` و`src/main.js` مستبعَدة — وفيها 2 من 3 أخطاء هذه المراجعة | `vitest.config.js` | تضمين `src/ui/**` بعتبة منخفضة أولاً ثم رفعها | يوم | إغلاق الفجوة التي مرّت منها العيوب |

---

## 7. أسرع المكاسب

خمسة إصلاحات، كلٌّ منها دون 30 دقيقة، بأثر غير متناسب مع كلفته.

### 7.1 حارس السوق المغلق للأوامر المعلّقة — دقيقتان، يغلق العيب رقم 2

```js
// قديم — src/main.js
session.updateInterval = setInterval(() => {
  updatePrices();
  const { cancelled } = checkPendingOrders();
```

```js
// جديد
session.updateInterval = setInterval(() => {
  updatePrices();
  const marketLive = gameState.allow24Trading || isMarketOpen();
  const { cancelled } = marketLive ? checkPendingOrders() : { cancelled: [] };
```

`isMarketOpen` مستوردة أصلاً في الملف.

---

### 7.2 استعادة السرعة الصحيحة بعد إعادة التعيين — دقيقة واحدة

```js
// قديم — src/main.js داخل resetGame
resetGameState();
refreshAll();
closeStockModal();
```

```js
// جديد
resetGameState();
startPriceUpdates();
startNewsUpdates();
refreshAll();
closeStockModal();
```

---

### 7.3 كتلة الحركة المخفَّضة — 3 دقائق، ترفع درجة الإتاحة أكثر من أي تعديل آخر

```css
/* جديد — يُضاف في نهاية src/styles/main.css */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

### 7.4 إصلاح التباين — 5 دقائق، أربعة أسطر

```css
/* قديم — src/styles/main.css */
.market-status.closed { color: #e74c3c; }
.market-status.override { color: #9b59b6; }
.btn-primary { background: #16a085; color: white; }
.btn-danger { background: #e74c3c; color: white; }
```

```css
/* جديد — النسب المحسوبة: 5.56 و5.33 و6.88 و6.62 */
.market-status.closed { color: #f1948a; }
.market-status.override { color: #c39bd3; }
.btn-primary { background: #0e6655; color: white; }
.btn-danger { background: #a93226; color: white; }
```

---

### 7.5 توحيد شكل الأرقام — سطر واحد

```js
// قديم — src/utils/numbers.js
const locale = lang === 'ar' ? 'ar-SA' : 'en-US';
```

```js
// جديد — يبقي فواصل الآلاف العربية ويوحّد الأرقام على الشكل الغربي
const locale = lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US';
```

مع تعديل `tests/numbers.test.js` إن كان يؤكد على الشكل الهندي العربي.

---

## 8. ما لم تتم مراجعته

**غير مُراجَع إطلاقاً:**

| العنصر | السبب |
|---|---|
| `package-lock.json` (114161 بايت) | ملف مُولَّد؛ استُخرجت منه إصدارات 8 حزم برمجياً ولم يُقرأ سطراً سطراً |
| `node_modules/` بعد `npm ci` (177 حزمة) | تبعيات طرف ثالث خارج نطاق مراجعة الكود |
| `dist/` بعد البناء | ناتج مُولَّد؛ استُخدم حجمه ونجاح توليده كدليل فقط |
| ملفات `.git/` الداخلية | خارج النطاق |

**مقروء جزئياً، مع تحديد المقروء:**

| العنصر | المقروء | غير المقروء |
|---|---|---|
| `src/data/stocks.js` (958 سطراً) | الرأس بتوثيق النوع والتحذير الشرعي، أول 4 أسهم، آخر 3، `findStock`؛ وإحصاء برمجي للعدد والقطاعات والتصنيف الشرعي | القيم الرقمية لكل سهم من الأسهم الـ91 (`basePrice`, `mu`, `sigma`) — لم تُدقَّق مقابل بيانات تداول الحقيقية |
| `README.md` (1210 سطراً) | كل العناوين، والمقدمة، وقسم التطوير المحلي، وقسم المكتبات، وبنية المشروع، وقسم الألوان، وقسم التقنيات | نحو 900 سطر من الشرح التعليمي والاستراتيجيات ووصف الميزات |
| `src/data/glossary.js` و`lessons.js` و`scenarios.js` و`tips.js` (653 سطراً مجتمعة) | البنية وتعريفات الأنواع وعينات من المحتوى وأول سيناريو كاملاً | نصوص المحتوى التعليمي كاملة — **لم تُراجَع دقتها المالية أو اللغوية** |
| `tests/` (17 ملفاً) | `setup.js` و`trading.test.js` كاملين؛ وبقية الملفات عبر تشغيل المجموعة وتقرير التغطية | قراءة سطرية لـ15 ملف اختبار — لم أدقّق جودة كل تأكيد على حدة |
| `docs/ENGINEERING_REVIEW.md` (299 سطراً) | العناوين والهيكل فقط | المتن — مراجعة سابقة مستقلة، تجنّبتُ قراءتها لئلا تتلوّن هذه المراجعة بنتائجها |

**غير قابل للتحقق في هذه البيئة، ومُعلَن صراحة:**

1. **لم يُشغَّل التطبيق في متصفح حقيقي.** كل ملاحظات القسم 3 مستنتَجة من قراءة CSS وHTML وJS ومن حسابات رياضية دقيقة (نسب التباين حُسبت بصيغة WCAG على القيم الفعلية)، لا من فحص بصري. **لم أختبر بصرياً:** التخطيط الفعلي عند 360 و768 و1400 بكسل، سلوك التمرير الحقيقي، تموضع تلميح الجولة، أو رسم الشموع اليابانية على قماش حقيقي.
2. **لم يُختبر مع قارئ شاشة فعلي** (NVDA/VoiceOver). ملاحظات الإتاحة مبنية على غياب سمات ARIA يمكن التحقق منه نصياً، لا على استماع فعلي.
3. **اختلاف محرّكات ICU بين البيئات.** تحققتُ من سلوك `ar-SA` على Node 22.22.2. تحديداً: التقويم المُستنتَج لـ`ar-SA` هو `gregory` ونظام الترقيم `arab`. بنيتُ على ذلك ملاحظة الأرقام في 3.4 (ب) — **وأسقطتُ فرضية أولية بوجود خلل في `formatDateBilingual`** بعد أن أثبت الاختبار أن التاريخ الميلادي يُعرض ميلادياً بالفعل والهجري يُضاف بجواره بشكل صحيح. سلوك المتصفحات قد يختلف عن Node في هذه النقطة تحديداً.
4. **الدقة المالية للنموذج لم تُدقَّق** بمقارنة إحصائية. لكن ملاحظة `محتمل` تستحق التسجيل: توثيق `gbmStep` في `src/engine/prices.js` يصف "Geometric Brownian Motion"، والتنفيذ يستخدم توزيعاً **منتظماً** لا غاوسياً (`Math.random() * 2 - 1`) وصيغة حسابية (`currentPrice * (1 + drift + randomShock)`) لا أسّية. الفرق لا يُلاحَظ بصرياً على أفق قصير، لكن الوصف في الكود وفي `README` أدقّ مما يفعله التنفيذ فعلياً.

**نسبة التغطية التقديرية:** نحو **88%** من الكود المكتوب يدوياً (100% من `src/engine` و`src/state.js` و`src/utils` و`src/ui` و`src/config.js` و`index.html` وكل ملفات الإعداد وسير عملَي CI؛ وتغطية جزئية معلَنة لملفات البيانات والاختبارات و`README`).

**درجة الثقة في هذا التقرير: عالية للقسمين 2 و4، ومتوسطة-عالية للقسم 3.** كل عيوب المحرك (2.4 أ، ب، ج) تتبعتُها في الكود المصدري ذهاباً وإياباً وهي `مؤكد`. نسب التباين وسلوك الأرقام حُسبا برمجياً لا تقديراً. الملاحظات المستنتَجة دون تشغيل بصري — تدفّق الشبكة المتجاوب وتموضع الجولة تحديداً — موسومة بحدودها في مواضعها. لم أُدرج أي ملاحظة بلا اقتباس كود حقيقي من المستودع، ولم أذكر أي معرّف CVE لأنني لا أستطيع التحقق منه هنا (ثغرة `brace-expansion` أُبلغت كما أخرجها `npm audit` حرفياً، دون إضافة معرّفات من عندي).
