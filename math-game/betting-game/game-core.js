const ROOM_ID = /^[A-HJ-NP-Z2-9]{10}$/;
const RECOVERY_KEY = /^[A-Za-z0-9_-]{32}$/;
// Six digits for new rooms, eight retained for rooms created before the change.
const TEAM_CODE = /^(?:\d{6}|\d{8})$/;

class GameError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function requireGame(condition, message, code = "failed-precondition") {
  if (!condition) throw new GameError(code, message);
}

async function digest(key) {
  requireGame(typeof key === "string" && RECOVERY_KEY.test(key), "관리자 복구 코드를 확인해 주세요.", "invalid-argument");
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return [...new Uint8Array(bytes)].map((n) => n.toString(16).padStart(2, "0")).join("");
}

function randomTeamCode() {
  const buffer = new Uint32Array(1);
  const possibilities = 1_000_000;
  const limit = Math.floor(2 ** 32 / possibilities) * possibilities;
  do crypto.getRandomValues(buffer); while (buffer[0] >= limit);
  return String(buffer[0] % possibilities).padStart(6, "0");
}
const range = (count) => Array.from({ length: count }, (_, index) => index + 1);
const remaining = (game, team) => range(game.settings.roundCount).filter((n) => !team.usedNumbers.includes(n));
const current = (game) => game.rounds[game.settings.currentRound] || {};

function newTeams(teamCount, oldCodes = []) {
  const codes = new Set(oldCodes);
  return range(teamCount).map((teamId) => {
    let teamCode;
    do teamCode = randomTeamCode(); while (codes.has(teamCode));
    codes.add(teamCode);
    return { teamId, teamName: `${teamId}팀`, teamCode, members: [], usedNumbers: [], scoreTotal: 0, earned: [] };
  });
}

function newGame({ roomId, name, teamCount, roundCount, recoveryHash }, uid, now) {
  requireGame(ROOM_ID.test(roomId) && typeof recoveryHash === "string" && /^[a-f0-9]{64}$/.test(recoveryHash),
    "게임 코드 형식이 올바르지 않습니다.", "invalid-argument");
  requireGame([teamCount, roundCount].every((n) => Number.isInteger(n) && n >= 2 && n <= 20),
    "팀 수와 라운드 수는 2~20 사이로 입력하세요.", "invalid-argument");
  requireGame(typeof name === "string" && name.length <= 40, "게임 이름은 40자까지 입력할 수 있습니다.", "invalid-argument");
  return {
    settings: { gameId: roomId, name: name.trim() || "배팅 게임", teamCount, roundCount,
      currentRound: 1, status: "created", epoch: 1, createdAt: now, updatedAt: now },
    recoveryHash,
    hosts: [uid],
    teams: newTeams(teamCount),
    rounds: {}, roundResults: [],
  };
}

function teamById(game, teamId) {
  const team = Number.isInteger(teamId) && game.teams[teamId - 1];
  requireGame(team, "팀을 찾을 수 없습니다.", "invalid-argument");
  return team;
}

function requireRound(game, { round, epoch }) {
  requireGame(game.settings.status === "playing" && game.settings.currentRound === round
    && game.settings.epoch === epoch, "진행 중인 라운드가 바뀌었습니다. 최신 화면을 확인하세요.");
}

function saveNumber(game, team, number) {
  requireGame(!current(game)[team.teamId], `${team.teamName}은 이미 이번 라운드에 제출했습니다.`);
  requireGame(Number.isInteger(number) && remaining(game, team).includes(number), "아직 사용하지 않은 숫자를 골라 주세요.");
  (game.rounds[game.settings.currentRound] ||= {})[team.teamId] = { submittedNumber: number, isRevealed: false };
  team.usedNumbers.push(number);
}

function scoreIfReady(game, changedTeams) {
  const round = game.settings.currentRound;
  const entries = Object.entries(current(game));
  if (game.roundResults.some((item) => item.round === round)
    || entries.length !== game.settings.teamCount || entries.some(([, item]) => !item.isRevealed)) return;
  const counts = new Map();
  for (const [, { submittedNumber: n }] of entries) counts.set(n, (counts.get(n) || 0) + 1);
  entries.sort((a, b) => b[1].submittedNumber - a[1].submittedNumber);
  const winner = entries.find(([, item]) => counts.get(item.submittedNumber) === 1);
  const duplicates = [...counts].filter(([, count]) => count > 1).map(([n]) => n).sort((a, b) => b - a);
  const result = { round, winnerTeamId: null, winnerTeamName: "", winningNumber: null,
    resultText: "모든 제출 숫자가 중복되어 점수 획득 팀이 없습니다." };
  if (winner) {
    const team = teamById(game, Number(winner[0]));
    const score = winner[1].submittedNumber;
    team.scoreTotal += score;
    team.earned.push({ score, round });
    changedTeams.add(team.teamId);
    Object.assign(result, { winnerTeamId: team.teamId, winnerTeamName: team.teamName, winningNumber: score,
      resultText: `${team.teamName}이 ${score}점을 획득했습니다.${duplicates.length ? ` 중복으로 무효: ${duplicates.join(", ")}` : ""}` });
  }
  game.roundResults.push(result);
  if (round === game.settings.roundCount) game.settings.status = "finished";
}

function buildRanking(teams) {
  const items = teams.map((team) => ({ ...team, ordered: [...team.earned].sort((a, b) => b.score - a.score) }));
  const compare = (a, b) => {
    if (a.scoreTotal !== b.scoreTotal) return b.scoreTotal - a.scoreTotal;
    for (let i = 0; i < Math.max(a.ordered.length, b.ordered.length); i++) {
      const ap = a.ordered[i] || { score: 0, round: 999 };
      const bp = b.ordered[i] || { score: 0, round: 999 };
      if (ap.score !== bp.score) return bp.score - ap.score;
      if (ap.round !== bp.round) return ap.round - bp.round;
    }
    return 0;
  };
  items.sort((a, b) => compare(a, b) || a.teamId - b.teamId);
  let rank = 0;
  return items.map((team, index) => {
    if (!index || compare(items[index - 1], team)) rank = index + 1;
    return { rank, teamId: team.teamId, teamName: team.teamName, scoreTotal: team.scoreTotal,
      earnedScores: team.earned.map((item) => item.score) };
  });
}

function applyAction(game, action, data, uid, now) {
  const { status, currentRound, roundCount, epoch } = game.settings;
  const changedTeams = new Set();
  const result = { admin: false, common: false, changedTeams, response: {} };

  requireGame(game.hosts.includes(uid), "이 게임의 관리자 권한이 없습니다.", "permission-denied");
  {
    if (action === "start") {
      requireGame(status === "created" && epoch === data.epoch, "이미 게임이 시작되었거나 게임이 초기화되었습니다.");
      game.settings.status = "playing";
    } else if (action === "reset") {
      requireGame(epoch === data.epoch && game.settings.updatedAt === data.updatedAt,
        "게임 상태가 바뀌었습니다. 확인하고 다시 초기화해 주세요.");
      Object.assign(game.settings, { currentRound: 1, status: "created", epoch: epoch + 1 });
      Object.assign(game, { teams: newTeams(game.settings.teamCount, game.teams.map((team) => team.teamCode)), rounds: {}, roundResults: [] });
      for (const team of game.teams) changedTeams.add(team.teamId);
    } else {
      requireRound(game, data);
      if (action === "adminSubmit") {
        const team = teamById(game, data.teamId);
        saveNumber(game, team, data.number);
        changedTeams.add(team.teamId);
      } else if (action === "autoSubmitFinalRound") {
        requireGame(currentRound === roundCount, "마지막 라운드에서만 자동 제출할 수 있습니다.");
        const plans = game.teams.filter((team) => !current(game)[team.teamId]).map((team) => [team, remaining(game, team)]);
        requireGame(plans.every(([, numbers]) => numbers.length === 1), "남은 숫자를 하나로 확정할 수 없는 팀이 있습니다.");
        for (const [team, [number]] of plans) {
          saveNumber(game, team, number);
          changedTeams.add(team.teamId);
        }
        result.response = { count: plans.length };
        if (!plans.length) return result;
      } else if (action === "reveal" || action === "revealAll") {
        const roundEntries = current(game);
        if (action === "reveal") {
          const team = teamById(game, data.teamId);
          requireGame(roundEntries[team.teamId], "아직 제출하지 않은 팀입니다.");
          if (roundEntries[team.teamId].isRevealed) return result;
          roundEntries[team.teamId].isRevealed = true;
          changedTeams.add(team.teamId);
        } else {
          requireGame(Object.keys(roundEntries).length === game.settings.teamCount, "모든 팀이 제출한 뒤 공개할 수 있습니다.");
          for (const [teamId, item] of Object.entries(roundEntries)) {
            if (!item.isRevealed) changedTeams.add(Number(teamId));
            item.isRevealed = true;
          }
        }
        scoreIfReady(game, changedTeams);
      } else if (action === "nextRound") {
        requireGame(game.roundResults.some((item) => item.round === currentRound) && currentRound < roundCount,
          "현재 라운드의 공개와 점수 계산을 먼저 끝내 주세요.");
        game.settings.currentRound++;
      } else {
        throw new GameError("invalid-argument", "지원하지 않는 요청입니다.");
      }
    }
  }
  game.settings.updatedAt = Math.max(now, game.settings.updatedAt + 1);
  result.admin = true;
  result.common = status !== game.settings.status || currentRound !== game.settings.currentRound || epoch !== game.settings.epoch;
  return result;
}

function commonView(game) {
  const { updatedAt, ...settings } = game.settings;
  return { settings, ranking: settings.status === "finished" ? buildRanking(game.teams) : [] };
}

function adminView(game) {
  return {
    ...commonView(game),
    settings: game.settings,
    teams: game.teams.map(({ teamId, teamName, teamCode, scoreTotal }) => {
      const revealed = Object.values(game.rounds).map((row) => row[teamId]).filter((item) => item?.isRevealed);
      const used = new Set(revealed.map((item) => item.submittedNumber));
      return { teamId, teamName, teamCode, scoreTotal, remainingNumbers: range(game.settings.roundCount).filter((n) => !used.has(n)) };
    }),
    submissions: Object.entries(game.rounds).flatMap(([round, row]) => Object.entries(row).map(([teamId, record]) =>
      ({ round: Number(round), teamId: Number(teamId), isRevealed: record.isRevealed,
        submittedNumber: record.isRevealed ? record.submittedNumber : null }))),
    roundResults: game.roundResults,
  };
}

// Each seat is its own Firestore document. A player's transaction cannot
// write another team's seat or the room's settings and result documents.
function seatRecord(game, team) {
  const { teamId, teamName, members, usedNumbers, scoreTotal, earned } = team;
  return { teamId, teamName, epoch: game.settings.epoch, roundCount: game.settings.roundCount,
    members, usedNumbers, scoreTotal, earned,
    moves: usedNumbers.map((_, index) => game.rounds[index + 1][teamId]) };
}

function roomRecord(game) {
  const { settings, hosts, recoveryHash, roundResults } = game;
  return { settings, hosts, recoveryHash, roundResults, teamCodes: game.teams.map((team) => team.teamCode) };
}

function hydrateGame(room, seats) {
  const rounds = {};
  const teams = room.teamCodes.map((teamCode, index) => {
    const seat = seats.get(teamCode);
    requireGame(seat && seat.epoch === room.settings.epoch && seat.teamId === index + 1,
      "게임 상태가 바뀌었습니다. 잠시 뒤 다시 확인해 주세요.");
    seat.moves.forEach((move, i) => { (rounds[i + 1] ||= {})[seat.teamId] = move; });
    const { teamId, teamName, members, usedNumbers, scoreTotal, earned } = seat;
    return { teamCode, teamId, teamName, members, usedNumbers, scoreTotal, earned };
  });
  return { ...room, teams, rounds };
}

function playerView(seat) {
  const { epoch, teamId, teamName, usedNumbers, roundCount, scoreTotal, moves } = seat;
  return {
    epoch,
    team: { teamId, teamName, usedNumbers, scoreTotal, remainingNumbers: range(roundCount).filter((n) => !usedNumbers.includes(n)) },
    lastSubmission: moves.length ? { round: moves.length, submittedNumber: moves.at(-1).submittedNumber } : null,
  };
}

function playerMove(seat, settings, data, uid) {
  requireGame(seat.members.includes(uid), "팀 코드로 다시 접속해 주세요.", "permission-denied");
  requireGame(seat.teamId === data.teamId && seat.epoch === data.epoch, "팀 접속 상태가 바뀌었습니다. 다시 접속해 주세요.");
  requireRound({ settings }, data);
  requireGame(seat.moves.length === data.round - 1, "이미 이번 라운드에 제출했습니다.");
  const { number } = data;
  requireGame(Number.isInteger(number) && number >= 1 && number <= settings.roundCount && !seat.usedNumbers.includes(number),
    "아직 사용하지 않은 숫자를 골라 주세요.");
  return { moves: [...seat.moves, { submittedNumber: number, isRevealed: false }], usedNumbers: [...seat.usedNumbers, number] };
}

export { ROOM_ID, TEAM_CODE, GameError, digest, newGame, applyAction, adminView, commonView, playerView, playerMove,
  requireGame, seatRecord, roomRecord, hydrateGame };
