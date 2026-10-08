/* Shared, dependency-free geography and historical chronology. Years use the
 * astronomical convention internally: 0 = 1 BCE, -1 = 2 BCE. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.HistoryEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = 'location-history/v1';
  const DIRECTIONS = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];
  const EVENT_FIELDS = ['id', 'placeId', 'placeName', 'title', 'description', 'lat', 'lon', 'radiusKm', 'startYear', 'endYear', 'precision', 'category', 'status', 'sourceTitle', 'sourceUrl', 'sourceQuote', 'collectedAt', 'sourceType', 'sourceId', 'scope', 'bounds'];
  const PLACE_FIELDS = ['id', 'name', 'lat', 'lon', 'description', 'sourceUrl', 'collectedAt', 'sourceType'];
  const QUERY_FIELDS = ['id', 'lat', 'lon', 'radiusKm', 'collectedAt', 'status', 'placeCount', 'eventCount', 'version'];
  function finite(value) { return value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value)); }
  function coordinate(p) {
    if (!p || !finite(p.lat) || !finite(p.lon) || Math.abs(Number(p.lat)) > 90 || Math.abs(Number(p.lon)) > 180) throw new Error('위도는 -90~90, 경도는 -180~180 사이여야 합니다.');
    return { lat: Number(p.lat), lon: Number(p.lon) };
  }
  function radians(n) { return n * Math.PI / 180; }
  function distance(a, b) {
    const p = radians(b.lat - a.lat), q = radians(b.lon - a.lon);
    const h = Math.sin(p / 2) ** 2 + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(q / 2) ** 2;
    return 6371.0088 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
  }
  function bearing(a, b) {
    const d = radians(b.lon - a.lon), x = radians(a.lat), y = radians(b.lat);
    return (Math.atan2(Math.sin(d) * Math.cos(y), Math.cos(x) * Math.sin(y) - Math.sin(x) * Math.cos(y) * Math.cos(d)) * 180 / Math.PI + 360) % 360;
  }
  function direction(a, b) { return DIRECTIONS[Math.floor((bearing(a, b) + 22.5) / 45) % 8]; }
  function inRing(lon, lat, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      const cross = (lon - xi) * (yj - yi) - (lat - yi) * (xj - xi);
      if (Math.abs(cross) < 1e-10 && lon >= Math.min(xi, xj) && lon <= Math.max(xi, xj) && lat >= Math.min(yi, yj) && lat <= Math.max(yi, yj)) return true;
      if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }
  function createLandIndex(data) {
    const polygons = data.polygons || data;
    const bins = new Map();
    polygons.forEach((p, i) => {
      const b = p.bbox;
      for (let x = Math.floor(b[0] / 5); x <= Math.floor(b[2] / 5); x++) {
        for (let y = Math.floor(b[1] / 5); y <= Math.floor(b[3] / 5); y++) {
          const key = x + ':' + y;
          if (!bins.has(key)) bins.set(key, []);
          bins.get(key).push(i);
        }
      }
    });
    return { polygons, bins };
  }
  function isLand(p, index) {
    coordinate(p);
    const candidates = index.bins.get(Math.floor(p.lon / 5) + ':' + Math.floor(p.lat / 5)) || [];
    return candidates.some(i => {
      const polygon = index.polygons[i], b = polygon.bbox;
      if (p.lon < b[0] || p.lon > b[2] || p.lat < b[1] || p.lat > b[3]) return false;
      return inRing(p.lon, p.lat, polygon.rings[0]) && !polygon.rings.slice(1).some(r => inRing(p.lon, p.lat, r));
    });
  }
  function randomLand(index, random, limit) {
    random = random || Math.random;
    for (let attempts = 1; attempts <= (limit || 3000); attempts++) {
      const p = { lat: Math.asin(2 * random() - 1) * 180 / Math.PI, lon: random() * 360 - 180 };
      if (isLand(p, index)) return { ...p, attempts };
    }
    throw new Error('육지 추첨이 완료되지 않았습니다. 다시 추첨해 주세요.');
  }
  function formatYear(year) {
    year = Math.floor(Number(year));
    return year <= 0 ? '기원전 ' + (1 - year).toLocaleString('ko-KR') + '년' : year.toLocaleString('ko-KR') + '년';
  }
  function formatTime(month, showMonth) {
    const year = Math.floor(month / 12), m = Math.floor(month - year * 12) + 1;
    return formatYear(year) + (showMonth ? ' ' + m + '월' : '');
  }
  function dateLabel(e) {
    const prefix = ['approximate', 'century', 'millennium'].includes(e.precision) ? '약 ' : '';
    return prefix + formatYear(e.startYear) + (e.endYear !== e.startYear ? ' ~ ' + formatYear(e.endYear) : '');
  }
  function parseWikidataTime(value, serialization) {
    if (!value || !value.time || Number(value.precision) < 6) return null;
    const match = /^([+-])(\d+)-/.exec(value.time);
    if (!match) return null;
    let rawYear = Number(match[2]) * (match[1] === '-' ? -1 : 1);
    let year = rawYear;
    // Wikidata's negative years are historical BCE numbering; there is no year zero.
    if (serialization === 'rdf') rawYear = year <= 0 ? year - 1 : year;
    else { if (year === 0) return null; if (year < 0) year += 1; }
    const precision = Number(value.precision);
    if (precision === 6 || precision === 7) {
      const scale=precision===6?1000:100,n=Math.floor((Math.abs(rawYear)-1)/scale)*scale;
      const start=rawYear<0?1-n-scale:n+1;
      return {startYear:start,endYear:start+scale-1,precision:precision===6?'millennium':'century'};
    }
    if (precision === 8) { const start = Math.floor(year / 10) * 10; return { startYear: start, endYear: start + 9, precision: 'approximate' }; }
    const before=Number(value.before)||0,after=Number(value.after)||0;
    return { startYear: year-before, endYear: year+after, precision: before||after?'approximate':'year' };
  }
  function validateEvent(raw) {
    const p = coordinate(raw);
    if (!raw.id || !raw.title || !raw.sourceUrl || !/^https:\/\//.test(raw.sourceUrl)) throw new Error('자료에는 고유 ID, 제목과 HTTPS 출처가 필요합니다.');
    if (!finite(raw.startYear) || !finite(raw.endYear) || !Number.isInteger(Number(raw.startYear)) || !Number.isInteger(Number(raw.endYear)) || Number(raw.startYear) > Number(raw.endYear) || Number(raw.startYear) < -5000000 || Number(raw.endYear) > 3000) throw new Error('자료의 시작·종료 연대를 확인해 주세요.');
    if (!['candidate', 'reviewed', 'rejected'].includes(raw.status)) throw new Error('자료 검토 상태를 확인해 주세요.');
    const e = {};
    EVENT_FIELDS.forEach(k => { e[k] = raw[k] == null ? '' : raw[k]; });
    Object.assign(e, p, { startYear: Number(raw.startYear), endYear: Number(raw.endYear), radiusKm: finite(raw.radiusKm) ? Math.max(0, Math.min(3000, Number(raw.radiusKm))) : 0 });
    ['title', 'placeName', 'sourceTitle'].forEach(k => { e[k] = String(e[k]).slice(0, 250); });
    ['description', 'sourceQuote'].forEach(k => { e[k] = String(e[k]).slice(0, 5000); });
    e.id = String(e.id).slice(0, 200);
    e.scope = raw.scope === 'region' ? 'region' : 'site';
    e.bounds = typeof raw.bounds === 'object' ? JSON.stringify(raw.bounds) : String(raw.bounds || '');
    if (e.scope === 'region') {
      let b; try { b = JSON.parse(e.bounds); } catch (_) { throw new Error('지역 자료의 적용 영역을 확인해 주세요.'); }
      if (!Array.isArray(b) || b.length !== 4 || b.some(x => !finite(x)) || b[0] < -180 || b[2] > 180 || b[1] < -90 || b[3] > 90 || b[1] > b[3]) throw new Error('지역 자료의 적용 영역이 올바르지 않습니다.');
    }
    return e;
  }
  function containsBounds(bounds, p) {
    let b; try { b = typeof bounds === 'string' ? JSON.parse(bounds) : bounds; } catch (_) { return false; }
    if (!Array.isArray(b) || b.length !== 4) return false;
    return p.lat >= b[1] && p.lat <= b[3] && (b[0] <= b[2] ? p.lon >= b[0] && p.lon <= b[2] : p.lon >= b[0] || p.lon <= b[2]);
  }
  function relation(e, p) {
    if (e.scope === 'region' && containsBounds(e.bounds, p)) return '해당 지역';
    const d = distance(p, e);
    if (d <= e.radiusKm) return '해당 유적 범위';
    return '주변 ' + (d < 1 ? d.toFixed(1) : Math.round(d).toLocaleString('ko-KR')) + ' km';
  }
  function nearbyEvents(events, p, radius, reviewedOnly) {
    return events.filter(e => e.status !== 'rejected' && (!reviewedOnly || e.status === 'reviewed') && ((e.scope === 'region' && containsBounds(e.bounds, p)) || distance(p, e) <= radius));
  }
  function chronology(events, p, radius, reviewedOnly) {
    return nearbyEvents(events, p, radius, reviewedOnly).sort((a, b) => a.startYear - b.startYear || a.endYear - b.endYear || a.id.localeCompare(b.id));
  }
  function startPoint(events, p) {
    const habitation = events.filter(e => e.category === 'habitation' && e.status === 'reviewed' && (e.scope === 'region' ? containsBounds(e.bounds, p) : distance(p, e) <= e.radiusKm));
    if (habitation.length) return { year: Math.min(...habitation.map(e => e.startYear)), kind: 'habitation', label: '확인된 거주 증거에서 시작' };
    if (events.length) return { year: Math.min(...events.map(e => e.startYear)), kind: 'record', label: '거주 시작 미확인 · 가장 이른 수록 기록에서 시작' };
    return { year: null, kind: 'missing', label: '이 위치의 거주 시작과 연대 자료가 아직 없습니다.' };
  }
  function activeEvents(events, month) {
    return events.filter(e => month >= e.startYear * 12 && month < (e.endYear + 1) * 12);
  }
  function nextRecordMonth(events, month) {
    const dates = events.flatMap(e => [e.startYear * 12, (e.endYear + 1) * 12]).filter(m => m > month + 0.001);
    return dates.length ? Math.min(...dates) : null;
  }
  function advance(events, month, elapsed, monthsPerSecond, skip) {
    const active = activeEvents(events, month);
    const nextStart = events.map(e => e.startYear * 12).filter(m => m > month + 0.001).sort((a, b) => a - b)[0];
    if (skip && !active.length && nextStart !== undefined) return { month: nextStart, skipped: true };
    let target = month + Math.max(0, elapsed) * monthsPerSecond;
    // Stop on an unseen record boundary so a fast clock never loses an event.
    if (nextStart !== undefined && target > nextStart) target = nextStart;
    return { month: target, skipped: false };
  }
  function compareDirections(events, p, month, radius) {
    const all = nearbyEvents(events, p, radius, false).filter(e => distance(p, e) > 0.5 && e.startYear * 12 <= month);
    return DIRECTIONS.map(name => {
      const sector = all.filter(e => direction(p, e) === name);
      const active = activeEvents(sector, month);
      const pool = active.length ? active : sector;
      pool.sort((a, b) => active.length ? distance(p, a) - distance(p, b) || b.startYear - a.startYear : b.startYear - a.startYear || distance(p, a) - distance(p, b));
      return { direction: name, event: pool[0] || null, active: Boolean(active.length), count: sector.length };
    });
  }
  function coveringQuery(queries, p, radius, now) {
    now = now || Date.now();
    return queries.find(q => q.version === VERSION && q.status === 'ok' && now - Date.parse(q.collectedAt) < 30 * 86400000 && distance(p, q) + radius <= Number(q.radiusKm));
  }
  function upsert(existing, incoming) {
    const records = new Map(existing.map(e => [e.id, e]));
    incoming.forEach(e => {
      const old = records.get(e.id);
      if (!old || old.status !== 'reviewed' && old.status !== 'rejected') records.set(e.id, e);
    });
    return Array.from(records.values());
  }
  return { VERSION, DIRECTIONS, EVENT_FIELDS, PLACE_FIELDS, QUERY_FIELDS, coordinate, distance, bearing, direction, createLandIndex, isLand, randomLand, formatYear, formatTime, dateLabel, parseWikidataTime, validateEvent, containsBounds, relation, nearbyEvents, chronology, startPoint, activeEvents, nextRecordMonth, advance, compareDirections, coveringQuery, upsert };
});
