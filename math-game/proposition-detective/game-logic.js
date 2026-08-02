(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PropositionDetectiveLogic = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function evaluateProposition(kind, people, testA, testB, count) {
    const a = typeof testA === "function" ? testA : () => false;
    const b = typeof testB === "function" ? testB : () => false;
    switch (kind) {
      case "allC": return people.filter((person) => person.culprit).every(a);
      case "pAreC": return people.filter(a).every((person) => person.culprit);
      case "somePC": return people.some((person) => a(person) && person.culprit);
      case "countC": return people.filter((person) => person.culprit).length === Number(count);
      case "ifThen": return people.every((person) => !a(person) || b(person));
      case "allCor": return people.filter((person) => person.culprit).every((person) => a(person) || b(person));
      case "someCand": return people.some((person) => person.culprit && a(person) && b(person));
      case "exactP": return people.filter(a).length === Number(count);
      default: throw new Error(`Unknown proposition kind: ${kind}`);
    }
  }

  function answerByRole(role, truthValue, random = Math.random) {
    if (role === "truth") return Boolean(truthValue);
    if (role === "lie") return !truthValue;
    if (role === "free") return random() < 0.5;
    throw new Error(`Unknown role: ${role}`);
  }

  function distributeRoles(personCount) {
    const count = Math.max(4, Math.min(10, Math.round(Number(personCount) || 4)));
    const truth = Math.ceil(count / 2);
    const lie = Math.max(1, Math.floor(count / 4));
    return { truth, lie, free: count - truth - lie };
  }

  function sameSelection(expectedIds, selectedIds) {
    const expected = new Set(expectedIds);
    const selected = selectedIds instanceof Set ? selectedIds : new Set(selectedIds);
    return expected.size === selected.size && [...expected].every((id) => selected.has(id));
  }

  return { answerByRole, distributeRoles, evaluateProposition, sameSelection };
});
