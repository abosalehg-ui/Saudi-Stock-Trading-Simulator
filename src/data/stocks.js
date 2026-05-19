/**
 * Saudi (Tadawul) stocks with simulation parameters.
 *
 * isShariaCompliant: تقدير مبدئي بناءً على القطاع — البنوك التقليدية والتأمين التقليدي
 * (Allianz, MedGulf...) وُضعت كـ false، والبنوك الإسلامية والشركات الأخرى وُضعت كـ true.
 * TODO: قبل أي استخدام إنتاجي، يجب مراجعة كل سهم وفقاً للمعايير الشرعية الرسمية
 * (مثل قائمة المؤشر الشرعي للسوق المالية السعودية أو AAOIFI).
 */
export const stocks = [
  { symbol: '1180', name: 'الراجحي', nameEn: 'Al Rajhi', sector: 'banking', basePrice: 85.5, mu: 0.0002, sigma: 0.015, isShariaCompliant: true },
  { symbol: '1120', name: 'الأهلي', nameEn: 'Al Ahli', sector: 'banking', basePrice: 32.4, mu: 0.0001, sigma: 0.012, isShariaCompliant: false },
  { symbol: '1010', name: 'الرياض', nameEn: 'Riyad', sector: 'banking', basePrice: 28.3, mu: 0.0001, sigma: 0.013, isShariaCompliant: false },
  { symbol: '1050', name: 'الجزيرة', nameEn: 'Al Jazira', sector: 'banking', basePrice: 16.8, mu: 0.0001, sigma: 0.014, isShariaCompliant: true },
  { symbol: '1080', name: 'العربي', nameEn: 'Al Arabi', sector: 'banking', basePrice: 34.2, mu: 0.0001, sigma: 0.012, isShariaCompliant: false },
  { symbol: '1060', name: 'الإنماء', nameEn: 'Al Inma', sector: 'banking', basePrice: 22.5, mu: 0.0002, sigma: 0.013, isShariaCompliant: true },
  { symbol: '1140', name: 'البلاد', nameEn: 'Al Bilad', sector: 'banking', basePrice: 25.7, mu: 0.0001, sigma: 0.015, isShariaCompliant: true },
  { symbol: '1150', name: 'ساب', nameEn: 'SABB', sector: 'banking', basePrice: 31.9, mu: 0.0001, sigma: 0.011, isShariaCompliant: false },
  { symbol: '1030', name: 'الاستثمار', nameEn: 'Al Istithmar', sector: 'banking', basePrice: 18.4, mu: 0.0001, sigma: 0.013, isShariaCompliant: false },
  { symbol: '1020', name: 'سامبا', nameEn: 'Samba', sector: 'banking', basePrice: 29.6, mu: 0.0001, sigma: 0.012, isShariaCompliant: false },

  { symbol: '2010', name: 'سابك', nameEn: 'Sabic', sector: 'petrochemical', basePrice: 98.2, mu: 0.0003, sigma: 0.018, isShariaCompliant: true },
  { symbol: '2020', name: 'سابك للمغذيات', nameEn: 'Sabic Nutrients', sector: 'petrochemical', basePrice: 124.5, mu: 0.0002, sigma: 0.02, isShariaCompliant: true },
  { symbol: '2170', name: 'اللجين', nameEn: 'Al Lujain', sector: 'petrochemical', basePrice: 42.8, mu: 0.0002, sigma: 0.019, isShariaCompliant: true },
  { symbol: '2220', name: 'معادن', nameEn: 'Maaden', sector: 'petrochemical', basePrice: 47.3, mu: 0.0003, sigma: 0.021, isShariaCompliant: true },
  { symbol: '2090', name: 'الجبيل', nameEn: 'Al Jubail', sector: 'petrochemical', basePrice: 24.6, mu: 0.0001, sigma: 0.017, isShariaCompliant: true },
  { symbol: '2030', name: 'سافكو', nameEn: 'Safco', sector: 'petrochemical', basePrice: 112.8, mu: 0.0002, sigma: 0.018, isShariaCompliant: true },
  { symbol: '2350', name: 'كيمانول', nameEn: 'Chemanol', sector: 'petrochemical', basePrice: 15.4, mu: 0.0001, sigma: 0.016, isShariaCompliant: true },
  { symbol: '2060', name: 'التصنيع', nameEn: 'Tasnee', sector: 'petrochemical', basePrice: 34.2, mu: 0.0002, sigma: 0.017, isShariaCompliant: true },
  { symbol: '2290', name: 'ينساب', nameEn: 'Yansab', sector: 'petrochemical', basePrice: 58.7, mu: 0.0002, sigma: 0.019, isShariaCompliant: true },
  { symbol: '2380', name: 'بتروكيم', nameEn: 'Petrochem', sector: 'petrochemical', basePrice: 22.1, mu: 0.0001, sigma: 0.016, isShariaCompliant: true },

  { symbol: '7010', name: 'اتصالات', nameEn: 'STC', sector: 'telecom', basePrice: 44.8, mu: 0.0002, sigma: 0.014, isShariaCompliant: true },
  { symbol: '7020', name: 'موبايلي', nameEn: 'Mobily', sector: 'telecom', basePrice: 29.4, mu: 0.0001, sigma: 0.016, isShariaCompliant: true },
  { symbol: '7030', name: 'زين', nameEn: 'Zain', sector: 'telecom', basePrice: 16.2, mu: 0.0001, sigma: 0.015, isShariaCompliant: true },
  { symbol: '7040', name: 'عذيب', nameEn: 'Atheeb', sector: 'telecom', basePrice: 87.3, mu: 0.0002, sigma: 0.013, isShariaCompliant: true },

  { symbol: '4001', name: 'أسواق المزرعة', nameEn: 'Aswaq Al Mazraa', sector: 'retail', basePrice: 32.7, mu: 0.0002, sigma: 0.016, isShariaCompliant: true },
  { symbol: '4008', name: 'ساكو', nameEn: 'SACO', sector: 'retail', basePrice: 56.9, mu: 0.0003, sigma: 0.018, isShariaCompliant: true },
  { symbol: '4050', name: 'ساسكو', nameEn: 'SASCO', sector: 'retail', basePrice: 48.3, mu: 0.0002, sigma: 0.017, isShariaCompliant: true },
  { symbol: '4190', name: 'جرير', nameEn: 'Jarir', sector: 'retail', basePrice: 142.6, mu: 0.0003, sigma: 0.015, isShariaCompliant: true },
  { symbol: '4191', name: 'أبو معطي', nameEn: 'Abu Muti', sector: 'retail', basePrice: 34.8, mu: 0.0001, sigma: 0.016, isShariaCompliant: true },
  { symbol: '4240', name: 'النهدي', nameEn: 'Al Nahdi', sector: 'retail', basePrice: 87.5, mu: 0.0004, sigma: 0.019, isShariaCompliant: true },
  { symbol: '4280', name: 'المواساة', nameEn: 'Al Mouwasat', sector: 'retail', basePrice: 156.2, mu: 0.0003, sigma: 0.017, isShariaCompliant: true },
  { symbol: '4031', name: 'الدوائية', nameEn: 'Al Dawaeya', sector: 'retail', basePrice: 64.3, mu: 0.0002, sigma: 0.015, isShariaCompliant: true },

  { symbol: '8010', name: 'التعاونية', nameEn: 'Tawuniya', sector: 'insurance', basePrice: 42.1, mu: 0.0001, sigma: 0.016, isShariaCompliant: true },
  { symbol: '8012', name: 'جزيرة تكافل', nameEn: 'Jazira Takaful', sector: 'insurance', basePrice: 28.4, mu: 0.0001, sigma: 0.015, isShariaCompliant: true },
  { symbol: '8020', name: 'ملاذ للتأمين', nameEn: 'Malath', sector: 'insurance', basePrice: 18.7, mu: 0.0001, sigma: 0.017, isShariaCompliant: false },
  { symbol: '8030', name: 'ميدغلف', nameEn: 'MedGulf', sector: 'insurance', basePrice: 34.9, mu: 0.0001, sigma: 0.014, isShariaCompliant: false },
  { symbol: '8040', name: 'أليانز', nameEn: 'Allianz', sector: 'insurance', basePrice: 52.3, mu: 0.0002, sigma: 0.015, isShariaCompliant: false },
  { symbol: '8050', name: 'سلامة', nameEn: 'Salama', sector: 'insurance', basePrice: 26.8, mu: 0.0001, sigma: 0.016, isShariaCompliant: true },
  { symbol: '8060', name: 'ولاء', nameEn: 'Walaa', sector: 'insurance', basePrice: 45.2, mu: 0.0002, sigma: 0.014, isShariaCompliant: true },
  { symbol: '8070', name: 'الدرع العربي', nameEn: 'Al Der3 Al Arabi', sector: 'insurance', basePrice: 38.6, mu: 0.0001, sigma: 0.015, isShariaCompliant: true },

  { symbol: '3010', name: 'أسمنت السعودية', nameEn: 'Saudi Cement', sector: 'cement', basePrice: 54.8, mu: 0.0001, sigma: 0.014, isShariaCompliant: true },
  { symbol: '3020', name: 'أسمنت اليمامة', nameEn: 'Yamama Cement', sector: 'cement', basePrice: 47.2, mu: 0.0001, sigma: 0.013, isShariaCompliant: true },
  { symbol: '3030', name: 'أسمنت الشرقية', nameEn: 'Sharqiya Cement', sector: 'cement', basePrice: 62.5, mu: 0.0001, sigma: 0.015, isShariaCompliant: true },
  { symbol: '3040', name: 'أسمنت القصيم', nameEn: 'Qassim Cement', sector: 'cement', basePrice: 58.3, mu: 0.0001, sigma: 0.014, isShariaCompliant: true },
  { symbol: '3050', name: 'أسمنت ينبع', nameEn: 'Yanbu Cement', sector: 'cement', basePrice: 43.7, mu: 0.0001, sigma: 0.013, isShariaCompliant: true },
  { symbol: '3060', name: 'أسمنت الجنوب', nameEn: 'Janoub Cement', sector: 'cement', basePrice: 51.4, mu: 0.0001, sigma: 0.014, isShariaCompliant: true },
  { symbol: '3090', name: 'أسمنت تبوك', nameEn: 'Tabuk Cement', sector: 'cement', basePrice: 18.9, mu: 0.0001, sigma: 0.016, isShariaCompliant: true },
  { symbol: '3091', name: 'أسمنت الجوف', nameEn: 'Jouf Cement', sector: 'cement', basePrice: 14.2, mu: 0.0001, sigma: 0.015, isShariaCompliant: true },

  { symbol: '2222', name: 'أرامكو', nameEn: 'Aramco', sector: 'energy', basePrice: 28.45, mu: 0.0002, sigma: 0.012, isShariaCompliant: true },
  { symbol: '4030', name: 'الكهرباء', nameEn: 'Electricity', sector: 'energy', basePrice: 23.8, mu: 0.0001, sigma: 0.011, isShariaCompliant: true },
  { symbol: '2082', name: 'أكوا باور', nameEn: 'Aqua Power', sector: 'energy', basePrice: 156.2, mu: 0.0003, sigma: 0.019, isShariaCompliant: true },
  { symbol: '5110', name: 'الكابلات', nameEn: 'Cables', sector: 'energy', basePrice: 34.6, mu: 0.0001, sigma: 0.014, isShariaCompliant: true },

  { symbol: '4300', name: 'دار الأركان', nameEn: 'Dar Al Arkan', sector: 'realestate', basePrice: 12.4, mu: 0.0002, sigma: 0.018, isShariaCompliant: true },
  { symbol: '4320', name: 'الأندلس', nameEn: 'Al Andalus', sector: 'realestate', basePrice: 28.7, mu: 0.0001, sigma: 0.016, isShariaCompliant: true },
  { symbol: '4100', name: 'مكة', nameEn: 'Makkah', sector: 'realestate', basePrice: 47.3, mu: 0.0002, sigma: 0.017, isShariaCompliant: true },
  { symbol: '4150', name: 'التعمير', nameEn: 'Taameer', sector: 'realestate', basePrice: 18.9, mu: 0.0001, sigma: 0.015, isShariaCompliant: true },
  { symbol: '4220', name: 'إعمار', nameEn: 'Emaar', sector: 'realestate', basePrice: 13.6, mu: 0.0001, sigma: 0.019, isShariaCompliant: true },
  { symbol: '4090', name: 'طيبة', nameEn: 'Taybah', sector: 'realestate', basePrice: 31.2, mu: 0.0001, sigma: 0.016, isShariaCompliant: true },
  { symbol: '4250', name: 'جبل عمر', nameEn: 'Jabal Omar', sector: 'realestate', basePrice: 24.8, mu: 0.0002, sigma: 0.017, isShariaCompliant: true },

  { symbol: '4110', name: 'بدجت السعودية', nameEn: 'Budget', sector: 'transport', basePrice: 67.4, mu: 0.0002, sigma: 0.015, isShariaCompliant: true },
  { symbol: '4260', name: 'بوبا العربية', nameEn: 'Bupa Arabia', sector: 'transport', basePrice: 134.8, mu: 0.0003, sigma: 0.016, isShariaCompliant: true },
  { symbol: '2190', name: 'سيسكو', nameEn: 'SISCO', sector: 'transport', basePrice: 42.3, mu: 0.0001, sigma: 0.014, isShariaCompliant: true },
  { symbol: '4261', name: 'ذيب', nameEn: 'Dheeb', sector: 'transport', basePrice: 58.9, mu: 0.0002, sigma: 0.017, isShariaCompliant: true },

  { symbol: '4210', name: 'أبحر', nameEn: 'Abhur', sector: 'media', basePrice: 26.4, mu: 0.0001, sigma: 0.015, isShariaCompliant: true },
  { symbol: '4070', name: 'الأبحاث', nameEn: 'Al Abhath', sector: 'media', basePrice: 189.2, mu: 0.0002, sigma: 0.014, isShariaCompliant: true },
  { symbol: '4200', name: 'الدريس', nameEn: 'Al Drees', sector: 'media', basePrice: 92.7, mu: 0.0003, sigma: 0.016, isShariaCompliant: true },

  { symbol: '4170', name: 'شمس', nameEn: 'Shams', sector: 'hotels', basePrice: 74.3, mu: 0.0002, sigma: 0.017, isShariaCompliant: true },
  { symbol: '4164', name: 'الشرقية', nameEn: 'Sharqiya', sector: 'hotels', basePrice: 38.5, mu: 0.0001, sigma: 0.016, isShariaCompliant: true },
  { symbol: '4143', name: 'الحكير', nameEn: 'Al Hokair', sector: 'hotels', basePrice: 54.8, mu: 0.0002, sigma: 0.018, isShariaCompliant: true },

  { symbol: '2280', name: 'المراعي', nameEn: 'Almarai', sector: 'agriculture', basePrice: 58.4, mu: 0.0003, sigma: 0.015, isShariaCompliant: true },
  { symbol: '6010', name: 'نادك', nameEn: 'Nadec', sector: 'agriculture', basePrice: 32.8, mu: 0.0001, sigma: 0.016, isShariaCompliant: true },
  { symbol: '6020', name: 'جاكو', nameEn: 'Jaco', sector: 'agriculture', basePrice: 48.2, mu: 0.0002, sigma: 0.017, isShariaCompliant: true },
  { symbol: '6040', name: 'تبوك الزراعية', nameEn: 'Tabuk', sector: 'agriculture', basePrice: 24.6, mu: 0.0001, sigma: 0.015, isShariaCompliant: true },
  { symbol: '6050', name: 'الأسماك', nameEn: 'Al Asmak', sector: 'agriculture', basePrice: 67.3, mu: 0.0002, sigma: 0.018, isShariaCompliant: true },
  { symbol: '2270', name: 'سدافكو', nameEn: 'Sadafco', sector: 'agriculture', basePrice: 45.7, mu: 0.0002, sigma: 0.016, isShariaCompliant: true },
  { symbol: '6060', name: 'الشرقية للتنمية', nameEn: 'Sharqiya Dev', sector: 'agriculture', basePrice: 19.8, mu: 0.0001, sigma: 0.014, isShariaCompliant: true },

  { symbol: '2040', name: 'الخزف', nameEn: 'Al Khazaf', sector: 'industrial', basePrice: 28.4, mu: 0.0001, sigma: 0.015, isShariaCompliant: true },
  { symbol: '2050', name: 'مجموعة صافولا', nameEn: 'Savola', sector: 'industrial', basePrice: 34.2, mu: 0.0002, sigma: 0.014, isShariaCompliant: true },
  { symbol: '2080', name: 'غازكو', nameEn: 'Gasco', sector: 'industrial', basePrice: 18.7, mu: 0.0001, sigma: 0.013, isShariaCompliant: true },
  { symbol: '2150', name: 'زجاج', nameEn: 'Zujaj', sector: 'industrial', basePrice: 43.6, mu: 0.0001, sigma: 0.016, isShariaCompliant: true },
  { symbol: '2160', name: 'أميانتيت', nameEn: 'Amiantit', sector: 'industrial', basePrice: 56.9, mu: 0.0002, sigma: 0.015, isShariaCompliant: true },
  { symbol: '2180', name: 'فيبكو', nameEn: 'Fibco', sector: 'industrial', basePrice: 24.3, mu: 0.0001, sigma: 0.014, isShariaCompliant: true },
  { symbol: '2310', name: 'سبكيم', nameEn: 'Sipchem', sector: 'industrial', basePrice: 87.4, mu: 0.0003, sigma: 0.018, isShariaCompliant: true },
  { symbol: '2320', name: 'البحري', nameEn: 'Bahri', sector: 'industrial', basePrice: 21.6, mu: 0.0001, sigma: 0.016, isShariaCompliant: true },
  { symbol: '2330', name: 'المتطورة', nameEn: 'Al Mutatawera', sector: 'industrial', basePrice: 94.2, mu: 0.0003, sigma: 0.019, isShariaCompliant: true },
  { symbol: '1211', name: 'معادن', nameEn: 'Maaden', sector: 'industrial', basePrice: 42.8, mu: 0.0002, sigma: 0.017, isShariaCompliant: true },

  { symbol: '3008', name: 'الكثيري', nameEn: 'Al Kathiri', sector: 'building', basePrice: 38.9, mu: 0.0001, sigma: 0.015, isShariaCompliant: true },
  { symbol: '4130', name: 'الباحة', nameEn: 'Al Bahah', sector: 'building', basePrice: 27.4, mu: 0.0001, sigma: 0.014, isShariaCompliant: true },
  { symbol: '4160', name: 'ثمار', nameEn: 'Thimar', sector: 'building', basePrice: 16.8, mu: 0.0001, sigma: 0.016, isShariaCompliant: true },
  { symbol: '4330', name: 'ريدان', nameEn: 'Redan', sector: 'building', basePrice: 12.3, mu: 0.0002, sigma: 0.019, isShariaCompliant: true },
  { symbol: '4342', name: 'أنابيب', nameEn: 'Anabib', sector: 'building', basePrice: 34.7, mu: 0.0001, sigma: 0.014, isShariaCompliant: true },
];

export function findStock(symbol) {
  return stocks.find((s) => s.symbol === symbol);
}
