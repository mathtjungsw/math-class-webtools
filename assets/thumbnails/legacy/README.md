# 원본 썸네일 보관함

- 보관일: 2026-09-03
- 기준: `2dfb686`의 스타일과 썸네일 변경 전 `index.html`의 원본 81개
- `catalog.html`: 번호 순서대로 보관한 원본 카드의 썸네일·이름·도구 ID
- `site.css`: 원본 스타일 스냅샷. 복원용 자료이므로 현재 디자인 편집에 사용하지 않습니다.
- 전체 원본 검토: `/thumbnail-review-current.html`
- 메인 화면에서 원본 보기: `/index.html?thumbnails=legacy`

## 현재 승인 범위

1~19, 24~25, 33~38, 41, 68~73번의 총 34개가 승인되었습니다. 16·17·36번은 원본 배치를 유지하는 색상 변경이며 나머지 31개는 새 장면입니다. 선택하지 않은 47개는 그대로 유지합니다. 적용 대상은 `assets/tool-thumbnails.js`의 `approvedIds` 목록으로 제한합니다.

## 복원 방법

임시 전환은 `?thumbnails=legacy`를 사용합니다. 항목별 영구 복원은 `approvedIds`에서 해당 ID를 제거합니다. 전체 복원은 메인 페이지의 `thumbnail-candidates.js` 및 `tool-thumbnails.js` 로딩을 제거하면 됩니다. 원본 HTML과 CSS는 메인 소스에도 그대로 남아 있습니다.

이 보관함은 원본 자료입니다. 새 시안으로 덮어쓰거나 삭제하지 않습니다.
