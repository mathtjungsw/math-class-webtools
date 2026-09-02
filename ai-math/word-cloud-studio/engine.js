(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.WordCloudEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DEFAULT_STOPWORDS = Object.freeze([
    "가", "각", "간", "갖고", "같다", "같은", "같이", "거", "것", "게", "곳", "과", "그", "그것", "그러나", "그리고", "그런", "그런데", "그럼", "그렇게", "그렇다", "기타", "까지", "나", "나는", "나의", "내", "너", "너는", "너의", "네", "누구", "는", "다", "다른", "다시", "단", "대해", "대한", "더", "도", "등", "따라", "때", "때문", "또", "또는", "로", "를", "마저", "만", "많은", "매우", "및", "바", "보다", "부터", "뿐", "사이", "수", "스스로", "아", "아니", "아니다", "안", "앞", "어느", "어떤", "어떻게", "여러", "에", "에서", "에게", "여기", "와", "왜", "우리", "우리는", "우리의", "위", "위해", "으로", "은", "을", "의", "이", "이것", "이런", "이렇게", "이다", "이라는", "이며", "있는", "있다", "자", "저", "저것", "저는", "전", "제", "조차", "좀", "즉", "지", "처럼", "하고", "하는", "하지만", "한", "한다", "할", "함께", "해", "했다", "혹은"
  ]);

  function normalizeWord(value) {
    return String(value || "").normalize("NFKC").toLocaleLowerCase("ko-KR").trim();
  }

  function tokenize(text) {
    return (String(text || "").normalize("NFKC").match(/[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*/gu) || [])
      .map(normalizeWord)
      .filter(Boolean);
  }

  function parseStopwords(value) {
    const source = Array.isArray(value) ? value.join(" ") : String(value || "");
    return new Set(tokenize(source));
  }

  function isOnlyNumber(token) {
    return /^\p{N}+$/u.test(token);
  }

  function stripKoreanParticle(token) {
    if (!/^[가-힣]+$/.test(token)) return token;
    const particles = ["으로부터", "에게서", "한테서", "으로써", "으로서", "에서는", "에게는", "까지도", "부터도", "이라도", "라도", "께서는", "께서", "에서", "에게", "한테", "으로", "처럼", "보다", "부터", "까지", "하고", "이랑", "마저", "조차", "밖에", "마다", "은", "는", "이", "가", "을", "를", "의", "에", "도", "만", "와", "과", "로"];
    const particle = particles.find((candidate) => token.endsWith(candidate) && Array.from(token.slice(0, -candidate.length)).length >= 2);
    return particle ? token.slice(0, -particle.length) : token;
  }

  function analyzeText(text, options) {
    const settings = options || {};
    const minLength = Math.max(1, Math.min(10, Number(settings.minLength) || 2));
    const maxWords = Math.max(1, Math.min(500, Number(settings.maxWords) || 100));
    const stopwords = new Set(settings.useDefaultStopwords === false ? [] : DEFAULT_STOPWORDS);
    parseStopwords(settings.customStopwords).forEach((word) => stopwords.add(word));

    const tokens = tokenize(text);
    const frequencies = new Map();
    let removedStopwords = 0;
    let removedShort = 0;
    let removedNumbers = 0;
    let normalizedParticles = 0;

    tokens.forEach((rawToken) => {
      let token = rawToken;
      if (stopwords.has(token)) {
        removedStopwords += 1;
        return;
      }
      if (settings.stripParticles !== false) {
        token = stripKoreanParticle(token);
        if (token !== rawToken) normalizedParticles += 1;
      }
      if (stopwords.has(token)) {
        removedStopwords += 1;
        return;
      }
      if (Array.from(token).length < minLength) {
        removedShort += 1;
        return;
      }
      if (settings.includeNumbers === false && isOnlyNumber(token)) {
        removedNumbers += 1;
        return;
      }
      frequencies.set(token, (frequencies.get(token) || 0) + 1);
    });

    const analyzedTokens = Array.from(frequencies.values()).reduce((sum, count) => sum + count, 0);
    const allEntries = Array.from(frequencies, ([word, count]) => ({
      word,
      count,
      percent: analyzedTokens ? (count / analyzedTokens) * 100 : 0
    })).sort((a, b) => b.count - a.count || a.word.localeCompare(b.word, "ko"));

    return {
      entries: allEntries.slice(0, maxWords),
      allEntries,
      stats: {
        characters: Array.from(String(text || "")).length,
        totalTokens: tokens.length,
        analyzedTokens,
        uniqueWords: allEntries.length,
        selectedWords: Math.min(maxWords, allEntries.length),
        removedStopwords,
        removedShort,
        removedNumbers,
        normalizedParticles,
        removedTotal: removedStopwords + removedShort + removedNumbers
      },
      options: { minLength, maxWords, stopwordCount: stopwords.size }
    };
  }

  function toCsv(result) {
    const rows = [["순위", "단어", "빈도", "비율(%)"]];
    (result?.allEntries || []).forEach((entry, index) => {
      rows.push([index + 1, entry.word, entry.count, entry.percent.toFixed(2)]);
    });
    return rows.map((row) => row.map((cell) => {
      const value = String(cell);
      return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
    }).join(",")).join("\n");
  }

  return { DEFAULT_STOPWORDS, normalizeWord, tokenize, parseStopwords, stripKoreanParticle, analyzeText, toCsv };
});
