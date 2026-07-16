(function () {
  "use strict";

  var R = window.RecommenderLab;
  var $ = function (id) { return document.getElementById(id); };
  var presets = {
    movies: {
      users: ["가은", "나래", "다온", "라온", "마루", "보민"],
      items: ["별빛 항해", "코딩 탐정", "초록 행성", "시간의 문", "작은 용기", "리듬 도시", "고요한 바다"],
      ratings: [
        [5, 4, null, 1, 2, null, 4],
        [4, 5, 4, 1, null, 2, 5],
        [1, 2, 1, 5, 4, 5, null],
        [null, 1, 2, 4, 5, 4, 2],
        [5, 4, 5, null, 1, 2, 4],
        [2, null, 1, 5, 4, 4, 1]
      ]
    },
    books: {
      users: ["구름", "노을", "단비", "모래", "새봄", "하람"],
      items: ["수의 정원", "우주 우체국", "마음 지도", "암호의 숲", "느린 여행", "파도 도서관", "내일의 로봇"],
      ratings: [
        [5, 4, 2, 5, null, 2, 4],
        [4, 5, null, 4, 1, 2, 5],
        [2, 1, 5, null, 5, 4, 1],
        [1, 2, 4, 2, 5, 5, null],
        [5, null, 2, 4, 2, 1, 4],
        [null, 2, 5, 1, 4, 5, 2]
      ]
    },
    music: {
      users: ["가람", "다솜", "로하", "미르", "아라", "이든"],
      items: ["새벽 산책", "푸른 박자", "종이비행", "느린 별", "주황 파도", "도시의 밤", "봄의 계단"],
      ratings: [
        [5, 4, 4, 2, null, 1, 5],
        [4, 5, null, 1, 2, 2, 4],
        [1, 2, 2, 5, 5, 4, null],
        [2, null, 1, 4, 5, 5, 2],
        [5, 4, 5, null, 2, 1, 4],
        [1, 2, 1, 5, 4, null, 2]
      ]
    }
  };

  var state = {
    dataset: copyDataset(presets.movies),
    ratingTool: "target",
    selected: { userIndex: 0, itemIndex: 2 },
    competition: null,
    teams: [null, null, null, null]
  };

  function copyDataset(dataset) {
    return { users: dataset.users.slice(), items: dataset.items.slice(), ratings: R.cloneMatrix(dataset.ratings) };
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }

  function format(value, digits) {
    return Number.isFinite(value) ? Number(value).toFixed(digits === undefined ? 3 : digits) : "계산 불가";
  }

  function percent(value, digits) {
    return Number.isFinite(value) ? (value * 100).toFixed(digits === undefined ? 1 : digits) + "%" : "—";
  }

  function setStatus(message, type) {
    $("statusMessage").textContent = message;
    $("statusMessage").className = "status" + (type ? " is-" + type : "");
  }

  function currentBasis() {
    var checked = document.querySelector('input[name="basis"]:checked');
    return checked ? checked.value : "user";
  }

  function currentOptions(overrideBasis) {
    return {
      basis: overrideBasis || currentBasis(),
      method: $("similarityMethod").value,
      k: Number($("neighborK").value),
      minCommon: Number($("minCommon").value),
      popularityWeight: Number($("popularityWeight").value)
    };
  }

  function observedStats() {
    var observed = 0;
    state.dataset.ratings.forEach(function (row) { row.forEach(function (value) { if (Number.isFinite(value)) observed += 1; }); });
    var total = state.dataset.users.length * state.dataset.items.length;
    return { observed: observed, total: total, density: total ? observed / total : 0 };
  }

  function selectionIsValid() {
    return state.selected && state.dataset.ratings[state.selected.userIndex] && state.dataset.ratings[state.selected.userIndex][state.selected.itemIndex] === null;
  }

  function selectedLabel() {
    if (!selectionIsValid()) return "선택 전";
    return state.dataset.users[state.selected.userIndex] + " × " + state.dataset.items[state.selected.itemIndex];
  }

  function renderAll() {
    renderControls();
    renderMatrix();
    renderPrediction();
    renderRanking();
    renderCompetition();
    renderTeams();
  }

  function renderControls() {
    $("kOutput").textContent = $("neighborK").value;
    $("minCommonOutput").textContent = $("minCommon").value;
    $("popularityOutput").textContent = Number($("popularityWeight").value).toFixed(1);
    var method = $("similarityMethod").value;
    var notes = {
      agreement: "평점 차이의 평균을 0~1 일치도로 바꿉니다. 차이가 0이면 1, 평균 차이가 4이면 0입니다.",
      cosine: "공통 평점을 원점에서 시작하는 벡터로 보고 끼인각의 코사인을 구합니다. 평점의 크기가 모두 양수라 높은 값이 자주 나올 수 있습니다.",
      pearson: "각 벡터에서 공통 평점 평균을 뺀 뒤 함께 오르내리는 정도를 비교합니다. 모두 같은 평점이면 분모가 0이라 계산할 수 없습니다."
    };
    $("controlNote").textContent = notes[method];
  }

  function renderMatrix() {
    $("matrixHead").innerHTML = "<tr><th scope=\"col\">사용자 ↓ / 콘텐츠 →</th>" + state.dataset.items.map(function (item) { return "<th scope=\"col\">" + escapeHtml(item) + "</th>"; }).join("") + "</tr>";
    var answerKeys = new Set();
    if (state.competition) state.competition.answers.forEach(function (answer) { answerKeys.add(answer.userIndex + ":" + answer.itemIndex); });
    $("matrixBody").innerHTML = state.dataset.users.map(function (user, userIndex) {
      var cells = state.dataset.items.map(function (item, itemIndex) {
        var rating = state.dataset.ratings[userIndex][itemIndex];
        var selected = selectionIsValid() && state.selected.userIndex === userIndex && state.selected.itemIndex === itemIndex;
        var hiddenAnswer = state.competition && !state.competition.revealed && answerKeys.has(userIndex + ":" + itemIndex);
        var classes = "rating-cell" + (selected ? " is-selected" : "") + (hiddenAnswer ? " is-hidden-answer" : "");
        var label = user + "의 " + item + " 평점, " + (rating === null ? "빈칸" : rating + "점");
        return "<td><button type=\"button\" class=\"" + classes + "\" data-user=\"" + userIndex + "\" data-item=\"" + itemIndex + "\" data-rating=\"" + (rating === null ? "" : rating) + "\" aria-label=\"" + escapeHtml(label) + "\">" + (rating === null ? "·" : rating + "★") + "</button></td>";
      }).join("");
      return "<tr><th scope=\"row\">" + escapeHtml(user) + "</th>" + cells + "</tr>";
    }).join("");
    var stats = observedStats();
    $("observedCount").textContent = stats.observed + " / " + stats.total;
    $("densityValue").textContent = percent(stats.density, 1);
    $("selectedCellLabel").textContent = selectedLabel();
  }

  function renderPrediction() {
    if (!selectionIsValid()) {
      $("targetBadge").textContent = "빈칸을 선택하세요";
      $("selectedPrediction").textContent = "—";
      $("userCompareCard").querySelector("strong").textContent = "—";
      $("itemCompareCard").querySelector("strong").textContent = "—";
      ["commonContent", "vectorContent", "similarityContent", "neighborContent", "weightedContent"].forEach(function (id) { $(id).innerHTML = '<p class="empty-copy">예측할 빈칸을 선택하면 계산 과정이 표시됩니다.</p>'; });
      $("similarityMap").innerHTML = '<p class="empty-copy">빈칸을 선택하면 유사도가 높은 후보부터 나타납니다.</p>';
      return;
    }
    var userIndex = state.selected.userIndex;
    var itemIndex = state.selected.itemIndex;
    var options = currentOptions();
    var current = R.predictRating(state.dataset.ratings, userIndex, itemIndex, options);
    var userPrediction = R.predictRating(state.dataset.ratings, userIndex, itemIndex, currentOptions("user"));
    var itemPrediction = R.predictRating(state.dataset.ratings, userIndex, itemIndex, currentOptions("item"));
    $("targetBadge").textContent = selectedLabel();
    $("selectedPrediction").textContent = format(current.prediction, 2) + "점" + (current.usedFallback ? "*" : "");
    renderCompareCard($("userCompareCard"), userPrediction);
    renderCompareCard($("itemCompareCard"), itemPrediction);
    renderCommonStep(current);
    renderVectorStep(current);
    renderSimilarityStep(current);
    renderNeighborStep(current);
    renderWeightedStep(current);
    renderSimilarityMap(current);
  }

  function renderCompareCard(card, prediction) {
    card.querySelector("strong").textContent = format(prediction.prediction, 2) + "점" + (prediction.usedFallback ? " · 평균 대체" : "");
    card.querySelector("small").textContent = prediction.neighbors.length + "개 이웃 · " + (prediction.basis === "user" ? "비슷한 사람의 평점" : "비슷한 콘텐츠의 평점");
  }

  function candidateName(candidate, basis) {
    return basis === "user" ? state.dataset.users[candidate.index] : state.dataset.items[candidate.index];
  }

  function commonAxisName(index, basis) {
    return basis === "user" ? state.dataset.items[index] : state.dataset.users[index];
  }

  function renderCommonStep(prediction) {
    if (!prediction.candidates.length) {
      $("commonContent").innerHTML = '<p class="fallback-note">대상 평점을 가진 비교 후보가 없습니다. 신규 사용자·콘텐츠 또는 매우 희소한 행렬일 수 있습니다.</p>';
      return;
    }
    $("commonContent").innerHTML = '<div class="candidate-list">' + prediction.candidates.map(function (candidate) {
      var common = candidate.details.common;
      var labels = common.map(function (pair) { return commonAxisName(pair.index, prediction.basis); });
      return '<div class="candidate-row' + (candidate.eligible ? '' : ' is-ineligible') + '"><strong>' + escapeHtml(candidateName(candidate, prediction.basis)) + '</strong><small>공통 ' + common.length + '개 · ' + (labels.length ? escapeHtml(labels.join(', ')) : '없음') + '</small><code>' + (candidate.details.usable ? 's=' + format(candidate.similarity, 3) : escapeHtml(candidate.details.reason)) + '</code></div>';
    }).join("") + "</div>";
  }

  function nearestCandidate(prediction) {
    return prediction.candidates.find(function (candidate) { return candidate.eligible; }) || prediction.candidates[0] || null;
  }

  function renderVectorStep(prediction) {
    var nearest = nearestCandidate(prediction);
    if (!nearest || !nearest.details.common.length) {
      $("vectorContent").innerHTML = '<p class="fallback-note">나란히 놓을 공통 평점 벡터가 없습니다.</p>';
      return;
    }
    var firstLabel = prediction.basis === "user" ? state.dataset.users[prediction.targetUser] : state.dataset.items[prediction.targetItem];
    var secondLabel = candidateName(nearest, prediction.basis);
    var commonLabels = nearest.details.common.map(function (pair) { return commonAxisName(pair.index, prediction.basis); });
    var firstVector = nearest.details.common.map(function (pair) { return '<span class="vector-token">' + pair.first + '</span>'; }).join("");
    var secondVector = nearest.details.common.map(function (pair) { return '<span class="vector-token second">' + pair.second + '</span>'; }).join("");
    $("vectorContent").innerHTML = '<div class="vector-list"><p><b>좌표:</b> ' + escapeHtml(commonLabels.join(' · ')) + '</p><div class="vector-pair"><strong>' + escapeHtml(firstLabel) + '</strong>' + firstVector + '</div><div class="vector-pair"><strong>' + escapeHtml(secondLabel) + '</strong>' + secondVector + '</div></div>';
  }

  function renderSimilarityStep(prediction) {
    var nearest = nearestCandidate(prediction);
    if (!nearest || !nearest.details.usable) {
      $("similarityContent").innerHTML = '<p class="fallback-note">' + escapeHtml(nearest ? nearest.details.reason : "비교 후보가 없습니다.") + '</p>';
      return;
    }
    var details = nearest.details;
    var headers;
    var rows;
    var formula;
    if (details.method === "agreement") {
      formula = '일치도 = 1 − (평균 |a−b| ÷ 4) = 1 − (' + format(details.distance, 3) + ' ÷ 4) = <strong>' + format(details.value, 3) + '</strong>';
      headers = ["a", "b", "|a−b|", "칸별 일치도"];
      rows = details.terms.map(function (term) { return [term.first, term.second, term.difference, format(term.match, 3)]; });
    } else if (details.method === "cosine") {
      formula = 'cos θ = (a·b) ÷ (|a||b|) = ' + format(details.dot, 3) + ' ÷ ' + format(details.denominator, 3) + ' = <strong>' + format(details.value, 3) + '</strong>';
      headers = ["a", "b", "a×b", "a²", "b²"];
      rows = details.terms.map(function (term) { return [term.first, term.second, term.product, term.firstSquare, term.secondSquare]; });
    } else {
      formula = 'r = Σ(a−ā)(b−b̄) ÷ √[Σ(a−ā)²Σ(b−b̄)²] = ' + format(details.numerator, 3) + ' ÷ ' + format(details.denominator, 3) + ' = <strong>' + format(details.value, 3) + '</strong><br>ā=' + format(details.firstMean, 2) + ', b̄=' + format(details.secondMean, 2);
      headers = ["a", "b", "a−ā", "b−b̄", "곱"];
      rows = details.terms.map(function (term) { return [term.first, term.second, format(term.firstDeviation, 2), format(term.secondDeviation, 2), format(term.product, 3)]; });
    }
    var table = '<table class="term-table"><thead><tr>' + headers.map(function (header) { return '<th>' + header + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.map(function (row) { return '<tr>' + row.map(function (cell) { return '<td>' + cell + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
    $("similarityContent").innerHTML = '<div class="formula-box">' + formula + '</div>' + table;
  }

  function renderNeighborStep(prediction) {
    if (!prediction.neighbors.length) {
      $("neighborContent").innerHTML = '<p class="fallback-note">양의 유사도와 최소 공통 평가 조건을 함께 만족하는 이웃이 없습니다. k를 바꿔도 후보가 생기지 않으면 유사도 방법 또는 최소 공통 수를 확인하세요.</p>';
      return;
    }
    $("neighborContent").innerHTML = '<div class="neighbor-list">' + prediction.neighbors.map(function (neighbor, index) {
      return '<div class="neighbor-row"><strong>' + (index + 1) + '위 · ' + escapeHtml(candidateName(neighbor, prediction.basis)) + '</strong><small>대상 칸에 제공하는 평점 ' + neighbor.rating + '점 · 공통 ' + neighbor.details.common.length + '개</small><code>s=' + format(neighbor.similarity, 3) + '</code></div>';
    }).join('') + '</div>';
  }

  function renderWeightedStep(prediction) {
    if (prediction.usedFallback) {
      var baseline = prediction.baseline;
      $("weightedContent").innerHTML = '<div class="weighted-equation"><code>사용자 평균 ' + format(baseline.userMean, 2) + '<br>콘텐츠 평균 ' + format(baseline.itemMean, 2) + '<br>전체 평균 ' + format(baseline.globalMean, 2) + '<br>가능한 평균들의 평균 = ' + format(prediction.prediction, 2) + '</code><strong class="prediction-number">' + format(prediction.prediction, 2) + '점</strong></div><p class="fallback-note">' + escapeHtml(prediction.reason) + ' 이 값은 협업 필터링 이웃의 결과가 아니라 안전한 기준값입니다.</p>';
      return;
    }
    var termText = prediction.terms.map(function (term) {
      if (prediction.method === "pearson") return format(term.similarity, 3) + '×(' + term.rating + '−' + format(term.center, 2) + ')';
      return format(term.similarity, 3) + '×' + term.rating;
    }).join(' + ');
    var equation;
    if (prediction.method === "pearson") equation = '기준 평균 ' + format(prediction.base, 3) + ' + [' + termText + '] ÷ ' + format(prediction.denominator, 3) + '<br>= ' + format(prediction.rawPrediction, 3);
    else equation = '[' + termText + '] ÷ ' + format(prediction.denominator, 3) + '<br>= ' + format(prediction.rawPrediction, 3);
    $("weightedContent").innerHTML = '<div class="weighted-equation"><code>' + equation + '</code><strong class="prediction-number">' + format(prediction.prediction, 2) + '점</strong></div>' + (prediction.reason ? '<p class="fallback-note">' + escapeHtml(prediction.reason) + '</p>' : '');
  }

  function renderSimilarityMap(prediction) {
    if (!prediction.candidates.length) {
      $("similarityMap").innerHTML = '<p class="empty-copy">표시할 비교 후보가 없습니다.</p>';
      return;
    }
    $("similarityMap").innerHTML = prediction.candidates.map(function (candidate) {
      var width = candidate.details.usable ? Math.max(0, candidate.similarity) * 100 : 0;
      return '<div class="map-row' + (candidate.eligible ? '' : ' is-unused') + '"><span title="' + escapeHtml(candidateName(candidate, prediction.basis)) + '">' + escapeHtml(candidateName(candidate, prediction.basis)) + '</span><div class="map-track"><i class="map-fill" style="width:' + width.toFixed(1) + '%"></i></div><code>' + (candidate.details.usable ? format(candidate.similarity, 2) : '—') + '</code></div>';
    }).join('');
    $("similarityMap").setAttribute("aria-label", (prediction.basis === "user" ? "사용자" : "콘텐츠") + " 후보의 유사도. " + prediction.candidates.map(function (candidate) { return candidateName(candidate, prediction.basis) + " " + (candidate.details.usable ? format(candidate.similarity, 2) : "계산 불가"); }).join(", "));
  }

  function syncRankingUsers(preferred) {
    var current = preferred === undefined ? Number($("rankingUserSelect").value) : preferred;
    if (!Number.isInteger(current) || current < 0 || current >= state.dataset.users.length) current = 0;
    $("rankingUserSelect").innerHTML = state.dataset.users.map(function (name, index) { return '<option value="' + index + '"' + (index === current ? ' selected' : '') + '>' + escapeHtml(name) + '</option>'; }).join('');
  }

  function renderRanking() {
    if (!$("rankingUserSelect").options.length || $("rankingUserSelect").options.length !== state.dataset.users.length) syncRankingUsers(selectionIsValid() ? state.selected.userIndex : 0);
    var userIndex = Number($("rankingUserSelect").value) || 0;
    var recommendations = R.recommendForUser(state.dataset.ratings, userIndex, currentOptions());
    if (!recommendations.length) {
      $("rankingList").innerHTML = '<p class="empty-copy">이 사용자는 모든 콘텐츠를 평가했습니다.</p>';
      $("biasMeter").textContent = "추천할 빈칸이 없습니다.";
      return;
    }
    $("rankingList").innerHTML = recommendations.slice(0, 6).map(function (recommendation, index) {
      var width = R.clamp(recommendation.prediction / 5 * 100, 0, 100);
      return '<div class="ranking-row"><span class="rank-number">' + (index + 1) + '</span><strong>' + escapeHtml(state.dataset.items[recommendation.itemIndex]) + '</strong><div class="ranking-bar"><i style="width:' + width.toFixed(1) + '%"></i></div><code>' + format(recommendation.score, 2) + '</code><small class="ranking-detail">예상 ' + format(recommendation.prediction, 2) + '점 · 평점 수 ' + recommendation.popularityCount + ' · 인기 보너스 ' + format(recommendation.score - recommendation.prediction, 2) + (recommendation.detail.usedFallback ? ' · 평균 대체' : '') + '</small></div>';
    }).join('');
    var top = recommendations.slice(0, Math.min(3, recommendations.length));
    var maxPopularity = Math.max.apply(null, recommendations.map(function (item) { return item.popularityCount; }).concat([1]));
    var popularTop = top.filter(function (item) { return item.popularityCount >= maxPopularity * .8; }).length;
    var weight = Number($("popularityWeight").value);
    $("biasMeter").textContent = weight === 0 ? "인기 가중치가 0이므로 예상 평점만으로 정렬했습니다. 위의 ‘평점 수’도 함께 보며 데이터가 많은 항목이 유리한지 확인하세요." : "인기 가중치 " + weight.toFixed(1) + "에서 상위 " + top.length + "개 중 " + popularTop + "개가 최다 평점 수의 80% 이상입니다. 가중치를 0으로 바꾸어 순위 다양성을 비교해 보세요.";
  }

  function chooseHoldouts(dataset, count) {
    var rowCounts = dataset.ratings.map(function (row) { return row.filter(Number.isFinite).length; });
    var columnCounts = dataset.items.map(function (_, itemIndex) { return R.columnValues(dataset.ratings, itemIndex).length; });
    var candidates = [];
    dataset.ratings.forEach(function (row, userIndex) {
      row.forEach(function (rating, itemIndex) {
        if (Number.isFinite(rating) && rowCounts[userIndex] >= 3 && columnCounts[itemIndex] >= 3) candidates.push({ userIndex: userIndex, itemIndex: itemIndex, key: (userIndex * 17 + itemIndex * 11) % 31 });
      });
    });
    candidates.sort(function (a, b) { return a.key - b.key || a.userIndex - b.userIndex || a.itemIndex - b.itemIndex; });
    var chosen = [];
    var usedRows = new Set();
    candidates.forEach(function (cell) {
      if (chosen.length >= count) return;
      if (!usedRows.has(cell.userIndex)) { chosen.push(cell); usedRows.add(cell.userIndex); }
    });
    candidates.forEach(function (cell) {
      if (chosen.length >= count) return;
      if (!chosen.some(function (picked) { return picked.userIndex === cell.userIndex && picked.itemIndex === cell.itemIndex; })) chosen.push(cell);
    });
    return chosen.slice(0, count);
  }

  function startCompetition() {
    if (state.competition) restoreCompetition(false);
    var count = Number($("holdoutCount").value) || 4;
    var cells = chooseHoldouts(state.dataset, count);
    if (!cells.length) { setStatus("숨길 수 있는 평점이 부족합니다. 관측 평점이 더 많은 프리셋을 불러오세요.", "error"); return; }
    var source = copyDataset(state.dataset);
    var hidden = R.hideRatings(source.ratings, cells);
    state.dataset.ratings = hidden.matrix;
    state.competition = { sourceDataset: source, answers: hidden.answers, revealed: false };
    state.selected = hidden.answers.length ? { userIndex: hidden.answers[0].userIndex, itemIndex: hidden.answers[0].itemIndex } : null;
    $("revealCompetitionButton").disabled = false;
    $("restoreCompetitionButton").disabled = false;
    renderAll();
    setStatus(hidden.answers.length + "개의 실제 평점을 숨겼습니다. 알고리즘 조건을 바꾸고 예상한 뒤 정답을 공개하세요.");
  }

  function revealCompetition() {
    if (!state.competition) return;
    state.competition.revealed = true;
    renderAll();
    setStatus("정답을 공개했습니다. MAE·RMSE와 각 절대오차를 비교하고 큰 오차가 난 까닭을 설명해 보세요.");
  }

  function restoreCompetition(showMessage) {
    if (!state.competition) return;
    state.dataset = copyDataset(state.competition.sourceDataset);
    state.competition = null;
    state.selected = null;
    $("revealCompetitionButton").disabled = true;
    $("restoreCompetitionButton").disabled = true;
    syncEditor();
    syncRankingUsers(0);
    renderAll();
    if (showMessage !== false) setStatus("숨긴 평점을 원래 행렬로 복원했습니다.");
  }

  function currentCompetitionMetrics() {
    if (!state.competition) return null;
    return R.competitionMetrics(state.dataset.ratings, state.competition.answers, currentOptions());
  }

  function renderCompetition() {
    if (!state.competition) {
      $("competitionBadge").textContent = "준비";
      $("maeValue").textContent = "—";
      $("rmseValue").textContent = "—";
      $("averageNeighbors").textContent = "—";
      $("fallbackCount").textContent = "—";
      $("answerChart").innerHTML = '<p class="empty-copy">먼저 실제 평점을 숨기고, 설정을 조정한 뒤 정답을 공개하세요.</p>';
      $("answerTableBody").innerHTML = '<tr><td colspan="4">아직 공개된 정답이 없습니다.</td></tr>';
      return;
    }
    $("competitionBadge").textContent = state.competition.revealed ? "정답 공개 · 설정 즉시 비교" : state.competition.answers.length + "개 숨김";
    if (!state.competition.revealed) {
      $("maeValue").textContent = "?";
      $("rmseValue").textContent = "?";
      $("averageNeighbors").textContent = "?";
      $("fallbackCount").textContent = "?";
      $("answerChart").innerHTML = '<p class="empty-copy">정답은 아직 숨겨져 있습니다. 현재 설정의 결과를 예상한 뒤 ‘채점 · 정답 공개’를 누르세요.</p>';
      $("answerTableBody").innerHTML = '<tr><td colspan="4">정답 공개 전입니다.</td></tr>';
      return;
    }
    var metrics = currentCompetitionMetrics();
    var predictions = state.competition.answers.map(function (answer) { return R.predictRating(state.dataset.ratings, answer.userIndex, answer.itemIndex, currentOptions()); });
    var neighborAverage = predictions.length ? predictions.reduce(function (sum, prediction) { return sum + prediction.neighbors.length; }, 0) / predictions.length : 0;
    var fallbacks = predictions.filter(function (prediction) { return prediction.usedFallback; }).length;
    $("maeValue").textContent = format(metrics.mae, 3);
    $("rmseValue").textContent = format(metrics.rmse, 3);
    $("averageNeighbors").textContent = format(neighborAverage, 1) + "개";
    $("fallbackCount").textContent = fallbacks + " / " + predictions.length;
    $("answerChart").innerHTML = metrics.rows.map(function (row) {
      var label = state.dataset.users[row.userIndex] + " × " + state.dataset.items[row.itemIndex];
      return '<div class="answer-row"><span>' + escapeHtml(label) + '</span><div class="double-bar"><div class="answer-bar"><i style="width:' + (row.predicted / 5 * 100).toFixed(1) + '%"></i></div><div class="answer-bar actual"><i style="width:' + (row.actual / 5 * 100).toFixed(1) + '%"></i></div></div><code>예측 ' + format(row.predicted, 2) + '<br>실제 ' + row.actual + '</code></div>';
    }).join('');
    $("answerTableBody").innerHTML = metrics.rows.map(function (row) {
      return '<tr><td>' + escapeHtml(state.dataset.users[row.userIndex] + ' × ' + state.dataset.items[row.itemIndex]) + '</td><td>' + format(row.predicted, 3) + '</td><td>' + row.actual + '</td><td>' + format(row.absoluteError, 3) + (row.usedFallback ? ' *' : '') + '</td></tr>';
    }).join('');
  }

  function scenarioDataset(type) {
    if (type === "cold") {
      var cold = copyDataset(presets.movies);
      cold.items.push("처음 온 작품");
      cold.ratings.forEach(function (row) { row.push(null); });
      cold.users.push("새별");
      cold.ratings.push(cold.items.map(function () { return null; }));
      return cold;
    }
    if (type === "sparse") {
      var sparse = copyDataset(presets.movies);
      sparse.ratings = sparse.ratings.map(function (row, userIndex) { return row.map(function (rating, itemIndex) { return (userIndex + itemIndex * 2) % 3 === 0 ? rating : null; }); });
      return sparse;
    }
    if (type === "popular") {
      return {
        users: ["가온", "누리", "다빈", "라희", "마온", "바다", "소담"],
        items: ["오늘의 인기작", "낯선 산책", "작은 행성", "느린 편지", "새로운 리듬", "먼 곳의 책"],
        ratings: [[5,4,null,null,2,null],[4,null,5,null,null,2],[5,2,null,4,null,null],[4,null,4,null,3,null],[5,3,null,5,null,2],[4,null,2,null,5,null],[5,4,null,3,null,5]]
      };
    }
    return {
      users: ["가람", "나봄", "다온", "라미", "마루", "보라"],
      items: ["모험 A", "모험 B", "모험 C", "잔잔 A", "잔잔 B", "잔잔 C", "뜻밖의 혼합"],
      ratings: [[5,5,4,1,1,null,3],[5,4,5,1,null,1,3],[4,5,null,2,1,1,3],[1,1,2,5,5,4,3],[1,null,1,5,4,5,3],[2,1,1,4,5,null,3]]
    };
  }

  function applyScenario(type) {
    state.dataset = copyDataset(scenarioDataset(type));
    state.competition = null;
    state.selected = type === "cold" ? { userIndex: state.dataset.users.length - 1, itemIndex: 0 } : findFirstBlank();
    $("revealCompetitionButton").disabled = true;
    $("restoreCompetitionButton").disabled = true;
    syncEditor();
    syncRankingUsers(state.selected ? state.selected.userIndex : 0);
    renderAll();
    var names = { cold: "콜드스타트", sparse: "평점 희소성", popular: "인기 편향", bubble: "취향이 좁아짐" };
    setStatus(names[type] + " 시나리오를 적용했습니다. 예상 → 조건 변화 → 결과 해석 순서로 기록해 보세요.", "warn");
  }

  function findFirstBlank() {
    for (var userIndex = 0; userIndex < state.dataset.ratings.length; userIndex += 1) {
      for (var itemIndex = 0; itemIndex < state.dataset.items.length; itemIndex += 1) if (state.dataset.ratings[userIndex][itemIndex] === null) return { userIndex: userIndex, itemIndex: itemIndex };
    }
    return null;
  }

  function syncEditor() {
    $("userNamesInput").value = state.dataset.users.join(", ");
    $("itemNamesInput").value = state.dataset.items.join(", ");
  }

  function setDataset(dataset, message) {
    state.dataset = copyDataset(R.normalizeDataset(dataset));
    state.competition = null;
    state.selected = findFirstBlank();
    $("revealCompetitionButton").disabled = true;
    $("restoreCompetitionButton").disabled = true;
    syncEditor();
    syncRankingUsers(state.selected ? state.selected.userIndex : 0);
    renderAll();
    if (message) setStatus(message);
  }

  function download(filename, content, type) {
    var blob = new Blob([content], { type: type });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function readFile(input, callback) {
    var file = input.files && input.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () { callback(String(reader.result || "")); input.value = ""; };
    reader.onerror = function () { setStatus("파일을 읽지 못했습니다.", "error"); input.value = ""; };
    reader.readAsText(file, "utf-8");
  }

  function activityState() {
    return {
      version: 1,
      tool: "rating-recommendation-lab",
      dataset: copyDataset(state.dataset),
      controls: currentOptions(),
      selected: state.selected,
      notes: { prediction: $("predictionNotes").value, observation: $("observationNotes").value, interpretation: $("interpretationNotes").value },
      teams: state.teams,
      competition: state.competition ? {
        sourceDataset: copyDataset(state.competition.sourceDataset),
        answers: state.competition.answers.map(function (answer) { return { userIndex: answer.userIndex, itemIndex: answer.itemIndex, actual: answer.actual }; }),
        revealed: state.competition.revealed
      } : null
    };
  }

  function applyActivityState(saved) {
    setDataset(saved.dataset, "활동 JSON을 불러왔습니다. 저장 당시 데이터와 설정을 확인하세요.");
    var controls = saved.controls || {};
    if (["user", "item"].indexOf(controls.basis) >= 0) {
      var radio = document.querySelector('input[name="basis"][value="' + controls.basis + '"]');
      if (radio) radio.checked = true;
    }
    if (R.METHODS.indexOf(controls.method) >= 0) $("similarityMethod").value = controls.method;
    if (Number.isFinite(Number(controls.k))) $("neighborK").value = R.clamp(Number(controls.k), 1, 5);
    if (Number.isFinite(Number(controls.minCommon))) $("minCommon").value = R.clamp(Number(controls.minCommon), 1, 4);
    if (Number.isFinite(Number(controls.popularityWeight))) $("popularityWeight").value = R.clamp(Number(controls.popularityWeight), 0, 1.5);
    $("mathLevel").value = $("similarityMethod").value === "agreement" ? "beginner" : "advanced";
    if (saved.selected && state.dataset.ratings[saved.selected.userIndex] && state.dataset.ratings[saved.selected.userIndex][saved.selected.itemIndex] === null) state.selected = saved.selected;
    var notes = saved.notes || {};
    $("predictionNotes").value = notes.prediction || "";
    $("observationNotes").value = notes.observation || "";
    $("interpretationNotes").value = notes.interpretation || "";
    if (Array.isArray(saved.teams) && saved.teams.length === 4) state.teams = saved.teams;
    if (saved.competition && saved.competition.sourceDataset && Array.isArray(saved.competition.answers)) {
      var sourceDataset = R.normalizeDataset(saved.competition.sourceDataset);
      var answers = saved.competition.answers.filter(function (answer) {
        return Number.isInteger(answer.userIndex) && Number.isInteger(answer.itemIndex) && Number.isFinite(answer.actual) &&
          sourceDataset.ratings[answer.userIndex] && sourceDataset.ratings[answer.userIndex][answer.itemIndex] === answer.actual;
      }).map(function (answer) { return { userIndex: answer.userIndex, itemIndex: answer.itemIndex, actual: answer.actual }; });
      if (answers.length) {
        state.competition = { sourceDataset: sourceDataset, answers: answers, revealed: Boolean(saved.competition.revealed) };
        $("revealCompetitionButton").disabled = false;
        $("restoreCompetitionButton").disabled = false;
      }
    }
    renderAll();
  }

  function renderTeams() {
    $("teamGrid").innerHTML = state.teams.map(function (team, index) {
      return '<article class="team-card"><span>' + (index + 1) + '모둠</span><strong>' + (team ? format(team.score, 1) + '점' : '—') + '</strong><small>' + (team ? 'MAE ' + format(team.mae, 3) + ' · RMSE ' + format(team.rmse, 3) + '<br>' + escapeHtml(team.summary) : '아직 기록 없음') + '</small></article>';
    }).join('');
  }

  function recordTeam() {
    if (!state.competition || !state.competition.revealed) { setStatus("대회 정답을 공개한 뒤 현재 결과를 모둠 점수판에 기록할 수 있습니다.", "warn"); return; }
    var metrics = currentCompetitionMetrics();
    var index = Number($("activeTeam").value) || 0;
    var options = currentOptions();
    var score = Math.max(0, 100 - metrics.mae * 18 - metrics.rmse * 4);
    state.teams[index] = { score: score, mae: metrics.mae, rmse: metrics.rmse, summary: (options.basis === "user" ? "사용자" : "아이템") + " 기반 · " + options.method + " · k=" + options.k + " · 공통≥" + options.minCommon };
    renderTeams();
    setStatus((index + 1) + "모둠의 현재 결과를 기록했습니다. 설명 가능성과 편향 분석은 발표에서 함께 평가하세요.");
  }

  function changeRatingTool(tool) {
    state.ratingTool = tool;
    document.querySelectorAll("[data-rating-tool]").forEach(function (button) {
      var active = button.dataset.ratingTool === tool;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  function handleCellAction(userIndex, itemIndex, value) {
    if (state.ratingTool === "target") {
      if (state.dataset.ratings[userIndex][itemIndex] !== null) { setStatus("예측 칸 도구에서는 빈칸만 선택할 수 있습니다. 평점을 고치려면 1~5 또는 빈칸 도구를 고르세요.", "warn"); return; }
      state.selected = { userIndex: userIndex, itemIndex: itemIndex };
      syncRankingUsers(userIndex);
      renderAll();
      setStatus(selectedLabel() + "을 예측할 칸으로 선택했습니다. 다섯 계산 단계를 살펴보세요.");
      return;
    }
    if (state.competition) { setStatus("대회 중에는 숨긴 정답과 행렬을 보호합니다. 먼저 원래 행렬을 복원하세요.", "warn"); return; }
    var rating = value === undefined ? (state.ratingTool === "null" ? null : Number(state.ratingTool)) : value;
    state.dataset.ratings[userIndex][itemIndex] = rating;
    if (state.selected && state.selected.userIndex === userIndex && state.selected.itemIndex === itemIndex && rating !== null) state.selected = null;
    renderAll();
    setStatus(state.dataset.users[userIndex] + " × " + state.dataset.items[itemIndex] + " 칸을 " + (rating === null ? "비웠습니다." : rating + "점으로 바꿨습니다."));
  }

  function bindEvents() {
    $("matrixBody").addEventListener("click", function (event) {
      var button = event.target.closest(".rating-cell");
      if (!button) return;
      handleCellAction(Number(button.dataset.user), Number(button.dataset.item));
    });
    $("matrixBody").addEventListener("keydown", function (event) {
      var button = event.target.closest(".rating-cell");
      if (!button) return;
      var userIndex = Number(button.dataset.user);
      var itemIndex = Number(button.dataset.item);
      if (/^[1-5]$/.test(event.key)) { event.preventDefault(); handleCellAction(userIndex, itemIndex, Number(event.key)); return; }
      if (["0", "Delete", "Backspace"].indexOf(event.key) >= 0) { event.preventDefault(); handleCellAction(userIndex, itemIndex, null); return; }
      var nextUser = userIndex;
      var nextItem = itemIndex;
      if (event.key === "ArrowLeft") nextItem -= 1;
      else if (event.key === "ArrowRight") nextItem += 1;
      else if (event.key === "ArrowUp") nextUser -= 1;
      else if (event.key === "ArrowDown") nextUser += 1;
      else return;
      event.preventDefault();
      var next = document.querySelector('.rating-cell[data-user="' + nextUser + '"][data-item="' + nextItem + '"]');
      if (next) next.focus();
    });
    document.querySelectorAll("[data-rating-tool]").forEach(function (button) { button.addEventListener("click", function () { changeRatingTool(button.dataset.ratingTool); }); });
    ["neighborK", "minCommon", "popularityWeight"].forEach(function (id) { $(id).addEventListener("input", renderAll); });
    document.querySelectorAll('input[name="basis"]').forEach(function (radio) { radio.addEventListener("change", renderAll); });
    $("similarityMethod").addEventListener("change", function () { $("mathLevel").value = $("similarityMethod").value === "agreement" ? "beginner" : "advanced"; renderAll(); });
    $("mathLevel").addEventListener("change", function () { $("similarityMethod").value = $("mathLevel").value === "beginner" ? "agreement" : "cosine"; renderAll(); });
    $("rankingUserSelect").addEventListener("change", renderRanking);
    $("loadPresetButton").addEventListener("click", function () { setDataset(presets[$("presetSelect").value], "합성 " + $("presetSelect").selectedOptions[0].textContent + " 프리셋을 불러왔습니다."); });
    $("createMatrixButton").addEventListener("click", function () {
      var users = $("userNamesInput").value.split(",").map(function (name) { return name.trim(); }).filter(Boolean);
      var items = $("itemNamesInput").value.split(",").map(function (name) { return name.trim(); }).filter(Boolean);
      if (!users.length || !items.length || users.length > 15 || items.length > 15) { setStatus("사용자와 콘텐츠를 각각 1~15개 입력해 주세요.", "error"); return; }
      try { setDataset({ users: users, items: items, ratings: users.map(function () { return items.map(function () { return null; }); }) }, "새 빈 평점 행렬을 만들었습니다. 가명과 합성 콘텐츠인지 확인한 뒤 평점을 입력하세요."); }
      catch (error) { setStatus(error.message, "error"); }
    });
    $("saveCsvButton").addEventListener("click", function () { download("추천실험_평점행렬.csv", R.toCsv(state.dataset), "text/csv;charset=utf-8"); });
    $("loadCsvInput").addEventListener("change", function () { readFile(this, function (text) { try { setDataset(R.parseCsv(text), "CSV 평점 행렬을 불러왔습니다."); } catch (error) { setStatus(error.message, "error"); } }); });
    $("saveJsonButton").addEventListener("click", function () { download("추천실험_활동상태.json", JSON.stringify(activityState(), null, 2), "application/json;charset=utf-8"); });
    $("loadJsonInput").addEventListener("change", function () { readFile(this, function (text) { try { applyActivityState(R.parseStateJson(text)); } catch (error) { setStatus(error.message, "error"); } }); });
    $("startCompetitionButton").addEventListener("click", startCompetition);
    $("revealCompetitionButton").addEventListener("click", revealCompetition);
    $("restoreCompetitionButton").addEventListener("click", function () { restoreCompetition(true); });
    document.querySelectorAll("[data-scenario]").forEach(function (button) { button.addEventListener("click", function () { applyScenario(button.dataset.scenario); }); });
    $("personalModeButton").addEventListener("click", function () { setActivityMode(false); });
    $("groupModeButton").addEventListener("click", function () { setActivityMode(true); });
    $("recordTeamButton").addEventListener("click", recordTeam);
    $("tutorialButton").addEventListener("click", function () { $("tutorialDialog").showModal(); });
    $("teacherButton").addEventListener("click", function () { $("teacherDialog").showModal(); });
    document.querySelectorAll("[data-close-dialog]").forEach(function (button) { button.addEventListener("click", function () { button.closest("dialog").close(); }); });
    document.querySelectorAll("dialog").forEach(function (dialog) { dialog.addEventListener("click", function (event) { if (event.target === dialog) dialog.close(); }); });
    $("tutorialStartButton").addEventListener("click", function () { $("tutorialDialog").close(); setDataset(presets.movies, "영화 프리셋을 준비했습니다. 예측값을 먼저 예상한 뒤 선택된 빈칸의 계산 과정을 살펴보세요."); $("matrixSection").scrollIntoView({ behavior: "smooth" }); });
    $("fullscreenButton").addEventListener("click", function () { if (!document.fullscreenElement && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen(); else if (document.exitFullscreen) document.exitFullscreen(); });
    ["printButton", "printResultButton"].forEach(function (id) { $(id).addEventListener("click", function () { window.print(); }); });
  }

  function setActivityMode(group) {
    $("groupPanel").hidden = !group;
    $("personalModeButton").classList.toggle("is-active", !group);
    $("groupModeButton").classList.toggle("is-active", group);
    $("personalModeButton").setAttribute("aria-pressed", group ? "false" : "true");
    $("groupModeButton").setAttribute("aria-pressed", group ? "true" : "false");
    setStatus(group ? "모둠 대결 모드입니다. 같은 숨김 문제에서 설정을 달리해 오차와 설명을 비교하세요." : "개인 탐구 모드입니다. 예상·관찰·해석을 자신의 말로 기록하세요.");
  }

  function init() {
    if (!R) { setStatus("계산 엔진을 불러오지 못했습니다.", "error"); return; }
    syncEditor();
    syncRankingUsers(0);
    bindEvents();
    changeRatingTool("target");
    renderAll();
    var query = new URLSearchParams(location.search);
    if (query.get("manual") === "1" || query.get("tutorial") === "1") $("tutorialDialog").showModal();
  }

  init();
})();
