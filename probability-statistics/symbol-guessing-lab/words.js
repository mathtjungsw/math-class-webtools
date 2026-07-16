(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SymbolGuessingWords = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MEANINGS = [
    ["큰", "작은"], ["긴", "짧은"], ["넓은", "좁은"], ["두꺼운", "얇은"], ["무거운", "가벼운"],
    ["작은", "큰"], ["짧은", "긴"], ["좁은", "넓은"], ["얇은", "두꺼운"], ["여자", "남자"],
    ["남자", "여자"], ["아이", "어른"], ["어머니", "아버지"], ["아버지", "어머니"], ["동물", "식물"],
    ["물고기", "새"], ["새", "물고기"], ["개", "고양이"], ["뱀", "벌레"], ["나무", "풀"],
    ["숲", "사막"], ["막대기", "밧줄"], ["과일", "고기"], ["씨앗", "뿌리"], ["잎", "꽃"],
    ["뿌리", "가지"], ["꽃", "잎"], ["풀", "나무"], ["밧줄", "막대기"], ["피부", "뼈"],
    ["고기", "과일"], ["피", "물"], ["뼈", "피부"], ["달걀", "씨앗"], ["꼬리", "날개"],
    ["머리카락", "깃털"], ["머리", "목"], ["귀", "눈"], ["눈", "코"], ["코", "입"],
    ["입", "귀"], ["이", "혀"], ["혀", "이"], ["발", "손"], ["무릎", "팔꿈치"],
    ["손", "발"], ["날개", "꼬리"], ["목", "허리"], ["가슴", "배"], ["심장", "간"],
  ];

  const LANGUAGE_META = {
    arabic: {
      name: "아랍어",
      nativeName: "العربية",
      note: "아랍 문자 · 오른쪽에서 왼쪽",
      lang: "ar",
      dir: "rtl",
      source: "https://en.wiktionary.org/wiki/Appendix:Arabic_Swadesh_list",
    },
    georgian: {
      name: "조지아어",
      nativeName: "ქართული",
      note: "조지아 문자",
      lang: "ka",
      dir: "ltr",
      source: "https://en.wiktionary.org/wiki/Appendix:Georgian_Swadesh_list",
    },
    armenian: {
      name: "아르메니아어",
      nativeName: "Հայերեն",
      note: "아르메니아 문자",
      lang: "hy",
      dir: "ltr",
      source: "https://en.wiktionary.org/wiki/Appendix:Armenian_Swadesh_list",
    },
    amharic: {
      name: "암하라어",
      nativeName: "አማርኛ",
      note: "그으즈계 문자",
      lang: "am",
      dir: "ltr",
      source: "https://en.wiktionary.org/wiki/Appendix:Amharic_Swadesh_list",
    },
    egyptian: {
      name: "고대 이집트어",
      nativeName: "𓂋𓏏𓈖𓆎𓅓𓏏",
      note: "상형문자 음가 배열 · 자음 음역 병기",
      lang: "egy",
      dir: "ltr",
      source: "https://en.wiktionary.org/wiki/Appendix:Egyptian_Swadesh_list",
      ancient: true,
    },
    sanskrit: {
      name: "산스크리트어",
      nativeName: "संस्कृतम्",
      note: "고전어 · 데바나가리 문자",
      lang: "sa",
      dir: "ltr",
      source: "https://en.wiktionary.org/wiki/Appendix:Sanskrit_Swadesh_list",
      ancient: true,
    },
    sumerian: {
      name: "수메르어",
      nativeName: "𒅴𒂠",
      note: "고대 메소포타미아 · 설형문자와 음역",
      lang: "sux",
      dir: "ltr",
      source: "https://en.wiktionary.org/wiki/Appendix:Sumerian_Swadesh_list",
      ancient: true,
    },
    mixed: {
      name: "현대 문자 혼합",
      nativeName: "4 scripts",
      note: "현대 네 언어가 번갈아 등장",
      lang: "und",
      dir: "ltr",
      source: "",
    },
    ancient_mixed: {
      name: "고대 문자 혼합",
      nativeName: "𓁹 · संस्कृतम् · 𒅆",
      note: "고대 이집트어·산스크리트어·수메르어",
      lang: "und",
      dir: "ltr",
      source: "",
      ancient: true,
    },
    all_mixed: {
      name: "전체 언어 혼합",
      nativeName: "7 languages",
      note: "현대 언어와 고대어가 모두 등장",
      lang: "und",
      dir: "ltr",
      source: "",
    },
  };

  const WORD_SETS = {
    arabic: [
      "كَبِير", "طَوِيل", "رَحْب", "سَمِيك", "ثَقِيل", "صَغِير", "قَصِير", "ضَيِّق", "رَقِيق", "اِمْرَأَة",
      "رَجُل", "طِفْل", "أُمّ", "أَب", "حَيَوَان", "سَمَك", "طَائِر", "كَلْب", "ثُعْبَان", "شَجَرَة",
      "غَابَة", "عَصًا", "فَاكِهَة", "زَرْع", "وَرَقَة", "جِذْر", "زَهْرَة", "حَشِيش", "حَبْل", "جِلْد",
      "لَحْم", "دَم", "عَظْم", "بَيْضَة", "ذَنَب", "شَعْر", "رَأْس", "أُذُن", "عَيْن", "أَنْف",
      "فَم", "سِنّ", "لِسَان", "قَدَم", "رُكْبَة", "يَد", "جَنَاح", "رَقَبَة", "صَدْر", "قَلْب",
    ],
    georgian: [
      "დიდი", "გრძელი", "ფართო", "სქელი", "მძიმე", "პატარა", "მოკლე", "ვიწრო", "თხელი", "ქალი",
      "კაცი", "ბავშვი", "დედა", "მამა", "ცხოველი", "თევზი", "ჩიტი", "ძაღლი", "გველი", "ხე",
      "ტყე", "ჯოხი", "ხილი", "თესლი", "ფოთოლი", "ფესვი", "ყვავილი", "ბალახი", "თოკი", "კანი",
      "ხორცი", "სისხლი", "ძვალი", "კვერცხი", "კუდი", "თმა", "თავი", "ყური", "თვალი", "ცხვირი",
      "პირი", "კბილი", "ენა", "ტერფი", "მუხლი", "ხელი", "ფრთა", "კისერი", "მკერდი", "გული",
    ],
    armenian: [
      "մեծ", "երկար", "լայն", "հաստ", "ծանր", "փոքր", "կարճ", "նեղ", "բարակ", "կին",
      "տղամարդ", "երեխա", "մայր", "հայր", "կենդանի", "ձուկ", "թռչուն", "շուն", "օձ", "ծառ",
      "անտառ", "փայտ", "պտուղ", "սերմ", "տերև", "արմատ", "ծաղիկ", "խոտ", "պարան", "մաշկ",
      "միս", "արյուն", "ոսկոր", "ձու", "պոչ", "մազ", "գլուխ", "ականջ", "աչք", "քիթ",
      "բերան", "ատամ", "լեզու", "ոտք", "ծունկ", "ձեռք", "թև", "վիզ", "կուրծք", "սիրտ",
    ],
    amharic: [
      "ትልቅ", "ረዝም", "ሰፊ", "ደንዳና", "ከባድ", "ትንሽ", "አጭር", "ጠባብ", "ቀጭን", "ሴትዮ",
      "ጎልማሳ", "ህጻን", "እናት", "አባት", "እንስሳ", "አሳ", "ወፍ", "ዉሻ", "እባብ", "ዛፍ",
      "ደን", "ልምጭ", "ፍራፍሬ", "ዘር", "ቅጠል", "ስር", "አበባ", "ሳር", "ገመድ", "ቆዳ",
      "ስጋ", "ደም", "አጥንት", "እንቁላል", "ጅራት", "ጸጉር", "ጭንቅላት", "ጆሮ", "ዓይን", "አፍንጫ",
      "አፍ", "ጥርስ", "ምላስ", "የእግር መዳፍ", "ጉልበት", "እጅ", "ክንፍ", "አንገት", "ጡት", "ልብ",
    ],
    egyptian: [],
    sanskrit: [
      "महत्", "दीर्घ", "उरु", "घन", "गुरु", "अल्प", "ह्रस्व", "अंहु", "तनु", "स्त्री",
      "पुरुष", "बाल", "मातृ", "पितृ", "पशु", "मत्स्य", "पक्षिन्", "श्वन्", "सर्प", "वृक्ष",
      "वन", "दण्ड", "फल", "बीज", "पत्त्र", "मूल", "पुष्प", "तृण", "रज्जु", "चर्मन्",
      "मांस", "रक्त", "अस्थि", "अण्ड", "पुच्छ", "केश", "शिरस्", "कर्ण", "अक्षि", "नासा",
      "मुख", "दन्त", "जिह्वा", "पद", "जानु", "हस्त", "पक्ष", "ग्रीवा", "स्तन", "हृदय",
    ],
    sumerian: [
      "𒃲", "𒋤", "𒂼", "𒄫", "𒂂", "𒌉", "𒆸", "𒋝", "𒊩", "𒊩",
      "𒇽", "𒌉", "𒂼", "𒀜", "𒀲", "𒄩", "𒄷", "𒌨", "𒈲", "𒄑",
      "𒌁", "𒄑", "𒄧", "𒀀", "𒄑𒉺", "𒄑𒅕𒈾", "𒌋", "𒌑", "𒂠", "𒋢",
      "𒍜", "𒈜", "𒄑𒆕", "𒉭", "𒆲", "𒋠", "𒊕", "𒄑𒌆", "𒅆", "𒄈",
      "𒅗", "𒍪", "𒅴", "𒄊", "𒄑𒆕", "𒋗", "𒄑𒉺", "𒄘", "𒃮", "𒊮",
    ],
  };

  const EGYPTIAN_READINGS = [
    "ꜥꜣ", "ꜣw", "wsḫ", "wmt", "dns", "nḏs", "ḥwꜥ", "gꜣw", "pꜣq", "ḥmt",
    "z", "ẖrd", "mwt", "jt", "ꜥwt", "rm", "ꜣpd", "ṯzm", "ḥfꜣw", "nht",
    "hj", "ḫt", "dqr", "prt", "gꜣbt", "wꜣb", "ḥrrt", "ꜥnb", "nwḥ", "jnm",
    "jwf", "znf", "qs", "swḥt", "ḫbzt", "šnj", "tp", "msḏr", "jrt", "fnḏ",
    "rꜣ", "jbḥ", "ns", "rd", "pꜣḏ", "ḏrt", "ḏnḥ", "ḫḫ", "mnḏ", "jb",
  ];

  const SUMERIAN_READINGS = [
    "gal", "sud", "dangal", "kul", "dugud", "tur", "gud", "sig", "sal", "munus",
    "lú", "dumu", "ama", "ada", "anše", "ku₆", "mušen", "ur", "muš", "ĝeš",
    "tir", "ĝeš", "gurun", "a", "ĝeš-pa", "ĝeš i-ri-na", "ul", "u", "eše", "su",
    "uzu", "mud", "ĝeš-gag", "nuz", "kun", "siki", "saĝ", "ĝeš-tug", "igi", "kiri",
    "ka", "zu", "eme", "ĝiri", "ĝeš-gag", "šu", "ĝeš-pa", "gu", "gaba", "ša",
  ];

  const EGYPTIAN_UNILITERALS = {
    "ꜣ": "𓄿", j: "𓇋", "ꜥ": "𓂝", w: "𓅱", b: "𓃀", p: "𓊪", f: "𓆑",
    m: "𓅓", n: "𓈖", r: "𓂋", h: "𓉔", "ḥ": "𓎛", "ḫ": "𓐍", "ẖ": "𓄡",
    z: "𓊃", s: "𓋴", "š": "𓈙", q: "𓈎", k: "𓎡", g: "𓎼", t: "𓏏",
    "ṯ": "𓍿", d: "𓂧", "ḏ": "𓆓",
  };

  function egyptianPhonograms(reading) {
    return [...reading].map((character) => EGYPTIAN_UNILITERALS[character] || "").join("") || "𓏞";
  }

  WORD_SETS.egyptian = EGYPTIAN_READINGS.map(egyptianPhonograms);

  const MODERN_LANGUAGE_IDS = ["arabic", "georgian", "armenian", "amharic"];
  const ANCIENT_LANGUAGE_IDS = ["egyptian", "sanskrit", "sumerian"];
  const LANGUAGE_IDS = [...MODERN_LANGUAGE_IDS, ...ANCIENT_LANGUAGE_IDS];
  const READING_SETS = {
    egyptian: EGYPTIAN_READINGS,
    sumerian: SUMERIAN_READINGS,
  };
  const MEANING_OVERRIDES = {
    egyptian: {
      20: ["남편", "아내"],
    },
  };

  function shuffled(values, random) {
    const result = [...values];
    const rng = typeof random === "function" ? random : Math.random;
    for (let index = result.length - 1; index > 0; index -= 1) {
      const target = Math.floor(rng() * (index + 1));
      [result[index], result[target]] = [result[target], result[index]];
    }
    return result;
  }

  function buildQuestionSet(options) {
    const language = LANGUAGE_META[options.language] ? options.language : "arabic";
    const n = Math.max(1, Math.min(MEANINGS.length, Math.round(Number(options.n) || 20)));
    const rng = typeof options.random === "function" ? options.random : Math.random;
    const answerKey = Array.isArray(options.answerKey) ? options.answerKey : [];
    const meaningOrder = shuffled(Array.from({ length: MEANINGS.length }, (_, index) => index), rng).slice(0, n);
    const mixedLanguages = language === "mixed"
      ? MODERN_LANGUAGE_IDS
      : language === "ancient_mixed"
        ? ANCIENT_LANGUAGE_IDS
        : LANGUAGE_IDS;
    const languageOrder = shuffled(mixedLanguages, rng);

    return meaningOrder.map((meaningIndex, questionIndex) => {
      const languageId = ["mixed", "ancient_mixed", "all_mixed"].includes(language)
        ? languageOrder[questionIndex % languageOrder.length]
        : language;
      const meta = LANGUAGE_META[languageId];
      const [meaning, distractor] = MEANING_OVERRIDES[languageId]?.[meaningIndex] || MEANINGS[meaningIndex];
      const correctSide = answerKey[questionIndex] === 1 ? 1 : 0;
      return {
        languageId,
        languageName: meta.name,
        lang: meta.lang,
        dir: meta.dir,
        word: WORD_SETS[languageId][meaningIndex],
        reading: READING_SETS[languageId]?.[meaningIndex] || "",
        meaning,
        distractor,
        correctSide,
        options: correctSide === 0 ? [meaning, distractor] : [distractor, meaning],
      };
    });
  }

  return {
    LANGUAGE_IDS,
    MODERN_LANGUAGE_IDS,
    ANCIENT_LANGUAGE_IDS,
    LANGUAGE_META,
    MEANINGS,
    WORD_SETS,
    buildQuestionSet,
  };
});
