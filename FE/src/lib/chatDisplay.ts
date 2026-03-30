/**
 * 구버전 BE가 어시스턴트 본문 끝에 붙이던 `||` + JSON 장소 배열을 표시용에서 제거합니다.
 */
export function stripLegacyPlacesJsonSuffix(content: string): string {
  const idx = content.indexOf('||')
  if (idx === -1) return content
  const suffix = content.slice(idx + 2).trim()
  if (!suffix.startsWith('[') && !suffix.startsWith('{')) return content
  try {
    JSON.parse(suffix)
    return content.slice(0, idx).trimEnd()
  } catch {
    return content
  }
}
