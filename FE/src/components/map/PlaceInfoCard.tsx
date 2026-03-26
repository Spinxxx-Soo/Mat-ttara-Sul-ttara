import type { Place, PlaceOpeningHours } from '@/types/api';

/**
 * 가게 상세 정보 카드 HTML 생성 (지도 마커 말풍선용)
 * - 핀 클릭 시 InfoWindow에 표시할 content 생성
 * - 닫기 버튼은 window.__closePlaceInfo() 호출 (부모에서 등록)
 */
export function createPlaceInfoCardHtml(
  place: Place | null,
  isLoading: boolean
): string {
  if (isLoading) {
    return `
      <div style="padding:16px; min-width:200px; font-family:sans-serif;">
        <div style="display:flex; align-items:center; gap:8px; color:#64748b;">
          <div style="width:20px; height:20px; border:2px solid #e2e8f0; border-top-color:#94a3b8; border-radius:50%; animation:spin 0.8s linear infinite;"></div>
          <span style="font-size:14px;">정보 불러오는 중...</span>
        </div>
      </div>
      <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
    `;
  }

  if (!place) {
    return `
      <div style="padding:16px; min-width:200px; font-family:sans-serif; color:#64748b; font-size:14px;">
        정보를 불러올 수 없습니다.
      </div>
    `;
  }

  const hours = formatOpeningHours(place.openingHours);
  const rating = place.rating ?? place.reviewScore ?? 0;
  const mainImage = place.imageUrls?.[0] ?? place.imageUrl;
  const showUrl = place.url;

  return `
    <div class="place-info-card" style="padding:16px; min-width:220px; max-width:300px; font-family:system-ui,sans-serif;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
        <h3 style="margin:0; font-size:16px; font-weight:700; color:#1e293b; flex:1;">${escapeHtml(place.name)}</h3>
        <button type="button" onclick="typeof window.__closePlaceInfo==='function'&&window.__closePlaceInfo()" style="padding:4px; margin:-4px -4px 0 4px; background:none; border:none; cursor:pointer; color:#94a3b8; font-size:18px; line-height:1;">×</button>
      </div>
      ${hours ? `<p style="margin:0 0 8px; font-size:13px; color:#64748b;">오늘 ${escapeHtml(hours)}</p>` : ''}
      <p style="margin:0 0 8px; font-size:13px; color:#64748b; line-height:1.4;">${escapeHtml(place.address)}</p>
      ${place.description ? `<p style="margin:0 0 8px; font-size:12px; color:#94a3b8; line-height:1.4;">${escapeHtml(place.description)}</p>` : ''}
      <div style="display:flex; align-items:center; gap:4px; font-size:13px; color:#64748b; margin-bottom:8px;">
        <span style="color:#f59e0b;">★</span>
        <span>${rating > 0 ? rating.toFixed(1) : '별점을 선택해 주세요'}</span>
      </div>
      ${mainImage ? `<img src="${escapeHtml(mainImage)}" alt="${escapeHtml(place.name)}" style="width:100%; height:100px; object-fit:cover; border-radius:8px; margin-bottom:8px;" />` : ''}
      ${showUrl ? `<a href="${escapeHtml(place.url!)}" target="_blank" rel="noopener" style="font-size:12px; color:#3b82f6;">지도에서 보기 →</a>` : ''}
    </div>
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatOpeningHours(
  openingHours?: PlaceOpeningHours | Record<string, unknown> | string | null
): string {
  if (!openingHours) return '';
  if (typeof openingHours === 'string') return openingHours;
  if (typeof openingHours !== 'object') return '';

  // 명세: { today: "18:00 - 01:00", weekly: [...] }
  const o = openingHours as Record<string, unknown>;
  if (typeof o.today === 'string') return o.today;

  // 레거시: { "오늘": "17:00 - 24:00" } 등
  const entries = Object.entries(o);
  if (entries.length === 0) return '';
  const [, value] = entries[0];
  return typeof value === 'string' ? value : '';
}
