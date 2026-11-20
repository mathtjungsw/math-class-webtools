import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomInt } from "node:crypto";
import { TEAM_CODE, digest, newGame, applyAction, roomRecord, seatRecord, commonView, adminView, hydrateGame, playerMove }
  from "../game-core.js";

// Tests can only reach the demo project on loopback.
const project = "demo-betting-game";
const authUrl = "http://127.0.0.1:9398/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-betting-game";
const database = `projects/${project}/databases/(default)/documents`;
const firestore = `http://127.0.0.1:8398/v1/${database}`;
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newId = () => Array.from({ length: 10 }, () => alphabet[randomInt(32)]).join("");
const key = () => randomBytes(24).toString("base64url");

async function request(url, { token, body } = {}) {
  const response = await fetch(url, { method: body ? "POST" : "GET",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) });
  return { status: response.status, json: await response.json() };
}
function check(response, expected = 200) {
  assert.equal(response.status, expected, JSON.stringify(response.json));
  return response.json;
}
async function signIn() {
  const { idToken: token, localId: uid } = check(await request(authUrl, { body: { returnSecureToken: true } }));
  return { token, uid };
}
function encode(value) {
  if (value === null) return { nullValue: null };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
  if (typeof value === "object") return { mapValue: { fields: fields(value) } };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (Number.isInteger(value)) return { integerValue: String(value) };
  throw new Error("Invalid Firestore fixture");
}
const fields = (data) => Object.fromEntries(Object.entries(data).map(([key, value]) => [key, encode(value)]));
function decode(value) {
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decode);
  if ("mapValue" in value) return unwrap(value.mapValue);
  if ("integerValue" in value) return Number(value.integerValue);
  return Object.values(value)[0];
}
const unwrap = (doc) => Object.fromEntries(Object.entries(doc.fields || {}).map(([key, value]) => [key, decode(value)]));
const document = (path) => `${database}/${path}`;
const write = (path, data) => ({ update: { name: document(path), fields: fields(data) } });
const update = (path, data) => ({ ...write(path, data), updateMask: { fieldPaths: Object.keys(data) }, currentDocument: { exists: true } });
const get = (user, path) => request(`${firestore}/${path}`, user || {});
const commit = (user, ...writes) => request(`${firestore}:commit`, { token: user.token, body: { writes } });
const append = (path, field, uid) => ({ transform: { document: document(path), fieldTransforms: [
  { fieldPath: field, appendMissingElements: { values: [encode(uid)] } },
] }, currentDocument: { exists: true } });
const now = () => Date.now();

async function roomFor(teacher, name, teamCount = 3, legacy = false) {
  const roomId = newId();
  const recoveryKey = key();
  const recoveryHash = await digest(recoveryKey);
  const game = newGame({ roomId, name, teamCount, roundCount: 2, recoveryHash }, teacher.uid, now());
  assert.equal(new Set(game.teams.map((team) => team.teamCode)).size, teamCount);
  assert.ok(game.teams.every((team) => /^\d{6}$/.test(team.teamCode)));
  if (legacy) game.teams.forEach((team) => { team.teamCode = String(team.teamId).padStart(8, "0"); });
  const room = `bettingRooms/${roomId}`;
  const shared = `${room}/views/game`;
  const seat = (code) => `${room}/seats/${code}`;
  const codes = roomRecord(game).teamCodes;
  check(await get(teacher, room), 404);
  check(await commit(teacher, write(room, roomRecord(game)), write(shared, commonView(game)),
    ...game.teams.map((team) => write(seat(team.teamCode), seatRecord(game, team)))));
  return { room, shared, seat, codes, recoveryHash };
}

async function snapshot(host, room) {
  const saved = unwrap(check(await get(host, room.room)));
  const seats = await Promise.all(saved.teamCodes.map(async (code) => [code, unwrap(check(await get(host, room.seat(code))))]));
  return hydrateGame(saved, new Map(seats));
}
async function moderate(host, room, action, params = {}) {
  const game = await snapshot(host, room);
  const { currentRound: round, epoch, updatedAt } = game.settings;
  const prior = roomRecord(game).teamCodes;
  const changes = applyAction(game, action, { round, epoch, updatedAt, ...params }, host.uid, now());
  const writes = [update(room.room, { settings: game.settings, roundResults: game.roundResults,
    ...(action === "reset" ? { teamCodes: roomRecord(game).teamCodes } : {}) })];
  if (changes.common) writes.push(write(room.shared, commonView(game)));
  if (action === "reset") for (const code of prior) writes.push({ delete: document(room.seat(code)) });
  for (const id of changes.changedTeams) {
    const team = game.teams[id - 1];
    writes.push(write(room.seat(team.teamCode), seatRecord(game, team)));
  }
  check(await commit(host, ...writes));
  return { game, response: changes.response };
}

test("Spark rules enforce seats, protect room controls, and allow 20-team create and reset", { timeout: 120000 }, async () => {
  const [hostA, hostB, p1, p2, recovery, stranger] = await Promise.all(Array.from({ length: 6 }, signIn));
  const [a, b] = await Promise.all([roomFor(hostA, "1반"), roomFor(hostB, "2반", 20)]);
  assert.equal(roomRecord(await snapshot(hostB, b)).teamCodes.length, 20);
  check(await get(hostB, a.room), 403);
  check(await get(hostB, a.seat(a.codes[0])), 403);
  check(await get(p1, "bettingRooms"), 403);
  check(await get(p1, `${a.room}/seats`), 403);
  check(await get(hostA, `${a.room}/seats`));
  check(await get(null, a.shared), 403);
  assert.equal(unwrap(check(await get(stranger, a.shared))).settings.name, "1반");
  check(await commit(p1, update(a.room, { recoveryProof: "f".repeat(64), hosts: [hostA.uid, p1.uid] })), 403);
  check(await commit(p1, update(a.shared, { ranking: [] })), 403);
  check(await commit(p1, update(a.seat(a.codes[0]), { members: [stranger.uid] })), 403);
  check(await commit(p1, append(a.seat(a.codes[0]), "members", p1.uid)));
  check(await commit(p2, append(a.seat(a.codes[1]), "members", p2.uid)));
  check(await get(p1, a.seat(a.codes[0])));
  check(await get(p1, a.seat(a.codes[1])), 403);
  check(await get(p1, a.room), 403);
  check(await commit(p1, update(a.seat(a.codes[0]), { scoreTotal: 9 })), 403);
  const own1 = unwrap(check(await get(p1, a.seat(a.codes[0]))));
  const own2 = unwrap(check(await get(p2, a.seat(a.codes[1]))));
  const move = (number, revealed = false) => ({ moves: [{ submittedNumber: number, isRevealed: revealed }], usedNumbers: [number] });
  check(await commit(p1, update(a.seat(a.codes[0]), move(2))), 403); // Before game starts.
  const first = (await moderate(hostA, a, "start")).game.settings;
  check(await commit(p1, update(a.seat(a.codes[1]), move(2))), 403);
  check(await commit(p1, update(a.seat(a.codes[0]), move(3))), 403);
  check(await commit(p1, update(a.seat(a.codes[0]), move(2, true))), 403);
  const submit1 = playerMove(own1, first, { teamId: 1, epoch: 1, round: 1, number: 2 }, p1.uid);
  const submit2 = playerMove(own2, first, { teamId: 2, epoch: 1, round: 1, number: 2 }, p2.uid);
  const simultaneous = await Promise.all([
    commit(p1, update(a.seat(a.codes[0]), submit1)),
    commit(p2, update(a.seat(a.codes[1]), submit2)),
  ]);
  simultaneous.forEach((item) => check(item));
  check(await commit(p1, update(a.seat(a.codes[0]), move(1))), 403); // No replacing a submission.
  await moderate(hostA, a, "adminSubmit", { teamId: 3, number: 1 });
  assert.ok(adminView(await snapshot(hostA, a)).submissions.every((item) => item.submittedNumber === null));
  assert.equal((await snapshot(hostB, b)).settings.status, "created");

  check(await commit(recovery, update(a.room, { recoveryProof: a.recoveryHash, hosts: [hostA.uid, recovery.uid] })));
  await moderate(recovery, a, "revealAll");
  await moderate(recovery, a, "nextRound");
  check(await commit(p1, update(a.seat(a.codes[0]), { usedNumbers: [2, 2], moves: [...submit1.moves, submit1.moves[0]] })), 403);
  assert.equal((await moderate(recovery, a, "autoSubmitFinalRound")).response.count, 3);
  await moderate(recovery, a, "revealAll");
  const end = unwrap(check(await get(p1, a.shared)));
  assert.equal(end.settings.status, "finished");
  assert.deepEqual(end.ranking.map((row) => [row.teamId, row.rank, row.scoreTotal]), [[3, 1, 3], [1, 2, 0], [2, 2, 0]]);

  const reset = (await moderate(hostB, b, "reset")).game;
  assert.equal(reset.teams.length, 20);
  assert.ok(reset.teams.every((team) => /^\d{6}$/.test(team.teamCode) && !b.codes.includes(team.teamCode)));
  assert.equal((await snapshot(hostB, b)).settings.epoch, 2);
  check(await get(hostB, b.seat(b.codes[0])), 404);
  assert.equal((await snapshot(hostA, a)).settings.status, "finished");
});

test("six-digit join and eight-digit room compatibility, including leading zeros", { timeout: 30000 }, async () => {
  const [teacher, student] = await Promise.all([signIn(), signIn()]);
  const legacy = await roomFor(teacher, "기존 게임", 2, true);
  assert.equal(legacy.codes[0], "00000001");
  assert.ok(TEAM_CODE.test(legacy.codes[0]) && TEAM_CODE.test("000001"));
  assert.ok(!TEAM_CODE.test("0000001"));
  check(await commit(student, append(legacy.seat(legacy.codes[0]), "members", student.uid)));
  assert.equal(unwrap(check(await get(student, legacy.seat(legacy.codes[0])))).teamId, 1);
  const reset = (await moderate(teacher, legacy, "reset")).game;
  assert.ok(reset.teams.every((team) => /^\d{6}$/.test(team.teamCode)));
  check(await commit(student, append(legacy.seat(reset.teams[0].teamCode), "members", student.uid)));
  assert.equal(unwrap(check(await get(student, legacy.seat(reset.teams[0].teamCode)))).teamId, 1);
});
