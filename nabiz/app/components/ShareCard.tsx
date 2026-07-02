'use client'

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

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

interface ShareCardProps {
  userProvince: string
  userEmotion: string
  topEmotion: string
  topEmotionPct: number
  eventTitle: string
  onClose: () => void
}

export default function ShareCard({
  userProvince,
  userEmotion,
  topEmotion,
  topEmotionPct,
  eventTitle,
  onClose,
}: ShareCardProps) {
  const miniMapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!miniMapRef.current) return
    const wrap = miniMapRef.current
    wrap.innerHTML = ''
    const W = wrap.clientWidth || 280
    const H = Math.round(W * 0.54)
    const color = COLORS[topEmotion] || '#ff3b5c'
    async function draw() {
      const geo = await d3.json('/tr-cities.json') as any
      const svg = d3.select(wrap).append('svg')
        .attr('viewBox', `0 0 ${W} ${H}`)
        .attr('width', W).attr('height', H)
      const defs = svg.append('defs')
      defs.append('filter').attr('id', 'sc-glow')
        .attr('x', '-20%').attr('y', '-20%')
        .attr('width', '140%').attr('height', '140%')
        .html('<feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>')
      svg.append('rect').attr('width', W).attr('height', H).attr('fill', '#0a0a12')
      const proj = d3.geoMercator().fitSize([W, H], geo)
      const path = d3.geoPath().projection(proj)
      svg.selectAll('.sc-province')
        .data(geo.features).enter().append('path')
        .attr('class', 'sc-province')
        .attr('d', path as any)
        .attr('fill', color).attr('fill-opacity', 0.18)
        .attr('stroke', color).attr('stroke-opacity', 0.85)
        .attr('stroke-width', 0.5).attr('filter', 'url(#sc-glow)')
    }
    draw()
  }, [topEmotion])

  const userColor = COLORS[userEmotion] || '#fff'
  const topColor = COLORS[topEmotion] || '#ff3b5c'
  const EKG = "M0,8 L6,8 L8,2 L10,14 L12,4 L14,10 L16,8 L40,8"
  const tweetText = encodeURIComponent(
    `Ben ${EICO[userEmotion]} ${userEmotion}, Türkiye ${EICO[topEmotion]} ${topEmotion} hissediyor (${topEmotionPct}%) | ${eventTitle} #DuyguSeli`
  )
  const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}&url=https://duyguseli.com`

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '0 16px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#0d0d1a', borderRadius: 20, padding: '20px 16px 16px', width: '100%', maxWidth: 340, border: '0.5px solid #1e2a3a', boxShadow: `0 0 40px ${topColor}33` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16, fontWeight: 900, color: '#ff3b5c' }}>Duygu</span>
            <span style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>Seli</span>
            <svg width="28" height="12" viewBox="0 0 40 16" fill="none">
              <polyline points={EKG} stroke="#ff3b5c" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span style={{ fontSize: 10, color: '#556', letterSpacing: 1 }}>{new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          <div style={{ background: '#111827', borderRadius: 14, padding: '12px 8px', textAlign: 'center', border: `0.5px solid ${userColor}44` }}>
            <div style={{ fontSize: 9, color: '#666', letterSpacing: 2, marginBottom: 6 }}>BEN</div>
            <div style={{ fontSize: 26, marginBottom: 4 }}>{EICO[userEmotion]}</div>
            <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{userEmotion}</div>
            <div style={{ fontSize: 10, color: userColor, marginTop: 3 }}>📍 {userProvince}</div>
          </div>
          <div style={{ background: '#111827', borderRadius: 14, padding: '12px 8px', textAlign: 'center', border: `0.5px solid ${topColor}44` }}>
            <div style={{ fontSize: 9, color: '#666', letterSpacing: 2, marginBottom: 6 }}>TÜRKİYE</div>
            <div style={{ fontSize: 26, marginBottom: 4 }}>{EICO[topEmotion]}</div>
            <div style={{ fontSize: 13, color: '#fff', fontWeight: 600 }}>{topEmotion}</div>
            <div style={{ fontSize: 10, color: topColor, marginTop: 3 }}>%{topEmotionPct}</div>
          </div>
        </div>
        <div ref={miniMapRef} style={{ borderRadius: 12, overflow: 'hidden', marginBottom: 12, minHeight: 80, background: '#0a0a12', border: `0.5px solid ${topColor}33` }} />
        <div style={{ fontSize: 10, color: '#556', textAlign: 'center', marginBottom: 14, padding: '0 8px' }}>{eventTitle}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, borderTop: '0.5px solid #1a2030', paddingTop: 10 }}>
          <span style={{ fontSize: 10, color: '#444' }}>duyguseli.com</span>
          <span style={{ fontSize: 10, color: '#444' }}>Türkiye'nin nabzı</span>
        </div>
        <a href={tweetUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', background: '#000', color: '#fff', border: '0.5px solid #333', borderRadius: 50, padding: '10px 0', fontSize: 13, fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          X'te Paylaş
        </a>
        <button onClick={onClose} style={{ width: '100%', marginTop: 8, background: 'transparent', border: 'none', color: '#445', fontSize: 12, cursor: 'pointer', padding: '6px 0' }}>Kapat</button>
      </div>
    </div>
  )
}
