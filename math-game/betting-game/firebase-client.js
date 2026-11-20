import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAuth, browserLocalPersistence, setPersistence, signInAnonymously, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import { getFirestore, connectFirestoreEmulator, doc, collection, getDocFromServer, getDocsFromServer,
  onSnapshot, onSnapshotsInSync, updateDoc, arrayUnion, runTransaction } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js?v=3";
import { ROOM_ID, TEAM_CODE, digest, newGame, applyAction, adminView, commonView, playerView, playerMove, requireGame,
  seatRecord, roomRecord, hydrateGame } from "./game-core.js?v=2";

const local = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
const config = local ? { projectId: "demo-betting-game", apiKey: "demo-betting-game", appId: "demo-betting-game" } : firebaseConfig;
let connection;

async function connect() {
  if (!config?.apiKey || !config.projectId || !config.appId) {
    throw new Error("Firebase 서버가 아직 설정되지 않았습니다. 사이트 운영자에게 알려 주세요.");
  }
  if (!connection) {
    connection = (async () => {
      const app = initializeApp(config, "classroom-betting-game");
      const auth = getAuth(app);
      const db = getFirestore(app);
      if (local) {
        connectAuthEmulator(auth, "http://127.0.0.1:9398", { disableWarnings: true });
        connectFirestoreEmulator(db, "127.0.0.1", 8398);
      }
      try { await setPersistence(auth, browserLocalPersistence); } catch { /* Private browser without storage. */ }
      await auth.authStateReady();
      return { auth, db, signingIn: null };
    })();
  }
  const services = await connection;
  if (!services.auth.currentUser) {
    services.signingIn ||= signInAnonymously(services.auth).finally(() => { services.signingIn = null; });
    await services.signingIn;
  }
  return services;
}

const roomRef = (db, roomId) => {
  requireGame(typeof roomId === "string" && ROOM_ID.test(roomId), "게임 코드를 확인해 주세요.", "invalid-argument");
  return doc(db, "bettingRooms", roomId);
};
const publicRef = (room) => doc(room, "views", "game");
const seatsRef = (room) => collection(room, "seats");
const seatRef = (room, code) => {
  requireGame(typeof code === "string" && TEAM_CODE.test(code), "팀 코드는 숫자 6자리입니다. 기존 게임의 8자리 코드도 사용할 수 있습니다.", "invalid-argument");
  return doc(seatsRef(room), code);
};

export async function command(action, fields) {
  const { db, auth } = await connect();
  const uid = auth.currentUser.uid;
  const room = roomRef(db, fields.roomId);
  const now = Date.now();
  const rulesReject = (error) => ["permission-denied", "not-found"].includes(error.code);
  // Browser writes are enforced by Firestore rules, not by this public source code.
  if (action === "join") {
    const seatId = fields.teamCode;
    try { await updateDoc(seatRef(room, seatId), { members: arrayUnion(uid) }); }
    catch (error) {
      if (rulesReject(error)) throw new Error("게임 코드와 팀 코드를 확인해 주세요. 초기화됐다면 새 팀 코드가 필요합니다.");
      throw error;
    }
    return { seatId };
  }
  if (action === "recover") {
    const recoveryProof = await digest(fields.recoveryKey);
    try { await updateDoc(room, { hosts: arrayUnion(uid), recoveryProof }); }
    catch (error) {
      if (rulesReject(error)) throw new Error("게임 코드와 관리자 복구 코드를 확인해 주세요.");
      throw error;
    }
    return {};
  }
  if (action === "submit") {
    const own = seatRef(room, fields.seatId);
    return runTransaction(db, async (tx) => {
      const [game, seat] = await Promise.all([tx.get(publicRef(room)), tx.get(own)]);
      requireGame(game.exists() && seat.exists(), "팀 코드로 다시 접속해 주세요.");
      tx.update(own, playerMove(seat.data(), game.data().settings, fields, uid));
      return {};
    });
  }
  const recoveryHash = action === "create" ? await digest(fields.recoveryKey) : null;
  return runTransaction(db, async (tx) => {
    const snapshot = await tx.get(room);
    if (action === "create") {
      if (snapshot.exists()) {
        requireGame(snapshot.data().recoveryHash === recoveryHash, "게임 코드가 겹쳤습니다. 새 게임을 만들어 주세요.", "already-exists");
        return { roomId: fields.roomId };
      }
      const game = newGame({ ...fields, recoveryHash }, uid, now);
      tx.set(room, roomRecord(game));
      tx.set(publicRef(room), commonView(game));
      for (const team of game.teams) tx.set(seatRef(room, team.teamCode), seatRecord(game, team));
      return { roomId: fields.roomId };
    }
    requireGame(snapshot.exists(), "게임을 찾을 수 없습니다.", "not-found");
    const control = snapshot.data();
    const needsTeams = !["start", "nextRound"].includes(action);
    const seatSnapshots = needsTeams ? await Promise.all(control.teamCodes.map((code) => tx.get(seatRef(room, code)))) : [];
    const game = needsTeams
      ? hydrateGame(control, new Map(seatSnapshots.map((seat) => [seat.id, seat.data()])))
      : { ...control, teams: [], rounds: {} };
    const changes = applyAction(game, action, fields, uid, now);
    if (!changes.admin) return changes.response;
    tx.update(room, { settings: game.settings, roundResults: game.roundResults,
      ...(action === "reset" ? { teamCodes: game.teams.map((team) => team.teamCode) } : {}) });
    if (changes.common) tx.set(publicRef(room), commonView(game));
    if (action === "reset") for (const code of control.teamCodes) tx.delete(seatRef(room, code));
    for (const id of changes.changedTeams) {
      const team = game.teams[id - 1];
      tx.set(seatRef(room, team.teamCode), seatRecord(game, team));
    }
    return changes.response;
  });
}

function renderAdmin(root, seats) {
  return adminView(hydrateGame(root.data(), new Map(seats.docs.map((seat) => [seat.id, seat.data()]))));
}

export async function readView(roomId, view) {
  const { db } = await connect();
  const room = roomRef(db, roomId);
  if (view === "admin") {
    const [root, seats] = await Promise.all([getDocFromServer(room), getDocsFromServer(seatsRef(room))]);
    if (!root.exists()) throw new Error("게임을 찾을 수 없습니다.");
    return renderAdmin(root, seats);
  }
  const snapshot = await getDocFromServer(view === "game" ? publicRef(room) : seatRef(room, view.slice(5)));
  if (!snapshot.exists()) throw new Error("게임을 찾을 수 없습니다.");
  return view === "game" ? snapshot.data() : playerView(snapshot.data());
}

export async function watchView(roomId, view, receive, fail) {
  const { db } = await connect();
  const room = roomRef(db, roomId);
  if (view === "admin") {
    let root;
    let seats;
    const options = { includeMetadataChanges: true };
    const unsubscribers = [
      onSnapshot(room, options, (snapshot) => { root = snapshot; }, fail),
      onSnapshot(seatsRef(room), options, (snapshot) => { seats = snapshot; }, fail),
      onSnapshotsInSync(db, () => {
        if (!root || !seats || root.metadata.hasPendingWrites || seats.metadata.hasPendingWrites) return;
        if (root.metadata.fromCache || seats.metadata.fromCache) {
          receive(undefined, false);
          return;
        }
        if (!root.exists()) { fail(new Error("게임을 찾을 수 없습니다.")); return; }
        // Reset changes the room and replaces all team documents in one transaction;
        // never render a snapshot that still has old team documents.
        if (root.data().teamCodes.some((code) => !seats.docs.some((seat) => seat.id === code))) return;
        try { receive(renderAdmin(root, seats), true); } catch (error) { fail(error); }
      }),
    ];
    return () => unsubscribers.forEach((stop) => stop());
  }
  const ref = view === "game" ? publicRef(room) : seatRef(room, view.slice(5));
  return onSnapshot(ref, { includeMetadataChanges: true }, (snapshot) => {
    if (snapshot.metadata.hasPendingWrites) return;
    if (snapshot.metadata.fromCache) { receive(undefined, false); return; }
    if (!snapshot.exists()) { fail(new Error(view === "game" ? "게임을 찾을 수 없습니다." : "팀 코드가 변경되었습니다. 새 팀 코드로 접속하세요.")); return; }
    receive(view === "game" ? snapshot.data() : playerView(snapshot.data()), true);
  }, fail);
}
