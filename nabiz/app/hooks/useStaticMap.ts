import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

const EMOTIONS = ['öfkeli', 'karmaşık', 'umutlu', 'yorgun', 'sakin', 'mutlu', 'üzgün', 'kaygılı', 'korkmuş', 'heyecanlı', 'aşık', 'gururlu', 'hayal kırıklığı', 'nötr']
const COLORS: Record<string, string> = {
  'öfkeli': '#ff3b5c', 'karmaşık': '#c77dff', 'umutlu': '#57cc99',
  'yorgun': '#778ca3', 'sakin': '#4cc9f0', 'mutlu': '#FFD700',
  'üzgün': '#4a90d9', 'kaygılı': '#a8621a', 'korkmuş': '#8B0000',
  'heyecanlı': '#ff8c00', 'aşık': '#ff6b9d', 'gururlu': '#9b59b6',
  'hayal kırıklığı': '#5d6d7e', 'nötr': '#d0d0d0'
}
const BIG_CITIES: Record<string, { label: string, val: string }> = {
  'istanbul': { label: 'İstanbul', val: '12.4K' },
  'ankara': { label: 'Ankara', val: '6.1K' },
  'izmir': { label: 'İzmir', val: '5.3K' },
  'antalya': { label: 'Antalya', val: '2.8K' },
  'adana': { label: 'Adana', val: '3.7K' },
  'trabzon': { label: 'Trabzon', val: '1.2K' },
  'diyarbakir': { label: 'Diyarbakır', val: '1.6K' },
}

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

export function useStaticMap(
  mapRef: React.RefObject<HTMLDivElement | null>,
  onProvinceClick: (name: string) => void
) {
  const drawn = useRef(false)
  const pathsRef = useRef<Record<string, SVGPathElement>>({})
  const orbsRef = useRef<Record<string, SVGCircleElement[]>>({})
  const animActiveRef = useRef(true)
  const onClickRef = useRef(onProvinceClick)
  useEffect(() => { onClickRef.current = onProvinceClick }, [onProvinceClick])

  useEffect(() => {
    if (drawn.current || !mapRef.current) return
    drawn.current = true

    async function draw() {
      const geo = await d3.json('/tr-cities.json') as any
      const wrap = mapRef.current!
      wrap.innerHTML = ''
      const W = wrap.clientWidth || 360
      const H = Math.round(W * 0.54)

      const svg = d3.select(wrap).append('svg')
        .attr('viewBox', `0 0 ${W} ${H}`)
        .attr('width', W).attr('height', H)

      const defs = svg.append('defs')

      const bg = defs.append('radialGradient').attr('id', 'bgG').attr('cx', '40%').attr('cy', '50%').attr('r', '70%')
      bg.append('stop').attr('offset', '0%').attr('stop-color', '#050505')
      bg.append('stop').attr('offset', '60%').attr('stop-color', '#030303')
      bg.append('stop').attr('offset', '100%').attr('stop-color', '#030303')
      svg.append('rect').attr('width', W).attr('height', H).attr('fill', 'url(#bgG)')

      defs.append('filter').attr('id', 'bGlow').attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%')
        .html('<feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>')
      defs.append('filter').attr('id', 'oGlow').attr('x', '-100%').attr('y', '-100%').attr('width', '300%').attr('height', '300%')
        .html('<feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>')
      defs.append('filter').attr('id', 'bigGlow').attr('x', '-150%').attr('y', '-150%').attr('width', '400%').attr('height', '400%')
        .html('<feGaussianBlur stdDeviation="10" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>')

      EMOTIONS.forEach(em => {
        const rg = defs.append('radialGradient').attr('id', `grad_${em}`).attr('cx', '35%').attr('cy', '30%').attr('r', '65%')
        rg.append('stop').attr('offset', '0%').attr('stop-color', '#fff').attr('stop-opacity', '.9')
        rg.append('stop').attr('offset', '40%').attr('stop-color', COLORS[em]).attr('stop-opacity', '1')
        rg.append('stop').attr('offset', '100%').attr('stop-color', COLORS[em]).attr('stop-opacity', '.4')
      })

      const proj = d3.geoMercator().fitSize([W, H], geo)
      const path = d3.geoPath().projection(proj)

      svg.selectAll('.province')
        .data(geo.features).enter().append('path')
        .attr('class', 'province')
        .attr('d', path as any)
        .attr('fill', '#000')
        .attr('stroke', '#00cfff')
        .attr('stroke-opacity', '0.85')
        .attr('stroke-width', '0.5')
        .attr('filter', 'url(#bGlow)')
        .attr('data-name', (d: any) => d.properties?.name || d.properties?.NAME || d.properties?.il_adi || '')
        .on('click', function(_e: any, d: any) {
          const n = (d as any).properties?.name || (d as any).properties?.NAME || (d as any).properties?.il_adi || ''
          onClickRef.current(n)
        })
        .each(function(d: any) {
          const n = (d as any).properties?.name || (d as any).properties?.NAME || (d as any).properties?.il_adi || ''
          pathsRef.current[nn(n)] = this as SVGPathElement
        })

      geo.features.forEach((d: any) => {
        const p = d.properties || {}
        const n = p.name || p.NAME || p.il_adi || ''
        const k = nn(n)
        const isBig = !!BIG_CITIES[k]

        let c: [number, number]
        try { c = path.centroid(d as any) as [number, number] } catch { return }
        if (!c || isNaN(c[0]) || isNaN(c[1])) return

        const area = path.area(d as any)
        const r = Math.max(2, Math.min(4.5, Math.sqrt(area) * 0.038))

        if (isBig) {
          const rip = svg.append('circle')
            .attr('cx', c[0]).attr('cy', c[1]).attr('r', r)
            .attr('fill', 'none').attr('stroke', '#ff3b5c')
            .attr('stroke-width', '0.8').attr('opacity', '0')
            .attr('data-rip', k)
            .style('pointer-events', 'none')

          const delay = Math.random() * 1500
          function animRip() {
            if (!animActiveRef.current) return
            rip.attr('r', r).attr('opacity', '.5')
            rip.transition().delay(delay).duration(2500).ease(d3.easeCubicOut)
              .attr('r', r * 4).attr('opacity', '0')
              .on('end', () => { if (animActiveRef.current) setTimeout(animRip, 500) })
          }
          animRip()
        }

        const orb = svg.append('circle')
          .attr('cx', c[0]).attr('cy', c[1]).attr('r', r)
          .attr('fill', 'url(#grad_nötr)')
          .attr('filter', isBig ? 'url(#bigGlow)' : 'url(#oGlow)')
          .attr('data-orb', k)
          .style('pointer-events', 'none')

        orbsRef.current[k] = [...(orbsRef.current[k] || []), orb.node() as SVGCircleElement]
        if (isBig) (orb as any).__baseR = r
      })
    }

    draw()
    return () => { animActiveRef.current = false }
  }, [])

  return { pathsRef, orbsRef }
}
