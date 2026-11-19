import { firebaseConfig } from "./project.js";

const el = id => document.getElementById(id);
const savedRoomKey = "math-classroom-poll/v1/" + firebaseConfig.projectId;
const day = 86400000;
const roomPattern = /^[A-Za-z0-9_-]{1,128}\.[a-f0-9]{32}$/;
let clientPromise, room, meta, stopWatching;
const invitation = location.hash.slice(1);
const managementKey = new URL(location.href).searchParams.get("manage");

function readSaved() {
  try { return localStorage.getItem(savedRoomKey) || ""; } catch { return ""; }
}
function showStatus(message) { el("status").textContent = message; }

async function connect() {
  const [app, authLib, dbLib] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/12.4.0/firebase-database.js")
  ]);
  const instance = app.initializeApp(firebaseConfig, "math-class-poll");
  const auth = authLib.getAuth(instance);
  const db = dbLib.getDatabase(instance);
  await auth.authStateReady();
  const user = auth.currentUser || (await authLib.signInAnonymously(auth)).user;
  return { ...dbLib, db, uid: user.uid };
}
function client() {
  return clientPromise ||= connect().catch(error => { clientPromise = null; throw error; });
}
function address(fb, key, child = "") {
  const [owner, id] = key.split(".");
  return fb.ref(fb.db, ["mathClassPolls", owner, id, child].filter(Boolean).join("/"));
}
function drawCounts(snapshot) {
  const choices = meta.choices;
  const counts = choices.map(() => 0);
  snapshot.forEach(item => { counts[Number(item.val())]++; });
  const total = counts.reduce((sum, n) => sum + n, 0);
  el("total").textContent = total + "명";
  el("bars").replaceChildren(...choices.map((choice, i) => {
    const row = document.createElement("div"), label = document.createElement("span");
    const bar = document.createElement("progress"), count = document.createElement("strong");
    label.textContent = choice;
    bar.max = total || 1;
    bar.value = counts[i];
    bar.setAttribute("aria-label", choice);
    count.textContent = counts[i] + "명";
    row.append(label, bar, count);
    return row;
  }));
}
async function openTeacher(fb, key) {
  if (!roomPattern.test(key) || key.split(".")[0] !== fb.uid) throw new Error("이 브라우저에서 만든 투표를 찾을 수 없습니다.");
  meta = (await fb.get(address(fb, key, "meta"))).val();
  if (!meta) {
    if (readSaved() === key) localStorage.removeItem(savedRoomKey);
    throw new Error("투표 기록이 없습니다. 학급 응답 화면에서 새 투표를 열 수 있습니다.");
  }
  room = key;
  el("create").hidden = el("resume").hidden = true;
  el("teacher").hidden = false;
  el("teacher-question").textContent = meta.question;
  const link = new URL(location.href); link.search = ""; link.hash = key;
  el("share").value = link.href;
  const management = new URL(location.href); management.searchParams.set("manage", key);
  history.replaceState(null, "", management);
  el("close").hidden = !meta.open || meta.created + day <= Date.now();
  stopWatching?.();
  stopWatching = fb.onValue(address(fb, key, "votes"), drawCounts, () => showStatus("결과 연결이 끊겼습니다. 새로고침해 다시 연결하세요."));
  showStatus(el("close").hidden ? "응답을 마감했습니다." : "응답은 24시간 동안 받습니다. 이 화면에서 분포가 갱신됩니다.");
}

// Disable the initiating control until the server acknowledges the operation.
function handle(id, event, action) {
  el(id).addEventListener(event, async e => {
    e.preventDefault();
    const button = e.submitter || (e.currentTarget.tagName === "BUTTON" ? e.currentTarget : e.currentTarget.querySelector("button"));
    if (button.disabled) return;
    button.disabled = true;
    showStatus("처리 중입니다…");
    try { await action(); } catch (err) {
      const denied = /permission[ _-]?denied/i.test(err.code + " " + err.message);
      const technical = err.code || /fetch|module|network/i.test(err.message);
      if (denied) showStatus("참여할 수 없는 투표입니다. 선생님에게 링크와 마감 여부를 확인하세요.");
      else showStatus(technical ? "연결할 수 없습니다. 인터넷 연결을 확인한 뒤 다시 시도하세요." : err.message);
    } finally { button.disabled = false; }
  });
}
handle("create", "submit", async () => {
  const question = el("question").value.trim();
  const choices = el("choices").value.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  if (!question || choices.length < 2 || choices.length > 6 || new Set(choices).size !== choices.length || choices.some(x => x.length > 80))
    throw new Error("질문과 서로 다른 보기 2~6개를 입력하세요. 보기는 각각 80자까지입니다.");
  const fb = await client();
  const key = fb.uid + "." + crypto.randomUUID().replaceAll("-", "");
  localStorage.setItem(savedRoomKey, key);
  el("resume").hidden = false;
  await fb.set(address(fb, key, "meta"), {question, choices, open:true, created:fb.serverTimestamp()});
  await openTeacher(fb, key);
});
handle("resume", "click", async () => openTeacher(await client(), managementKey || readSaved()));
handle("copy", "click", async () => {
  el("share").select();
  try { await navigator.clipboard.writeText(el("share").value); showStatus("학생 참여 링크를 복사했습니다."); }
  catch { showStatus("선택된 링크를 복사해 학생에게 전달하세요."); }
});
handle("close", "click", async () => {
  const fb = await client();
  await fb.set(address(fb, room, "meta/open"), false);
  el("close").hidden = true;
  showStatus("응답을 마감했습니다.");
});
handle("erase", "click", async () => {
  if (!confirm("질문과 응답 전체를 Firebase에서 삭제할까요? 삭제하면 복원할 수 없습니다.")) {
    showStatus("기록을 보관했습니다.");
    return;
  }
  const fb = await client();
  await fb.remove(address(fb, room));
  stopWatching?.();
  if (readSaved() === room) localStorage.removeItem(savedRoomKey);
  location.replace(location.pathname);
});
handle("join", "click", async () => {
  const fb = await client();
  meta = (await fb.get(address(fb, invitation, "meta"))).val();
  if (!meta?.open || meta.created + day <= Date.now()) throw new Error("참여할 수 있는 투표가 아닙니다.");
  const vote = (await fb.get(address(fb, invitation, "votes/" + fb.uid))).val();
  el("prompt").textContent = meta.question;
  el("answers").replaceChildren(...meta.choices.map((choice, i) => {
    const label = document.createElement("label"), radio = document.createElement("input");
    radio.type = "radio"; radio.name = "vote"; radio.required = true; radio.value = String(i);
    radio.checked = vote === radio.value;
    label.append(radio, document.createTextNode(choice)); return label;
  }));
  el("student").hidden = false;
  el("join").hidden = true;
  showStatus(vote === null ? "" : "이미 제출한 선택입니다. 마감 전에 수정할 수 있습니다.");
});
handle("student", "submit", async () => {
  const selected = new FormData(el("student")).get("vote");
  if (selected === null) return;
  const fb = await client();
  await fb.set(address(fb, invitation, "votes/" + fb.uid), selected);
  showStatus("제출했습니다. 이 브라우저에서는 마지막 선택 한 표만 집계됩니다.");
});
if (!firebaseConfig.apiKey) {
  showStatus("온라인 투표 연결을 준비 중입니다. 학급 응답 화면에서 활동 코드로 수업을 진행할 수 있습니다.");
} else if (invitation) {
  el("intro").textContent = "질문을 확인하고 보기를 골라 제출하세요. 이름 없이 선택한 보기와 익명 참여 ID가 Firebase에 저장됩니다.";
  if (roomPattern.test(invitation)) el("join").hidden = false;
  else showStatus("링크가 올바르지 않습니다. 선생님이 보낸 전체 링크를 다시 여세요.");
} else {
  el("create").hidden = false;
  const previous = managementKey || readSaved();
  if (roomPattern.test(previous)) el("resume").hidden = false;
}
