const COLORS = ["#64caa2", "#ef806d", "#f2c85b", "#6d9ed2", "#9a83c5"];

const TRAITS = {
  peaSeed: {
    name: "완두콩 씨 색깔", model: "완전 우성", note: "멘델의 완두콩 모형: Y(노란색)가 y(초록색)에 대해 우성입니다.",
    alleles: ["Y", "y"], genotypes: ["YY", "Yy", "yy"], defaults: ["Yy", "Yy"],
    phenotype(g) { return g.includes("Y") ? "노란 씨" : "초록 씨"; }
  },
  peaFlower: {
    name: "완두콩 꽃 색깔", model: "완전 우성", note: "P(보라색)가 p(흰색)에 대해 우성인 교과용 완두콩 모형입니다.",
    alleles: ["P", "p"], genotypes: ["PP", "Pp", "pp"], defaults: ["Pp", "Pp"],
    phenotype(g) { return g.includes("P") ? "보라색 꽃" : "흰색 꽃"; }
  },
  snapdragon: {
    name: "분꽃 색깔", model: "불완전 우성", note: "R과 W가 만나면 중간 표현형인 분홍색 꽃이 나타나는 모형입니다.",
    alleles: ["R", "W"], genotypes: ["RR", "RW", "WW"], defaults: ["RW", "RW"],
    phenotype(g) { return g === "RR" ? "붉은 꽃" : g === "WW" ? "흰 꽃" : "분홍 꽃"; }
  },
  cattle: {
    name: "소의 털 색깔", model: "공우성", note: "R과 W가 함께 발현되면 붉고 흰 털이 모두 보이는 로운색 모형입니다.",
    alleles: ["R", "W"], genotypes: ["RR", "RW", "WW"], defaults: ["RW", "RW"],
    phenotype(g) { return g === "RR" ? "붉은 털" : g === "WW" ? "흰 털" : "로운 털"; }
  },
  mnBlood: {
    name: "MN식 혈액형", model: "공우성", note: "Lᴹ과 Lᴺ이 함께 있을 때 M형과 N형 항원이 모두 발현됩니다.",
    alleles: ["M", "N"], genotypes: ["MM", "MN", "NN"], defaults: ["MN", "MN"],
    phenotype(g) { return g === "MM" ? "M형" : g === "NN" ? "N형" : "MN형"; }
  },
  aboBlood: {
    name: "ABO식 혈액형", model: "복대립·공우성", note: "Iᴬ와 Iᴮ는 서로 공우성이며, i에 대해서는 우성입니다.",
    alleles: ["A", "B", "O"], genotypes: ["AA", "AO", "BB", "BO", "AB", "OO"], defaults: ["AO", "BO"],
    phenotype(g) { if (g.includes("A") && g.includes("B")) return "AB형"; if (g.includes("A")) return "A형"; if (g.includes("B")) return "B형"; return "O형"; },
    displayAllele(a) { return a === "O" ? "i" : `I${a === "A" ? "ᴬ" : "ᴮ"}`; }
  },
  colorVision: {
    name: "X-연관 색각 유전", model: "X-연관 열성", note: "X 염색체에 있는 대립유전자의 전달을 살펴보는 단순화 모형입니다.",
    alleles: ["N", "n"], genotypes: ["XNXN", "XNXn", "XnXn", "XNY", "XnY"], defaults: ["XNXn", "XNY"], sexLinked: true,
    phenotype(g) { const male = g.endsWith("Y"); const affected = male ? g === "XnY" : g === "XnXn"; return affected ? `색각 특성 ${male ? "남" : "여"}` : `일반 색각 ${male ? "남" : "여"}`; }
  },
  fantasyCurl: {
    name: "가상 생물 더듬이 모양", model: "완전 우성", note: "실제 사람의 외모와 무관한 가상 형질입니다. C(곱슬)가 c(곧음)에 대해 우성입니다.",
    alleles: ["C", "c"], genotypes: ["CC", "Cc", "cc"], defaults: ["Cc", "cc"],
    phenotype(g) { return g.includes("C") ? "곱슬 더듬이" : "곧은 더듬이"; }
  }
};

const els = Object.fromEntries([
  "traitSelect", "modelNote", "parentASelect", "parentBSelect", "parentAPhenotype", "parentBPhenotype", "generationRange", "generationOutput", "populationRange", "populationOutput", "seedInput", "shuffleSeed", "simulateButton", "simulateSummary", "resetButton", "crossTitle", "modelType", "generationChip", "punnettSquare", "phenotypeDonut", "donutValue", "donutLabel", "probabilityLegend", "childLegend", "childrenStrip", "sampleNote", "generationStats", "generationLegend", "generationBars", "alleleChart", "alleleHeadline", "familyTree", "insightText", "compareButton", "guideButton", "guideDialog", "closeGuide"
].map(id => [id, document.getElementById(id)]));

let simulation = null;
let resizeTimer;

function trait() { return TRAITS[els.traitSelect.value]; }
function mulberry32(seed) { return function() { let t = seed += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function pick(arr, rng) { return arr[Math.floor(rng() * arr.length)]; }
function sortedPair(a, b, alleles) { return [a, b].sort((x, y) => alleles.indexOf(x) - alleles.indexOf(y)).join(""); }
function gametes(genotype, t) {
  if (!t.sexLinked) return genotype.split("");
  if (genotype.endsWith("Y")) return [genotype.slice(1, 2), "Y"];
  return [genotype.slice(1, 2), genotype.slice(3, 4)];
}
function childGenotype(parentA, parentB, t, rng) {
  const a = pick(gametes(parentA, t), rng), b = pick(gametes(parentB, t), rng);
  if (!t.sexLinked) return sortedPair(a, b, t.alleles);
  if (a === "Y" || b === "Y") return `X${a === "Y" ? b : a}Y`;
  return `X${[a, b].sort((x, y) => t.alleles.indexOf(x) - t.alleles.indexOf(y)).join("X")}`;
}
function displayGenotype(g, t) {
  if (t.displayAllele) return g.split("").map(t.displayAllele).join("");
  if (t.sexLinked) return g.replaceAll("XN", "Xᴺ").replaceAll("Xn", "Xⁿ");
  return g;
}
function getDistribution(items, mapper) { const map = new Map(); items.forEach(x => { const k = mapper(x); map.set(k, (map.get(k) || 0) + 1); }); return map; }
function phenotypePalette(names) { return new Map(names.map((n, i) => [n, COLORS[i % COLORS.length]])); }

function theoreticalCross(parentA, parentB, t) {
  const outcomes = [];
  for (const a of gametes(parentA, t)) for (const b of gametes(parentB, t)) {
    let genotype;
    if (!t.sexLinked) genotype = sortedPair(a, b, t.alleles);
    else if (a === "Y" || b === "Y") genotype = `X${a === "Y" ? b : a}Y`;
    else genotype = `X${[a, b].sort((x, y) => t.alleles.indexOf(x) - t.alleles.indexOf(y)).join("X")}`;
    outcomes.push({ a, b, genotype, phenotype: t.phenotype(genotype) });
  }
  return outcomes;
}

function configureTrait() {
  const t = trait();
  els.modelNote.textContent = t.note;
  const parentAOptions = t.sexLinked ? t.genotypes.filter(g => !g.endsWith("Y")) : t.genotypes;
  const parentBOptions = t.sexLinked ? t.genotypes.filter(g => g.endsWith("Y")) : t.genotypes;
  els.parentASelect.replaceChildren(...parentAOptions.map(g => new Option(`${displayGenotype(g, t)} · ${t.phenotype(g)}`, g)));
  els.parentBSelect.replaceChildren(...parentBOptions.map(g => new Option(`${displayGenotype(g, t)} · ${t.phenotype(g)}`, g)));
  els.parentASelect.value = t.defaults[0]; els.parentBSelect.value = t.defaults[1];
  updateParents(); simulate();
}
function updateParents() {
  const t = trait();
  els.parentAPhenotype.textContent = t.phenotype(els.parentASelect.value);
  els.parentBPhenotype.textContent = t.phenotype(els.parentBSelect.value);
}
function updateControls() {
  els.generationOutput.textContent = `${els.generationRange.value}세대`;
  els.populationOutput.textContent = `${Number(els.populationRange.value).toLocaleString()}명`;
  els.simulateSummary.textContent = `${els.generationRange.value}세대 · ${(els.generationRange.value * els.populationRange.value).toLocaleString()}명`;
}

function simulate() {
  updateParents(); updateControls();
  const t = trait(), generations = +els.generationRange.value, size = +els.populationRange.value;
  const rng = mulberry32(Math.max(1, +els.seedInput.value || 1));
  const parentA = els.parentASelect.value, parentB = els.parentBSelect.value;
  const theory = theoreticalCross(parentA, parentB, t);
  const cohorts = [];
  let current = Array.from({ length: size }, () => childGenotype(parentA, parentB, t, rng));
  cohorts.push(current);
  for (let gen = 1; gen < generations; gen++) {
    const next = [];
    const females = t.sexLinked ? current.filter(g => !g.endsWith("Y")) : current;
    const males = t.sexLinked ? current.filter(g => g.endsWith("Y")) : current;
    for (let i = 0; i < size; i++) {
      const nextParentA = pick(females.length ? females : [parentA], rng);
      const nextParentB = pick(males.length ? males : [parentB], rng);
      next.push(childGenotype(nextParentA, nextParentB, t, rng));
    }
    current = next; cohorts.push(current);
  }
  simulation = { t, generations, size, rng, parentA, parentB, theory, cohorts };
  renderAll();
}

function renderAll() {
  const s = simulation, { t, theory, cohorts } = s;
  els.crossTitle.textContent = `${displayGenotype(s.parentA, t)} × ${displayGenotype(s.parentB, t)} 교배 결과`;
  els.modelType.textContent = t.model;
  els.generationChip.textContent = s.generations === 1 ? "F1" : `F1 → F${s.generations}`;
  renderPunnett(theory, t);
  const theoryDist = getDistribution(theory, x => x.phenotype);
  const phenotypeNames = [...new Set([...theoryDist.keys(), ...cohorts.flatMap(c => c.map(g => t.phenotype(g)))])];
  const palette = phenotypePalette(phenotypeNames);
  renderProbability(theoryDist, theory.length, palette);
  renderChildren(cohorts[0], t, palette, theoryDist);
  renderGenerations(cohorts, t, palette);
  renderStats(cohorts, t);
  renderFamily(cohorts, t, palette);
  drawAlleleChart(cohorts, t);
  renderInsight(cohorts, t);
}

function renderPunnett(outcomes, t) {
  const ga = gametes(simulation.parentA, t), gb = gametes(simulation.parentB, t);
  const cells = [{ cls: "corner", text: "×" }, ...gb.map(x => ({ cls: "header", text: displayGenotype(t.sexLinked ? (x === "Y" ? "Y" : `X${x}`) : x, t) }))];
  ga.forEach((a, row) => {
    cells.push({ cls: "header", text: displayGenotype(t.sexLinked ? (a === "Y" ? "Y" : `X${a}`) : a, t) });
    gb.forEach((_, col) => { const o = outcomes[row * gb.length + col]; cells.push({ cls: "result", text: displayGenotype(o.genotype, t), small: o.phenotype }); });
  });
  els.punnettSquare.replaceChildren(...cells.map((c, i) => { const d = document.createElement("div"); d.className = `punnett-cell ${c.cls}`; d.style.background = c.cls === "result" ? `${COLORS[(i + 1) % 4]}30` : ""; d.append(c.text); if (c.small) { const sm = document.createElement("small"); sm.textContent = c.small; d.append(sm); } return d; }));
}

function renderProbability(dist, total, palette) {
  const entries = [...dist.entries()]; let start = 0; const stops = [];
  entries.forEach(([name, count]) => { const end = start + count / total * 100; stops.push(`${palette.get(name)} ${start}% ${end}%`); start = end; });
  els.phenotypeDonut.style.background = `conic-gradient(${stops.join(",")})`;
  const top = entries.sort((a,b) => b[1] - a[1])[0];
  els.donutValue.textContent = `${Math.round(top[1] / total * 100)}%`; els.donutLabel.textContent = top[0];
  els.probabilityLegend.replaceChildren(...entries.map(([name, count]) => legendRow(name, `${Math.round(count / total * 100)}%`, palette.get(name))));
  setLegend(els.childLegend, palette); setLegend(els.generationLegend, palette);
}
function legendRow(name, value, color) { const d = document.createElement("div"); d.className = "legend-row"; d.innerHTML = `<i style="--c:${color}"></i><span></span><b>${value}</b>`; d.querySelector("span").textContent = name; return d; }
function setLegend(el, palette) { el.replaceChildren(...[...palette].map(([name, color]) => { const s = document.createElement("span"); s.innerHTML = `<i style="--c:${color}"></i>`; s.append(name); return s; })); }

function renderChildren(cohort, t, palette, theoryDist) {
  const sample = cohort.slice(0, 20), dist = getDistribution(sample, g => t.phenotype(g));
  els.childrenStrip.replaceChildren(...sample.map((g, i) => { const d = document.createElement("div"); d.className = "child-avatar"; d.style.setProperty("--c", palette.get(t.phenotype(g))); d.style.setProperty("--i", i); d.title = `${displayGenotype(g,t)} · ${t.phenotype(g)}`; d.textContent = displayGenotype(g,t); return d; }));
  const actual = [...dist].map(([k,v]) => `${k} ${v}명`).join(" · ");
  const theoryTotal = [...theoryDist.values()].reduce((a, b) => a + b, 0);
  const expected = [...theoryDist].map(([k,v]) => `${k} ${Math.round(v/theoryTotal*20)}명`).join(" · ");
  els.sampleNote.textContent = `이번 표본: ${actual}  |  이론상 약 ${expected}`;
}

function renderGenerations(cohorts, t, palette) {
  els.generationBars.replaceChildren(...cohorts.map((cohort, i) => {
    const dist = getDistribution(cohort, g => t.phenotype(g));
    const row = document.createElement("div"); row.className = "generation-row";
    const bar = document.createElement("div"); bar.className = "stacked-bar";
    for (const [name, color] of palette) { const count = dist.get(name) || 0; const seg = document.createElement("div"); seg.className = "stack-segment"; seg.style.width = `${count/cohort.length*100}%`; seg.style.background = color; seg.textContent = count/cohort.length > .11 ? `${Math.round(count/cohort.length*100)}%` : ""; seg.title = `${name}: ${count}명 (${(count/cohort.length*100).toFixed(1)}%)`; bar.append(seg); }
    row.innerHTML = `<b>F${i+1}</b>`; row.append(bar); const count = document.createElement("span"); count.textContent = `${cohort.length.toLocaleString()}명`; row.append(count); return row;
  }));
}

function renderStats(cohorts, t) {
  const last = cohorts.at(-1), all = cohorts.flat();
  const gDist = getDistribution(last, g => g), pDist = getDistribution(last, g => t.phenotype(g));
  const commonG = [...gDist].sort((a,b)=>b[1]-a[1])[0], commonP = [...pDist].sort((a,b)=>b[1]-a[1])[0];
  const cards = [["총 가상 개체", `${all.length.toLocaleString()}명`], ["도달 세대", `F${cohorts.length}`], ["최다 유전자형", `${displayGenotype(commonG[0],t)} · ${Math.round(commonG[1]/last.length*100)}%`], ["최다 표현형", `${commonP[0]} · ${Math.round(commonP[1]/last.length*100)}%`]];
  els.generationStats.replaceChildren(...cards.map(([label,value]) => { const a=document.createElement("article"); const s=document.createElement("span");s.textContent=label;const b=document.createElement("strong");b.textContent=value;a.append(s,b);return a; }));
}

function renderFamily(cohorts, t, palette) {
  els.familyTree.replaceChildren(...cohorts.map((cohort, gi) => { const row=document.createElement("div");row.className="tree-row";row.innerHTML=`<b>F${gi+1}</b>`;const people=document.createElement("div");people.className="tree-people";cohort.slice(0,8).forEach((g,i)=>{const p=document.createElement("div");p.className="tree-person";p.style.setProperty("--c",palette.get(t.phenotype(g)));p.title=`${displayGenotype(g,t)} · ${t.phenotype(g)}`;p.textContent=displayGenotype(g,t);people.append(p)});row.append(people);return row; }));
}

function alleleCounts(cohort, t) {
  const counts = new Map(t.alleles.map(a => [a, 0])); let total = 0;
  cohort.forEach(g => { for (const a of gametes(g,t)) if (a !== "Y") { counts.set(a,(counts.get(a)||0)+1); total++; } });
  return t.alleles.map(a => ({ allele:a, value:(counts.get(a)||0)/total }));
}
function drawAlleleChart(cohorts, t) {
  const canvas=els.alleleChart, rect=canvas.getBoundingClientRect(), dpr=window.devicePixelRatio||1; canvas.width=Math.max(1,rect.width*dpr);canvas.height=Math.max(1,rect.height*dpr);const ctx=canvas.getContext("2d");ctx.scale(dpr,dpr);const w=rect.width,h=rect.height,p={l:42,r:16,t:14,b:28};
  ctx.clearRect(0,0,w,h); ctx.font='10px "DM Sans"';ctx.textAlign="right";ctx.fillStyle="#799087";ctx.strokeStyle="rgba(255,255,255,.09)";ctx.lineWidth=1;
  [0,25,50,75,100].forEach(v=>{const y=p.t+(100-v)/100*(h-p.t-p.b);ctx.beginPath();ctx.moveTo(p.l,y);ctx.lineTo(w-p.r,y);ctx.stroke();ctx.fillText(`${v}%`,p.l-8,y+3)});
  const series=cohorts.map(c=>alleleCounts(c,t)); const x=i=>p.l+(cohorts.length===1?.5:i/(cohorts.length-1))*(w-p.l-p.r);const y=v=>p.t+(1-v)*(h-p.t-p.b);
  t.alleles.forEach((allele,ai)=>{ctx.strokeStyle=COLORS[ai];ctx.fillStyle=COLORS[ai];ctx.lineWidth=2.5;ctx.beginPath();series.forEach((s,i)=>{const pt=s.find(x=>x.allele===allele);i?ctx.lineTo(x(i),y(pt.value)):ctx.moveTo(x(i),y(pt.value))});ctx.stroke();series.forEach((s,i)=>{const pt=s.find(x=>x.allele===allele);ctx.beginPath();ctx.arc(x(i),y(pt.value),4,0,Math.PI*2);ctx.fill()});});
  ctx.textAlign="center";ctx.fillStyle="#8ca098";cohorts.forEach((_,i)=>ctx.fillText(`F${i+1}`,x(i),h-8));
  const last=series.at(-1);els.alleleHeadline.textContent=last.map((a,i)=>`${t.displayAllele?t.displayAllele(a.allele):a.allele} ${Math.round(a.value*100)}%`).join(" · ");
}

function renderInsight(cohorts, t) {
  const first=alleleCounts(cohorts[0],t)[0].value, last=alleleCounts(cohorts.at(-1),t)[0].value, diff=Math.abs(last-first)*100;
  const dir=last>first?"늘었고":last<first?"줄었고":"같았고";
  els.insightText.textContent=`${t.displayAllele?t.displayAllele(t.alleles[0]):t.alleles[0]} 대립유전자는 F1보다 F${cohorts.length}에서 ${diff.toFixed(1)}%p ${dir}, ${cohorts.length * cohorts[0].length}명의 결과에도 우연의 흔들림이 남았습니다.`;
}

for (const [key,t] of Object.entries(TRAITS)) els.traitSelect.add(new Option(`${t.name} · ${t.model}`,key));
els.traitSelect.value="peaSeed";
els.traitSelect.addEventListener("change",configureTrait);
[els.parentASelect,els.parentBSelect].forEach(el=>el.addEventListener("change",()=>{updateParents();simulate()}));
[els.generationRange,els.populationRange].forEach(el=>el.addEventListener("input",updateControls));
[els.generationRange,els.populationRange].forEach(el=>el.addEventListener("change",simulate));
els.seedInput.addEventListener("change",simulate); els.simulateButton.addEventListener("click",simulate);
els.shuffleSeed.addEventListener("click",()=>{els.seedInput.value=Math.floor(Math.random()*999999)+1;simulate()});
els.compareButton.addEventListener("click",()=>{els.seedInput.value=(+els.seedInput.value%999999)+1;simulate();document.querySelector(".generation-section").scrollIntoView({behavior:"smooth"})});
els.resetButton.addEventListener("click",()=>{els.traitSelect.value="peaSeed";els.generationRange.value=5;els.populationRange.value=100;els.seedInput.value=2026;configureTrait()});
els.guideButton.addEventListener("click",()=>els.guideDialog.showModal());els.closeGuide.addEventListener("click",()=>els.guideDialog.close());els.guideDialog.addEventListener("click",e=>{if(e.target===els.guideDialog)els.guideDialog.close()});
window.addEventListener("resize",()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>simulation&&drawAlleleChart(simulation.cohorts,simulation.t),120)});
configureTrait(); updateControls();
