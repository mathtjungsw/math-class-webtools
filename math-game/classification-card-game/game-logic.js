(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ClassificationGameLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const MAX_CATEGORIES = 10;
  const MAX_CARDS = 120;

  function cleanText(value, fallback = "") {
    return String(value ?? fallback).trim();
  }

  function safeId(value, fallback) {
    const result = cleanText(value)
      .toLowerCase()
      .replace(/[^a-z0-9가-힣_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);
    return result || fallback;
  }

  function sanitizeSet(raw) {
    if (!raw || typeof raw !== "object") throw new Error("문제 세트 형식이 올바르지 않습니다.");

    const rawCategories = Array.isArray(raw.categories) ? raw.categories.slice(0, MAX_CATEGORIES) : [];
    if (rawCategories.length < 2) throw new Error("분류 항목은 2개 이상 필요합니다.");

    const usedCategoryIds = new Set();
    const categories = rawCategories.map((category, index) => {
      let id = safeId(category.id, `category-${index + 1}`);
      while (usedCategoryIds.has(id)) id = `${id}-${index + 1}`;
      usedCategoryIds.add(id);
      const name = cleanText(category.name);
      if (!name) throw new Error(`${index + 1}번째 분류 항목의 이름을 입력하세요.`);
      return {
        id,
        name: name.slice(0, 40),
        symbol: cleanText(category.symbol, String(index + 1)).slice(0, 4),
        summary: cleanText(category.summary, `${name}에 해당하는 카드를 모읍니다.`).slice(0, 240),
      };
    });

    const categoryIds = new Set(categories.map((category) => category.id));
    const rawCards = Array.isArray(raw.cards) ? raw.cards.slice(0, MAX_CARDS) : [];
    if (rawCards.length < 2) throw new Error("카드는 2장 이상 필요합니다.");

    const usedCardIds = new Set();
    const cards = rawCards.map((card, index) => {
      let id = safeId(card.id, `card-${index + 1}`);
      while (usedCardIds.has(id)) id = `${id}-${index + 1}`;
      usedCardIds.add(id);
      const text = cleanText(card.text);
      const category = cleanText(card.category);
      if (!text) throw new Error(`${index + 1}번째 카드의 내용을 입력하세요.`);
      if (!categoryIds.has(category)) throw new Error(`‘${text}’ 카드의 분류 항목을 확인하세요.`);
      return {
        id,
        text: text.slice(0, 180),
        category,
        explanation: cleanText(card.explanation, `${categories.find((item) => item.id === category).name}에 해당합니다.`).slice(0, 320),
        kind: card.kind === "visual" ? "visual" : "text",
        visual: cleanText(card.visual).slice(0, 24),
        ariaLabel: cleanText(card.ariaLabel, text).slice(0, 180),
      };
    });

    return {
      version: 1,
      id: safeId(raw.id, "custom-set"),
      title: cleanText(raw.title, "나의 분류 카드").slice(0, 70),
      subtitle: cleanText(raw.subtitle, "카드를 알맞은 항목으로 분류하세요.").slice(0, 160),
      teacherNote: cleanText(raw.teacherNote).slice(0, 500),
      categories,
      cards,
    };
  }

  function evaluate(cards, placements) {
    return cards.map((card) => ({
      cardId: card.id,
      expected: card.category,
      actual: placements[card.id] || null,
      correct: placements[card.id] === card.category,
    }));
  }

  function calculateScore({ total, correct, mistakes = 0, mode = "submit" }) {
    if (!Number.isFinite(total) || total <= 0) return 0;
    const earned = mode === "instant" ? correct - mistakes * 0.2 : correct;
    return Math.max(0, Math.min(100, Math.round((earned / total) * 100)));
  }

  function shuffled(items, random = Math.random) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  function formatClock(totalSeconds) {
    const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return { sanitizeSet, evaluate, calculateScore, shuffled, formatClock };
});
