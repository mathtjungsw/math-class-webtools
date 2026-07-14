const tones = [
  { name: "도", latin: "C", n: 1, d: 1, tip: "모든 음계의 출발점이에요." },
  { name: "레♭", latin: "D♭", n: 256, d: 243, tip: "온음보다 작은 피타고라스 반음이에요.", special: true },
  { name: "도♯", latin: "C♯", n: 2187, d: 2048, tip: "레♭과 닮았지만 완전히 같지는 않아요!", special: true },
  { name: "레", latin: "D", n: 9, d: 8, tip: "완전5도를 두 번 쌓아 만든 음이에요." },
  { name: "미♭", latin: "E♭", n: 32, d: 27, tip: "도와 32 : 27의 관계를 가져요." },
  { name: "미", latin: "E", n: 81, d: 64, tip: "밝게 들리는 피타고라스 장3도예요." },
  { name: "파", latin: "F", n: 4, d: 3, tip: "간단한 4 : 3 비율, 완전4도예요." },
  { name: "솔♭", latin: "G♭", n: 1024, d: 729, tip: "파♯과의 작은 틈이 피타고라스 콤마예요.", special: true },
  { name: "파♯", latin: "F♯", n: 729, d: 512, tip: "솔♭과 거의 같지만 수학적으로는 달라요.", special: true },
  { name: "솔", latin: "G", n: 3, d: 2, tip: "가장 단순하고 안정적인 3 : 2, 완전5도!", fifth: true },
  { name: "라♭", latin: "A♭", n: 128, d: 81, tip: "여러 번의 완전5도를 옥타브 안에 모았어요." },
  { name: "라", latin: "A", n: 27, d: 16, tip: "도에서 완전5도를 세 번 쌓아 얻어요." },
  { name: "시♭", latin: "B♭", n: 16, d: 9, tip: "도와 16 : 9의 주파수 비를 가져요." },
  { name: "시", latin: "B", n: 243, d: 128, tip: "옥타브 바로 아래의 팽팽한 울림이에요." },
  { name: "높은 도", latin: "C′", n: 2, d: 1, tip: "주파수가 정확히 2배! 같은 음처럼 들려요." }
];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const state = { base: 220, selected: 0, fA: 220, fB: 224, phase: 0, ampA: 1, ampB: 1, interferenceFrequency: 220, activeTab: "pitch", stars: new Set(), toastTimer: 0 };

class AudioLab {
  constructor() { this.context = null; this.master = null; this.nodes = []; this.volume = .2; this.generation = 0; }
  async ready() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) throw new Error("audio-not-supported");
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === "suspended") await this.context.resume();
  }
  setVolume(value) { this.volume = value; if (this.master) this.master.gain.setTargetAtTime(value, this.context.currentTime, .02); }
  stop(fade = .035) {
    this.generation += 1;
    if (!this.context) return;
    const now = this.context.currentTime;
    this.nodes.forEach(({ oscillator, gain }) => {
      try { gain.gain.cancelScheduledValues(now); gain.gain.setTargetAtTime(0, now, fade / 3); oscillator.stop(now + fade); } catch {}
    });
    this.nodes = [];
  }
  async play(frequencies, duration = 1.2, phases = [], amplitudes = []) {
    await this.ready(); this.stop();
    const generation = ++this.generation;
    const now = this.context.currentTime;
    frequencies.forEach((frequency, index) => {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = "sine"; oscillator.frequency.value = frequency;
      const amplitude = (amplitudes[index] ?? 1) / Math.max(1, frequencies.length);
      gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(amplitude, now + .025); gain.gain.setValueAtTime(amplitude, now + Math.max(.04, duration - .12)); gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
      oscillator.connect(gain).connect(this.master);
      const phaseDelay = Math.max(0, (phases[index] || 0) / (Math.PI * 2 * frequency));
      oscillator.start(now + phaseDelay); oscillator.stop(now + duration + .02);
      this.nodes.push({ oscillator, gain });
    });
    window.setTimeout(() => { if (this.generation === generation) this.nodes = []; }, (duration + .1) * 1000);
  }
}
const audio = new AudioLab();

function toneFrequency(index = state.selected) { const tone = tones[index]; return state.base * tone.n / tone.d; }
function buildToneDeck() {
  const deck = $("#toneDeck");
  tones.forEach((tone, index) => {
    const button = document.createElement("button");
    button.type = "button"; button.className = `tone-key${tone.special ? " is-special" : ""}${tone.fifth ? " is-fifth" : ""}`;
    button.dataset.index = index; button.setAttribute("aria-label", `${tone.name}, 비율 ${tone.n} 대 ${tone.d}`); button.setAttribute("aria-pressed", index === 0 ? "true" : "false");
    button.innerHTML = `<em></em><b>${tone.name}</b><small>${tone.n}/${tone.d}</small>`;
    button.addEventListener("click", () => selectTone(index, true));
    deck.append(button);
  });
  deck.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault(); const current = Number(document.activeElement?.dataset.index ?? state.selected);
    const next = event.key === "Home" ? 0 : event.key === "End" ? tones.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + tones.length) % tones.length;
    selectTone(next, false); deck.children[next].focus();
  });
}
async function selectTone(index, shouldPlay) {
  state.selected = index; const tone = tones[index]; const frequency = toneFrequency(index);
  $$(".tone-key").forEach((key, keyIndex) => key.setAttribute("aria-pressed", keyIndex === index ? "true" : "false"));
  $("#inspectorNote").textContent = tone.name; $("#inspectorFrequency").innerHTML = `${frequency.toFixed(2)} <small>Hz</small>`; $("#inspectorRatio").textContent = `${tone.n} : ${tone.d}`; $("#inspectorTip").textContent = tone.tip; $("#heroFrequency").textContent = `${frequency.toFixed(1)} Hz`;
  if (shouldPlay) { try { await audio.play([frequency], .85); } catch { showToast("이 브라우저에서는 소리를 재생할 수 없어요."); } }
  if (tone.fifth) completeMission("fifth", "정답! 3 : 2는 ‘솔’, 완전5도예요.");
}

function activateTab(name, focus = false) {
  state.activeTab = name;
  $$("[role=tab]").forEach((tab) => { const active = tab.dataset.tab === name; tab.setAttribute("aria-selected", String(active)); tab.tabIndex = active ? 0 : -1; if (active && focus) tab.focus(); });
  $$("[role=tabpanel]").forEach((panel) => { panel.hidden = panel.id !== `panel${name[0].toUpperCase()}${name.slice(1)}`; });
  document.documentElement.style.setProperty("--active-tab", name);
}
$$('[role="tab"]').forEach((tab, index, tabs) => {
  tab.addEventListener("click", () => activateTab(tab.dataset.tab));
  tab.addEventListener("keydown", (event) => { if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return; event.preventDefault(); const next = (index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length; activateTab(tabs[next].dataset.tab, true); });
});
$$('[data-go-tab]').forEach((button) => button.addEventListener("click", () => { activateTab(button.dataset.goTab); $("#lab").scrollIntoView({ behavior: "smooth" }); }));

function updateBase() { state.base = Number($("#baseFrequency").value); $("#baseOutput").textContent = `${state.base} Hz`; selectTone(state.selected, false); }
$("#baseFrequency").addEventListener("input", updateBase);
$("#playSelectedTone").addEventListener("click", () => selectTone(state.selected, true));
$("#soundCheck").addEventListener("click", async () => { try { await audio.play([220,330], .9); $("#soundNotice").textContent = "준비 완료! 방금 들린 두 음은 2 : 3의 관계예요."; } catch { showToast("이 브라우저에서는 소리를 재생할 수 없어요."); } });
$("#masterVolume").addEventListener("input", (event) => { const value = Number(event.target.value); $("#volumeOutput").textContent = `${value}%`; audio.setVolume(value / 100); });

function updateBeat() {
  state.fA = Number($("#frequencyA").value); state.fB = Number($("#frequencyB").value); const beat = Math.abs(state.fB - state.fA);
  $("#frequencyAOutput").textContent = `${state.fA.toFixed(1)} Hz`; $("#frequencyBOutput").textContent = `${state.fB.toFixed(1)} Hz`; $("#beatValue").textContent = beat.toFixed(1); $("#beatFormulaA").textContent = state.fA.toFixed(1); $("#beatFormulaB").textContent = state.fB.toFixed(1); $("#beatFormulaResult").textContent = `${beat.toFixed(1)} Hz`; $("#beatNeedle").style.left = `${Math.min(94, beat / 40 * 100)}%`;
  $("#beatMood").textContent = beat <= .5 ? "고요해요! 두 음이 거의 하나가 됐어요." : beat < 3 ? "천천히 출렁이는 맥놀이예요." : beat < 8 ? "두근두근, 느린 맥놀이!" : "빠르게 떨려 하나의 거친 음처럼 들려요.";
  if (beat <= .5) completeMission("beat", "성공! 주파수 차가 0.5 Hz 이하예요.");
}
[$("#frequencyA"), $("#frequencyB")].forEach((input) => input.addEventListener("input", updateBeat));
$("#playBeat").addEventListener("click", async () => { try { await audio.play([state.fA,state.fB], 2.5); } catch { showToast("이 브라우저에서는 소리를 재생할 수 없어요."); } });

function updateInterference() {
  state.interferenceFrequency = Number($("#interferenceFrequency").value); state.ampA = Number($("#amplitudeA").value) / 100; state.ampB = Number($("#amplitudeB").value) / 100; state.phase = Number($("#phase").value);
  $("#interferenceFrequencyOutput").textContent = `${state.interferenceFrequency} Hz`; $("#amplitudeAOutput").textContent = `${Math.round(state.ampA*100)}%`; $("#amplitudeBOutput").textContent = `${Math.round(state.ampB*100)}%`; $("#phaseOutput").textContent = `${state.phase}°`;
  const radians = state.phase * Math.PI / 180; const resultAmplitude = Math.sqrt(state.ampA ** 2 + state.ampB ** 2 + 2 * state.ampA * state.ampB * Math.cos(radians));
  if (resultAmplitude < .12) { $("#interferenceIcon").textContent = "−"; $("#interferenceTitle").textContent = "상쇄 간섭"; $("#interferenceDescription").textContent = "마루와 골이 만나 파동이 거의 사라집니다."; }
  else if (resultAmplitude > state.ampA + state.ampB - .15) { $("#interferenceIcon").textContent = "＋"; $("#interferenceTitle").textContent = "보강 간섭"; $("#interferenceDescription").textContent = "마루와 마루가 만나 더 큰 파동이 됩니다."; }
  else { $("#interferenceIcon").textContent = "≈"; $("#interferenceTitle").textContent = "부분 간섭"; $("#interferenceDescription").textContent = "두 파동이 일부는 더하고 일부는 줄입니다."; }
  if (Math.abs(state.ampA - state.ampB) <= .01 && Math.abs(state.phase - 180) <= 2 && state.ampA > .1) completeMission("cancel", "멋져요! 같은 세기 + 180°로 소리를 지웠어요.");
}
[$("#interferenceFrequency"), $("#amplitudeA"), $("#amplitudeB"), $("#phase")].forEach((input) => input.addEventListener("input", updateInterference));
$$('[data-phase]').forEach((button) => button.addEventListener("click", () => { $("#phase").value = button.dataset.phase; updateInterference(); }));
$("#playInterference").addEventListener("click", async () => { try { await audio.play([state.interferenceFrequency,state.interferenceFrequency], 1.8, [0,state.phase*Math.PI/180], [state.ampA,state.ampB]); } catch { showToast("이 브라우저에서는 소리를 재생할 수 없어요."); } });

function completeMission(id, message) {
  if (state.stars.has(id)) return; state.stars.add(id); const card = $(`#mission${id[0].toUpperCase()}${id.slice(1)}`); card?.classList.add("is-complete"); card?.setAttribute("aria-label", "완료한 미션"); $("#starCount").textContent = state.stars.size; showToast(`★ ${message}`); burstConfetti();
  if (state.stars.size === 3) window.setTimeout(() => showToast("🏆 별 3개 완성! 오늘부터 당신은 사운드 수학자!"), 1250);
}
function showToast(message) { const toast = $("#toast"); window.clearTimeout(state.toastTimer); toast.textContent = message; toast.hidden = false; state.toastTimer = window.setTimeout(() => { toast.hidden = true; }, 2600); }
function burstConfetti() { if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; const box = $("#confetti"); const colors = ["#d8ff55","#65e7ff","#ff75ad","#ff9c57","#8e76ff"]; for (let i=0;i<34;i++){ const bit=document.createElement("i"); bit.style.left=`${Math.random()*100}%`; bit.style.setProperty("--c",colors[i%colors.length]); bit.style.setProperty("--x",`${(Math.random()-.5)*220}px`); bit.style.setProperty("--r",`${Math.random()*180}deg`); bit.style.animationDelay=`${Math.random()*.25}s`; box.append(bit); window.setTimeout(()=>bit.remove(),1600); } }

function setupCanvas(canvas) { const rect=canvas.getBoundingClientRect(); const ratio=Math.min(2,window.devicePixelRatio||1); const width=Math.max(1,Math.round(rect.width*ratio)); const height=Math.max(1,Math.round(rect.height*ratio)); if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height} const ctx=canvas.getContext("2d"); ctx.setTransform(ratio,0,0,ratio,0,0); return {ctx,w:rect.width,h:rect.height}; }
function grid(ctx,w,h,step=32){ ctx.strokeStyle="rgba(255,255,255,.07)";ctx.lineWidth=1;ctx.beginPath();for(let x=0;x<w;x+=step){ctx.moveTo(x,0);ctx.lineTo(x,h)}for(let y=0;y<h;y+=step){ctx.moveTo(0,y);ctx.lineTo(w,y)}ctx.stroke(); }
function line(ctx,w,center,amplitude,cycles,phase,color,width=3){ctx.beginPath();for(let x=0;x<=w;x+=2){const y=center+Math.sin((x/w)*Math.PI*2*cycles+phase)*amplitude;x===0?ctx.moveTo(x,y):ctx.lineTo(x,y)}ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
let animationTime=0;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function draw() {
  animationTime += reduceMotion ? 0 : .018;
  const hero=setupCanvas($("#heroCanvas")); hero.ctx.clearRect(0,0,hero.w,hero.h); grid(hero.ctx,hero.w,hero.h); line(hero.ctx,hero.w,hero.h*.5,50,3.5,animationTime,"#65e7ff",4); line(hero.ctx,hero.w,hero.h*.5,28,6,-animationTime*.7,"rgba(216,255,85,.65)",2);
  const pitch=setupCanvas($("#pitchCanvas")); pitch.ctx.clearRect(0,0,pitch.w,pitch.h); grid(pitch.ctx,pitch.w,pitch.h,28); line(pitch.ctx,pitch.w,pitch.h*.5,pitch.h*.26,Math.max(1.5,toneFrequency()/90),animationTime,"#d8ff55",4); pitch.ctx.fillStyle="#aeb2cf";pitch.ctx.font="800 11px Nunito";pitch.ctx.fillText(`${tones[state.selected].name} · ${toneFrequency().toFixed(2)} Hz`,18,24);
  const beat=setupCanvas($("#beatCanvas")); beat.ctx.clearRect(0,0,beat.w,beat.h);grid(beat.ctx,beat.w,beat.h,30); const diff=Math.abs(state.fB-state.fA); const envelope=Math.max(1.2,diff/2); beat.ctx.beginPath();for(let x=0;x<=beat.w;x+=2){const carrier=Math.sin(x/beat.w*Math.PI*2*((state.fA+state.fB)/34)+animationTime*2);const env=Math.cos(x/beat.w*Math.PI*2*envelope);const y=beat.h*.55+carrier*env*beat.h*.28;x===0?beat.ctx.moveTo(x,y):beat.ctx.lineTo(x,y)}beat.ctx.strokeStyle="#65e7ff";beat.ctx.lineWidth=3;beat.ctx.stroke();line(beat.ctx,beat.w,beat.h*.55,beat.h*.28,envelope,0,"rgba(255,117,173,.65)",1.5);line(beat.ctx,beat.w,beat.h*.55,beat.h*.28,envelope,Math.PI,"rgba(255,117,173,.65)",1.5);beat.ctx.fillStyle="#aeb2cf";beat.ctx.font="800 11px Nunito";beat.ctx.fillText(`envelope = ${diff.toFixed(1)} beats/s`,18,24);
  const inter=setupCanvas($("#interferenceCanvas"));inter.ctx.clearRect(0,0,inter.w,inter.h);grid(inter.ctx,inter.w,inter.h,34);const phase=state.phase*Math.PI/180;const cycles=Math.max(2,state.interferenceFrequency/55);const thirds=[inter.h*.34,inter.h*.55,inter.h*.79];line(inter.ctx,inter.w,thirds[0],45*state.ampA,cycles,animationTime,"#65e7ff",3);line(inter.ctx,inter.w,thirds[1],45*state.ampB,cycles,animationTime+phase,"#ff75ad",3);inter.ctx.beginPath();for(let x=0;x<=inter.w;x+=2){const a=Math.sin(x/inter.w*Math.PI*2*cycles+animationTime)*state.ampA;const b=Math.sin(x/inter.w*Math.PI*2*cycles+animationTime+phase)*state.ampB;const y=thirds[2]+(a+b)*42;x===0?inter.ctx.moveTo(x,y):inter.ctx.lineTo(x,y)}inter.ctx.strokeStyle="#d8ff55";inter.ctx.lineWidth=4;inter.ctx.stroke();inter.ctx.fillStyle="#b9bdd3";inter.ctx.font="800 10px Nunito";inter.ctx.fillText("WAVE A",15,thirds[0]-57);inter.ctx.fillText("WAVE B",15,thirds[1]-57);inter.ctx.fillStyle="#d8ff55";inter.ctx.fillText("A + B",15,thirds[2]-62);
  requestAnimationFrame(draw);
}

buildToneDeck(); updateBase(); updateBeat(); updateInterference(); draw();
window.addEventListener("pagehide",()=>audio.stop());
