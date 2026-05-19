/**
 * Predefined historical-like scenarios. Each scenario, when activated,
 * applies a multiplier to mu (drift) and/or sigma (volatility) for one or
 * more sectors/symbols, plus optional one-time price shocks.
 *
 * effects:
 *   - { sector: 'banking', muMultiplier: 2, sigmaMultiplier: 1.5 }
 *   - { symbol: '2222', shock: -0.15 }  // one-time -15% jolt on start
 */
export const historicalScenarios = [
  {
    id: 'crash_2006',
    title: { ar: 'انهيار 2006', en: '2006 crash' },
    description: {
      ar: 'محاكاة لانهيار سوق الأسهم السعودي عام 2006. تقلبات عالية وانخفاضات حادة في معظم القطاعات.',
      en: 'Simulates the 2006 Saudi market crash. High volatility and sharp drops across most sectors.',
    },
    durationMinutes: 10,
    effects: [
      { sector: 'banking', muMultiplier: -3, sigmaMultiplier: 2.5 },
      { sector: 'petrochemical', muMultiplier: -2, sigmaMultiplier: 2 },
      { sector: 'realestate', muMultiplier: -4, sigmaMultiplier: 3 },
      { sector: 'cement', muMultiplier: -2, sigmaMultiplier: 2 },
    ],
    initialShocks: [
      { sector: 'banking', shock: -0.08 },
      { sector: 'realestate', shock: -0.12 },
    ],
  },
  {
    id: 'aramco_ipo',
    title: { ar: 'طرح أرامكو 2019', en: 'Aramco IPO 2019' },
    description: {
      ar: 'محاكاة لتأثير طرح أرامكو على السوق. ارتفاع في قطاع الطاقة وحركة قوية في الأسهم القيادية.',
      en: 'Simulates the Aramco IPO impact. Energy sector rally and strong moves in blue chips.',
    },
    durationMinutes: 10,
    effects: [
      { sector: 'energy', muMultiplier: 4, sigmaMultiplier: 1.8 },
      { sector: 'banking', muMultiplier: 2, sigmaMultiplier: 1.3 },
      { sector: 'petrochemical', muMultiplier: 1.5, sigmaMultiplier: 1.4 },
    ],
    initialShocks: [
      { symbol: '2222', shock: 0.1 },
    ],
  },
  {
    id: 'oil_shock',
    title: { ar: 'صدمة نفطية', en: 'Oil shock' },
    description: {
      ar: 'انخفاض حاد ومفاجئ في أسعار النفط يؤثر على البتروكيماويات والطاقة، مع تأثير محدود على القطاعات الأخرى.',
      en: 'A sharp, sudden drop in oil prices hits petrochemicals and energy, with limited impact on other sectors.',
    },
    durationMinutes: 8,
    effects: [
      { sector: 'energy', muMultiplier: -3, sigmaMultiplier: 2.5 },
      { sector: 'petrochemical', muMultiplier: -2.5, sigmaMultiplier: 2.2 },
    ],
    initialShocks: [
      { sector: 'energy', shock: -0.1 },
      { sector: 'petrochemical', shock: -0.06 },
    ],
  },
  {
    id: 'rate_hike',
    title: { ar: 'رفع أسعار الفائدة', en: 'Rate hike' },
    description: {
      ar: 'محاكاة لقرار ساما برفع الفائدة. ضغط على البنوك (هوامش أعلى لكن طلب أقل) والعقار يتأثر سلباً.',
      en: 'Simulates a SAMA rate hike. Banks face pressure (higher margins, lower demand); real estate suffers.',
    },
    durationMinutes: 8,
    effects: [
      { sector: 'banking', muMultiplier: 1.5, sigmaMultiplier: 1.3 },
      { sector: 'realestate', muMultiplier: -2, sigmaMultiplier: 1.8 },
      { sector: 'building', muMultiplier: -1.5, sigmaMultiplier: 1.5 },
    ],
    initialShocks: [
      { sector: 'realestate', shock: -0.04 },
    ],
  },
];

export function findScenario(id) {
  return historicalScenarios.find((s) => s.id === id);
}
