import { useEffect } from 'react'

const COLORS: Record<string, string> = {
  'öfkeli': '#ff3b5c', 'karmaşık': '#c77dff', 'umutlu': '#57cc99',
  'yorgun': '#778ca3', 'sakin': '#4cc9f0', 'mutlu': '#FFD700',
  'üzgün': '#4a90d9', 'kaygılı': '#a8621a', 'korkmuş': '#8B0000',
  'heyecanlı': '#ff8c00', 'aşık': '#ff6b9d', 'gururlu': '#9b59b6',
  'hayal kırıklığı': '#5d6d7e', 'nötr': '#d0d0d0'
}

const EMOTIONS = ['öfkeli', 'karmaşık', 'umutlu', 'yorgun', 'sakin', 'mutlu', 'üzgün', 'kaygılı', 'korkmuş', 'heyecanlı', 'aşık', 'gururlu', 'hayal kırıklığı', 'nötr']

export function nn(s: string) {
  return (s || '')
    .toLowerCase()
    .replace(/i̇/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/ı/g, 'i')
    .trim()
}

export function useColorUpdate(
  orbsRef: React.RefObject<Record<string, SVGCircleElement[]>>,
  pathsRef: React.RefObject<Record<string, SVGPathElement>>,
  byProvince: Record<string, any>,
  selectedProvince: string | null
) {
  useEffect(() => {
    Object.entries(orbsRef.current).forEach(([k, elements]) => {
      const provName = Object.keys(byProvince).find(n => nn(n) === k)
      const byProv = provName ? (byProvince[provName] || {}) : {}
      const totalVotes = (Object.values(byProv) as number[]).reduce((a, b) => a + b, 0)
      const topEm = Object.keys(byProv).length > 0
        ? Object.keys(byProv).reduce((a, b) => byProv[a] > byProv[b] ? a : byProv[a] === byProv[b] ? (EMOTIONS.indexOf(a) <= EMOTIONS.indexOf(b) ? a : b) : b)
        : null

      elements.forEach((el) => {
        if (topEm) {
          el.setAttribute('fill', 'url(#grad_' + String(topEm) + ')')
          const glowId = totalVotes > 20 ? 'bigGlow' : totalVotes > 5 ? 'oGlow' : 'bGlow'
          el.setAttribute('filter', 'url(#' + String(glowId) + ')')
        }
      })

      const pathEl = pathsRef.current?.[k]
      if (pathEl) {
        const isSelected = selectedProvince && k === nn(selectedProvince)
        if (topEm) {
          const opacity = totalVotes >= 50 ? 0.35 : totalVotes >= 20 ? 0.25 : totalVotes >= 5 ? 0.15 : 0.08
          pathEl.setAttribute('fill', COLORS[topEm])
          pathEl.setAttribute('fill-opacity', String(opacity))
          if (!isSelected) {
            pathEl.setAttribute('stroke', COLORS[topEm])
            pathEl.setAttribute('stroke-opacity', '0.9')
            pathEl.setAttribute('stroke-width', totalVotes > 20 ? '1.2' : '0.7')
          }
        } else {
          pathEl.setAttribute('fill', '#000')
          pathEl.setAttribute('fill-opacity', '1')
          if (!isSelected) {
            pathEl.setAttribute('stroke', '#1E90FF')
            pathEl.setAttribute('stroke-opacity', '0.5')
            pathEl.setAttribute('stroke-width', '0.5')
            pathEl.style.animation = ''
          }
        }
      }
    })
  }, [pathsRef, orbsRef, byProvince, selectedProvince])
}
