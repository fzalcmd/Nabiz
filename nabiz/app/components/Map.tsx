'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

// FIX #16: supabase client modül seviyesinde bir kere oluşturuluyor
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
)

import * as d3 from 'd3'

const EMOTIONS = ['öfkeli', 'karmaşık', 'umutlu', 'yorgun', 'sakin', 'mutlu', 'üzgün', 'kaygılı', 'korkmuş', 'heyecanlı', 'aşık', 'gururlu', 'hayal kırıklığı', 'nötr']
const COLORS: Record<string, string> = {
  'öfkeli': '#ff3b5c', 'karmaşık': '#c77dff', 'umutlu': '#57cc99',
  'yorgun': '#778ca3', 'sakin': '#4cc9f0', 'mutlu': '#FFD700',
  'üzgün': '#4a90d9', 'kaygılı': '#a8621a', 'korkmuş': '#8B0000',
  'heyecanlı': '#ff8c00', 'aşık': '#ff6b9d', 'gururlu': '#9b59b6',
  'hayal kırıklığı': '#5d6d7e', 'nötr': '#d0d0d0'
}
const EICO: Record<string, string> = {
  'öfkeli': '😤', 'karmaşık': '😵', 'umutlu': '🙏',
  'yorgun': '😔', 'sakin': '😌', 'mutlu': '😄',
  'üzgün': '😢', 'kaygılı': '😰', 'korkmuş': '😨',
  'heyecanlı': '🤩', 'aşık': '😍', 'gururlu': '🥹',
  'hayal kırıklığı': '😞', 'nötr': '😐'
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

// FIX #4: Turkish normalization — tutarlı string normalizasyonu
function nn(s: string) {
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

// ── KATMAN 1: Statik harita — sadece bir kere çizilir ──
function useStaticMap(mapRef: React.RefObject<HTMLDivElement | null>, onProvinceClick: (name: string) => void) {
  const drawn = useRef(false)
  const pathsRef = useRef<Record<string, SVGPathElement>>({})
  const orbsRef = useRef<Record<string, SVGCircleElement[]>>({})
  // FIX #14: animActiveRef cleanup için kullanılacak
  const animActiveRef = useRef(true)
  // FIX #2: stale closure sorunu — callback her zaman güncel ref üzerinden çağrılır
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
          // FIX #2: stale closure yerine ref üzerinden çağır
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
            // FIX #14: animActiveRef false olunca animasyon durur
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

        if (isBig) {
          (orb as any).__baseR = r
        }

        // FIX #13: boş text elementi kaldırıldı
      })
    }

    draw()

    // FIX #14: cleanup — animasyon unmount'ta durdurulur
    return () => { animActiveRef.current = false }
  }, [])

  return { pathsRef, orbsRef }
}

// ── KATMAN 2: Renk güncellemesi — haritayı yeniden çizmez ──
function useColorUpdate(
  orbsRef: React.RefObject<Record<string, SVGCircleElement[]>>,
  pathsRef: React.RefObject<Record<string, SVGPathElement>>,
  byProvince: Record<string, any>,
  // FIX #3: seçili il bilgisi burada da alınıyor, highlight üzerine yazmasın diye
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

      const isSelectedProvince = typeof window !== "undefined" && (window as any).__selectedProvince === k
      const pathEl = pathsRef.current?.[k]
      if (pathEl) {
        // FIX #3: seçili ilin stroke'unu useColorUpdate ezmesin
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

// FIX #8: "önce" kelimesi timeAgo içinde — dışarıda tekrar yazılmayacak
function timeAgo(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts + 'Z').getTime()) / 1000)
  if (diff < 10) return 'az önce'
  if (diff < 60) return `${diff} sn önce`
  if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`
  return `${Math.floor(diff / 3600)} sa önce`
}

// FIX #9: Props type definitions — type safety
interface VoteData {
  province: string
  emotion: string
  eventId: string
  dev?: string
}

interface EventData {
  id: string
  title: string
  description: string
  created_at: string
}

interface ResultsData {
  byProvince: Record<string, Record<string, number>>
  byEmotion: Record<string, number>
  total: number
  topProvince: string
  topProvinceCount: number
}

interface FeedItem {
  c: string
  e: string
  t: string
}

interface MapProps {
  results: ResultsData
  event: EventData
  onVoted: () => void
  onlineCount: number
}

export default function Map({ results, event, onVoted, onlineCount }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [showShare, setShowShare] = useState(false)
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null)
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null)
  const [voted, setVoted] = useState(false)
  const [showProvinceWarning, setShowProvinceWarning] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCityError, setShowCityError] = useState(false);9
  const [secs, setSecs] = useState(0)
  const [filterIl, setFilterIl] = useState('Tümü')
  const [showFilter, setShowFilter] = useState(false)
  const [feed, setFeed] = useState<FeedItem[]>([])

  const handleProvinceClick = useCallback((name: string) => {
    setSelectedProvince(name)
    setShowShare(true)
  }, [])

  const { orbsRef, pathsRef } = useStaticMap(mapRef, handleProvinceClick)
  // FIX #3: selectedProvince useColorUpdate'e geçiliyor
  useColorUpdate(orbsRef, pathsRef, results?.byProvince || {}, selectedProvince)

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    if (p.get('dev') === 'nabiz2026') localStorage.setItem('ndev', '1')
    if (p.get('dev') === 'off') localStorage.removeItem('ndev')
  }, [])

  useEffect(() => {
    supabase.from('live_feed').select('province,emotion,created_at').order('created_at', { ascending: false }).limit(5).then(({ data }) => {
      if (data) setFeed(data.map((r: any) => ({ c: r.province, e: r.emotion, t: r.created_at })))
    })
    
    // FIX #5: Supabase channel cleanup — unsubscribe() kullanılıyor
    const channel = supabase
      .channel('live-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_feed' }, (payload) => {
        const row = payload.new as any
        setFeed(prev => [
          { c: row.province, e: row.emotion, t: row.created_at },
          ...prev.slice(0, 19)
        ])
      })
      .subscribe()
    
    return () => { channel.unsubscribe() }
  }, [])

  // FIX #5a: Selected province highlight — ayrı effect ile race condition çözülüyor
  useEffect(() => {
    if (!pathsRef.current || !selectedProvince) return
    
    const k = nn(selectedProvince)
    const pathEl = pathsRef.current[k]
    if (pathEl) {
      pathEl.setAttribute('stroke', '#ffffff')
      pathEl.setAttribute('stroke-opacity', '0.9')
      pathEl.setAttribute('stroke-width', '2')
    }
  }, [selectedProvince, pathsRef])

  // FIX #5b: Default stroke reset — seçim kalktığında
  useEffect(() => {
    if (!pathsRef.current || selectedProvince) return
    
    Object.entries(pathsRef.current).forEach(([, pathEl]) => {
      if (!pathEl) return
      pathEl.setAttribute('stroke', '#1E90FF')
      pathEl.setAttribute('stroke-opacity', '0.5')
      pathEl.setAttribute('stroke-width', '0.5')
    })
  }, [selectedProvince, pathsRef])

  useEffect(() => {
    const t = setInterval(() => setSecs(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  async function submitVote() {
    if (!selectedEmotion || !event?.id) {
      return
    }
    
    if (isSubmitting) return
    setIsSubmitting(true)
  

    const detectedProvince = selectedProvince || ""

    

    // FIX #7: try/catch ile API hata yönetimi — error parsing iyileştirildi
    try {
      const isDev = process.env.NODE_ENV === 'development'
      const adminKey = isDev ? (localStorage.getItem('ndev') === '1' ? 'benim-super-test-key' : '') : ''
      
      const voteData: VoteData = {
        province: detectedProvince,
        emotion: selectedEmotion,
        eventId: event.id,
        dev: localStorage.getItem('ndev') === '1' ? '1' : undefined
      }

      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(adminKey && { 'x-admin-key': adminKey })
        },
        body: JSON.stringify(voteData)
      })

      // FIX #7a: Response parsing öncesinde status kontrolü
      if (!res.ok) {
        let errorMessage = `Sunucu hatası: ${res.status}`
        try {
          const errorData = await res.json()
          errorMessage = errorData?.message || errorData?.error || errorMessage
        } catch {
          // JSON parse hatası — original mesaj kullanılır
        }
        return
      }

      const data = await res.json()
      if (!data.success) {
        throw new Error(data.message || data.error || 'Bir hata oluştu, tekrar dene.')
      }

      setVoted(true)
      setShowShare(false)
      setSelectedEmotion(null)
      onVoted()
      setTimeout(() => setVoted(false), 3000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bağlantı hatası, lütfen tekrar dene.'
      console.error('Vote error:', err)
      alert(errorMessage)
    } finally {
      // FIX #7: her durumda isSubmitting sıfırlanır
      setIsSubmitting(false)
    }
  }

  const total = results?.total || 0
  const byEmotion = results?.byEmotion || {}
  const topEmotion = EMOTIONS.reduce((a, b) => (byEmotion[a] || 0) > (byEmotion[b] || 0) ? a : b, 'öfkeli')
  
  // FIX #11: liveTime event.created_at'dan hesaplanıyor, secs'e bağlı değil
  const liveTime = (() => {
    if (!event?.created_at) {
      return `${secs < 60 ? secs + 'sn' : secs < 3600 ? Math.floor(secs / 60) + 'dk' : Math.floor(secs / 3600) + 'sa'} önce`
    }
    const diff = Math.floor((Date.now() - new Date(event.created_at + 'Z').getTime()) / 1000)
    if (diff < 60) return `${diff}sn önce`
    if (diff < 3600) return `${Math.floor(diff / 60)}dk önce`
    return `${Math.floor(diff / 3600)}sa önce`
  })()
  
  const EKG = "M0,8 L6,8 L8,2 L10,14 L12,4 L14,10 L16,8 L40,8"

  return (
    <div style={{ background: '#07090f', minHeight: '100vh', color: '#fff', fontFamily: 'sans-serif', maxWidth: 480, margin: '0 auto' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 14px 11px', borderBottom: '.5px solid #1a2030' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <span style={{ fontSize: 24, fontWeight: 900, letterSpacing: -1.5 }}>DuyguSelı</span>
          <span style={{ position: 'relative', display: 'inline-block', fontSize: 24, fontWeight: 900, letterSpacing: -1.5 }}>
            <span style={{ position: 'absolute', top: -12, right: -1, width: 5, height: 5, borderRadius: '50%', background: '#ff3b5c', animation: 'blink 1.2s infinite', display: 'block' }} />
          </span>
          <svg width="34" height="14" viewBox="0 0 40 16" fill="none" style={{ marginLeft: 8 }}>
            <polyline points={EKG} stroke="#ff3b5c" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ fontSize: 11, color: '#667' }}>Türkiye şu an ne hissediyor?</div>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#1a0810', border: '.5px solid #ff3b5c55', borderRadius: 20, padding: '3px 8px', fontSize: 10, color: '#ff3b5c', fontWeight: 700 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff3b5c', animation: 'blink 1.2s infinite' }} />CANLI
          </div>
          <div style={{ fontSize: 11, color: '#778' }}>👥 {onlineCount}</div>
        </div>
      </div>

      {/* ALERT */}
      <div style={{ margin: '10px 14px', background: '#110a10', border: '.5px solid #ff3b5c44', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 32, height: 32, background: '#ff3b5c22', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="18" height="10" viewBox="0 0 40 16" fill="none">
            <polyline points={EKG} stroke="#ff3b5c" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 13, color: '#ff3b5c', fontWeight: 600 }}>{event?.title || 'Türkiye gündemi hareketli'}</div>
          <div style={{ fontSize: 11, color: '#556', marginTop: 2 }}>{event?.description || 'Toplumun nabzı anlık olarak ölçülüyor.'}</div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 10, color: '#888', whiteSpace: 'nowrap', animation: 'slideUp 0.3s ease-out' }}>🕐 {liveTime}</div>
      </div>

      {/* MAP */}
      <div style={{ padding: '0 14px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 13, color: '#ccd', fontWeight: 500 }}>İl bazında anlık duygu haritası</div>
          <div style={{ display: 'flex', gap: 6, position: 'relative' }}>
            <div onClick={() => setShowFilter(!showFilter)}
              style={{ background: '#111827', border: '.5px solid #243', borderRadius: 8, padding: '5px 10px', fontSize: 11, color: '#889', cursor: 'pointer' }}>
              {filterIl} ▾
            </div>
            {showFilter && (
              <div style={{ position: 'absolute', top: 30, right: 30, background: '#111827', border: '.5px solid #243', borderRadius: 8, zIndex: 50, minWidth: 120 }}>
                {['Tümü', 'İstanbul', 'Ankara', 'İzmir', 'Antalya', 'Adana', 'Trabzon', 'Diyarbakır'].map(il => (
                  <div key={il} onClick={() => { setFilterIl(il); setShowFilter(false) }}
                    style={{ padding: '8px 12px', fontSize: 12, color: filterIl === il ? '#ff3b5c' : '#aaa', cursor: 'pointer' }}>{il}</div>
                ))}
              </div>
            )}
            <div style={{ background: '#111827', border: '.5px solid #243', borderRadius: 8, padding: '5px 8px', fontSize: 11, color: '#889', cursor: 'pointer' }}>⛶</div>
          </div>
        </div>
        <div ref={mapRef} style={{ background: '#050508', borderRadius: 12, overflow: 'hidden', minHeight: 180 }} />
      </div>

      {/* EMOTION BAR */}
      {(() => {
        const sorted = [...EMOTIONS].sort((a, b) => (byEmotion[b] || 0) - (byEmotion[a] || 0)).slice(0, 5)
        return (
          <div style={{ display: 'flex', margin: '6px 14px 10px', gap: 6 }}>
            {sorted.map(e => {
              const pct = total > 0 ? Math.round((byEmotion[e] || 0) / total * 100) : 0
              return (
                <div key={e} style={{ flex: 1, padding: '6px 4px', textAlign: 'center', borderRadius: 10, background: '#0a0a0f', border: '.5px solid #1a2535' }}>
                  <div style={{ fontSize: 8, color: COLORS[e], fontWeight: 600, textTransform: 'capitalize', marginBottom: 2 }}>{e}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: COLORS[e] }}>{pct}%</div>
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* STATS 5 KART */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 5, padding: '0 14px 6px' }}>
        <div style={{ background: '#0a0a0f', borderRadius: 10, padding: '8px 4px', textAlign: 'center', border: '.5px solid #1a2535' }}>
          <div style={{ fontSize: 7, color: '#888', textTransform: 'uppercase', marginBottom: 2 }}>Katılım</div>
          <svg width="100%" height="12" viewBox="0 0 40 12">
            <polyline points="0,6 6,6 8,1 10,11 12,3 14,9 16,6 40,6" stroke="#57cc99" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          </svg>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', marginTop: 2 }}>{total > 999 ? (total / 1000).toFixed(1) + 'K' : total || '0'}</div>
          <div style={{ fontSize: 7, color: '#57cc99', marginTop: 1 }}>↑ son 10dk</div>
        </div>
        <div style={{ background: '#0a0a0f', borderRadius: 10, padding: '8px 4px', textAlign: 'center', border: '.5px solid #1a2535' }}>
          <div style={{ fontSize: 7, color: '#888', textTransform: 'uppercase', marginBottom: 2 }}>Baskın</div>
          <div style={{ fontSize: 16, margin: '1px 0' }}>{EICO[topEmotion]}</div>
          <div style={{ fontSize: 8, fontWeight: 700, color: COLORS[topEmotion] }}>{topEmotion.slice(0, 6).toUpperCase()}</div>
          <div style={{ fontSize: 7, color: COLORS[topEmotion] }}>%{total > 0 ? Math.round((byEmotion[topEmotion] || 0) / total * 100) : 0}</div>
        </div>
        <div style={{ background: '#0a0a0f', borderRadius: 10, padding: '8px 4px', textAlign: 'center', border: '.5px solid #1a2535' }}>
          <div style={{ fontSize: 7, color: '#888', textTransform: 'uppercase', marginBottom: 2 }}>En Aktif</div>
          <svg width="100%" height="12" viewBox="0 0 40 12">
            <rect x="2" y="7" width="5" height="5" rx="1" fill="#ff3b5c" />
            <rect x="9" y="4" width="5" height="8" rx="1" fill="#ff3b5c" />
            <rect x="16" y="1" width="5" height="11" rx="1" fill="#ff3b5c" />
            <rect x="23" y="5" width="5" height="7" rx="1" fill="#ff3b5c" opacity=".5" />
            <rect x="30" y="7" width="5" height="5" rx="1" fill="#ff3b5c" opacity=".3" />
          </svg>
          <div style={{ fontSize: 8, fontWeight: 700, color: '#fff' }}>{(results?.topProvince || 'YOK').toUpperCase()}</div>
          <div style={{ fontSize: 7, color: '#888' }}>{results?.topProvinceCount || 0} kişi</div>
        </div>
        <div style={{ background: '#0a0a0f', borderRadius: 10, padding: '8px 4px', textAlign: 'center', border: '.5px solid #1a2535' }}>
          <div style={{ fontSize: 7, color: '#888', textTransform: 'uppercase', marginBottom: 2 }}>İl Sayısı</div>
          <div style={{ position: 'relative', width: 30, height: 30, margin: '2px auto' }}>
            <svg width="30" height="30" viewBox="0 0 30 30">
              <circle cx="15" cy="15" r="12" fill="none" stroke="#1a2535" strokeWidth="2.5" />
              <circle cx="15" cy="15" r="12" fill="none" stroke="#00d4ff" strokeWidth="2.5" strokeDasharray="75.4" strokeDashoffset="0" strokeLinecap="round" transform="rotate(-90 15 15)" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>81</div>
          </div>
          <div style={{ fontSize: 7, color: '#888' }}>{Object.keys(results?.byProvince || {}).length}/81</div>
        </div>
        <div style={{ background: '#0a0a0f', borderRadius: 10, padding: '8px 4px', textAlign: 'center', border: '.5px solid #1a2535' }}>
          <div style={{ fontSize: 7, color: '#888', textTransform: 'uppercase', marginBottom: 2 }}>Toplam Oy</div>
          <svg width="100%" height="12" viewBox="0 0 40 12">
            <polyline points="0,7 5,7 7,1 9,11 11,3 13,9 15,6 40,6" stroke="#ff3b5c" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          </svg>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#fff', marginTop: 2 }}>{total.toLocaleString('tr-TR')}</div>
          <div style={{ fontSize: 7, color: '#888' }}>bugün</div>
        </div>
      </div>

      {/* CANLI AKIŞ */}
      <div style={{ padding: '0 14px 6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#ccd' }}>
            <span style={{ color: '#ff3b5c', animation: 'blink 1s infinite' }}>●</span>
            CANLI AKIŞ
            <span style={{ fontSize: 9, color: '#888', fontWeight: 400 }}>illerden son duygular</span>
          </div>
          <div style={{ fontSize: 11, color: '#888', cursor: 'pointer' }}>Tümünü Gör ›</div>
        </div>
        {/* FIX #15: overflowY gereksiz kaldırıldı */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 80, scrollbarWidth: 'none' }}>
          {feed.map((f, i) => (
            <div key={`${f.t}-${f.c}`} style={{ background: '#0a0a0f', border: '.5px solid #1a2535', borderRadius: 12, padding: '10px 12px', minWidth: 95, flexShrink: 0, position: 'relative' }}>
              {/* FIX #8: timeAgo zaten "önce" içeriyor, dışarıda tekrar yazılmıyor */}
              <div style={{ fontSize: 9, color: '#888', marginBottom: 4 }}>
                <span style={{ color: COLORS[f.e], fontSize: 7 }}>● </span>{timeAgo(f.t)}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{f.c}</div>
              <div style={{ fontSize: 11, color: COLORS[f.e], display: 'flex', alignItems: 'center', gap: 3 }}>
                {EICO[f.e]} {f.e}
              </div>
              <div style={{ position: 'absolute', right: 8, top: 8, fontSize: 13, opacity: .4 }}>🤍</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      {/* FIX #9: bottom: 0 yerine bottom: 60 — Bottom Nav'ın üzerinde durur */}
      <div style={{ padding: '0 14px 8px', position: 'sticky', bottom: 60, background: '#07090f' }}>
        <button onClick={() => {
          if (!selectedProvince) {
            setShowCityError(true);
              setTimeout(() => setShowCityError(false), 3000); // 3 saniye sonra kutu kaybolur
                return;
                }


                      setShowShare(true)
                      }}
          style={{ width: '100%', background: '#3a0010', border: 'none', borderRadius: 50, padding: '3px 16px', fontSize: 11, fontWeight: 400, color: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, textTransform: 'uppercase', letterSpacing: .5, boxShadow: '0 0 10px #ff0044, 0 0 25px #ff004499, 0 0 50px #ff004444', outline: '1.5px solid #ff0044' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="22" height="12" viewBox="0 0 40 16" fill="none"><polyline points="0,8 8,8 12,2 16,14 20,2 24,14 28,8 40,8" stroke="#fff" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span>{isSubmitting ? 'GÖNDERİLİYOR...' : 'DUYGU PAYLAŞ'}</span>
            </div>
            <div style={{ fontSize: 10, opacity: .75, fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginTop: 2 }}>Sen de ülkenin nabzına katıl</div>
          </div>
        </button>
      </div>

      {/* BOTTOM NAV */}
      <div style={{ display: 'flex', borderTop: '.5px solid #151e2a', padding: '10px 0 16px', background: '#07090f', position: 'sticky', bottom: 0, zIndex: 10 }}>
        {[
          { icon: '🏠', label: 'Harita', active: true },
          { icon: '📈', label: 'Akış', active: false },
          { icon: '+', label: '', plus: true },
          { icon: '📊', label: 'İstatistik', active: false },
          { icon: '👤', label: 'Profil', active: false },
        ].map((item, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, fontSize: 9, color: item.active ? '#ff3b5c' : '#445', cursor: 'pointer' }} onClick={() => item.plus && setShowShare(true)}>
            {item.plus ? (
              <div style={{ width: 42, height: 42, background: '#3a0010', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 0, boxShadow: '0 0 10px #ff0044, 0 0 20px #ff004466', outline: '1.5px solid #ff0044', fontSize: 20, color: '#fff' }}>+</div>
            ) : (
              <>
                <div style={{ fontSize: 18 }}>{item.icon}</div>
                <div>{item.label}</div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* PAYLAŞ MODAL */}
      {showShare && (
        <div onClick={() => setShowShare(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 200 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#0a0a0f', borderRadius: '22px 22px 0 0', padding: '22px 18px 32px', width: '100%', maxWidth: 480, borderTop: '.5px solid #00d4ff44', maxHeight: '80vh', overflowY: 'auto', height: 'auto' }}>
            <div style={{ width: 36, height: 4, background: '#1e2a3a', borderRadius: 2, margin: '0 auto 18px' }} />
            <div style={{ fontSize: 16, fontWeight: 600, textAlign: 'center', marginBottom: 4 }}>Şu an nasıl hissediyorsun?</div>
            <div style={{ fontSize: 12, color: '#556', textAlign: 'center', marginBottom: 4 }}>{event?.title || 'Güncel olay hakkında'}</div>
            {selectedProvince && (() => {
              const prov = results?.byProvince?.[selectedProvince] || {}
              const total = Object.values(prov as any).reduce((a: any, b: any) => a + b, 0) as number
              const top = Object.entries(prov as any).sort((a: any, b: any) => b[1] - a[1])[0]
              return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14, background: '#0a1628', borderRadius: 10, padding: '8px 16px' }}>
                <span style={{ fontSize: 11, color: '#00d4ff' }}>📍 {selectedProvince}</span>
                {top && <span style={{ fontSize: 11, color: '#888' }}>•</span>}
                {top && <span style={{ fontSize: 11, color: '#fff' }}>{top[0]}</span>}
                {total > 0 && <span style={{ fontSize: 11, color: '#888' }}>• {total} oy</span>}
              </div>
            })()}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 18 }}>
              {EMOTIONS.map(e => (
                <button key={e} onClick={() => setSelectedEmotion(e)}
                  style={{ background: '#111827', border: `1.5px solid ${selectedEmotion === e ? COLORS[e] : '#1e2a3a'}`, borderRadius: 14, padding: '12px 8px', cursor: 'pointer', textAlign: 'center', color: '#fff', boxShadow: selectedEmotion === e ? `0 0 12px ${COLORS[e]}44` : 'none' }}>
                  <div style={{ fontSize: 22 }}>{EICO[e]}</div>
                  <div style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>{e}</div>
                </button>
              ))}
            </div>
            <button onClick={submitVote} disabled={!selectedEmotion || isSubmitting}
              style={{ width: '100%', background: '#3a0010', border: 'none', borderRadius: 50, padding: '8px 20px', fontSize: 13, fontWeight: 500, color: '#fff', cursor: selectedEmotion ? 'pointer' : 'not-allowed', opacity: selectedEmotion ? 1 : 0.4, boxShadow: '0 0 10px #ff0044, 0 0 25px #ff004499, 0 0 50px #ff004444', outline: '1.5px solid #ff0044' }}>
              {isSubmitting ? 'GÖNDERİLİYOR...' : 'Paylaş'}
            </button>
          </div>
        </div>
      )}

      {voted && (
        <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: '#57cc99', color: '#000', padding: '10px 20px', borderRadius: 20, fontWeight: 600, zIndex: 300, whiteSpace: 'nowrap', animation: 'slideUp 0.3s ease-out' }}>
          ✅ Duygun kaydedildi!
        </div>
      )}
      {showCityError && (
        <div style={{
          position: 'fixed',
          bottom: 140,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 999,
          background: '#1a0810',
          border: '.5px solid #ff3b5c',
          color: '#fff',
          padding: '10px 18px',
          borderRadius: 50,
          fontSize: 12,
          fontWeight: 600,
          boxShadow: '0 0 12px #ff004466',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          whiteSpace: 'nowrap',
          animation: 'slideUp 0.3s ease-out'
        }}>
          📍 Lütfen haritadan bir il seçiniz
        </div>
      )}
                                                                                

      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.15} }
        @keyframes mapBreathe { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes provincePulse { 0%,100%{stroke-width:2;stroke-opacity:0.9} 50%{stroke-width:4;stroke-opacity:0.5} } @keyframes slideUp { from { bottom: 40px; opacity: 0; } to { bottom: 90px; opacity: 1; } }
      `}</style>
    </div>
  )
}
