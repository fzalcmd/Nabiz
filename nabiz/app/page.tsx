'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Map from './components/Map'

const supabase = createClient(
    'https://rrqghwcfgcmeflazvawo.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJycWdod2NmZ2NtZWZsYXp2YXdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyOTM4NDYsImV4cCI6MjA5NTg2OTg0Nn0.aJTe71VNelu-esDmITiuGWZgR0hapmcLEit4ZPrg35Q'
      )

export default function Home() {
  const [results, setResults] = useState<any>(null)
  const [onlineCount, setOnlineCount] = useState(1)
  const [event, setEvent] = useState<any>(null)

  async function fetchResults() {
    const { data: ev } = await supabase
      .from('events')
      .select('*')
      .eq('is_active', true)
      .single()

    const { data: votes } = await supabase
      .from('votes')
      .select('province, emotion')
      .eq('event_id', ev?.id)

    const byProvince: Record<string, Record<string, number>> = {}
    const byEmotion: Record<string, number> = {}

    votes?.forEach((v: any) => {
      if (!byProvince[v.province]) byProvince[v.province] = {}
      byProvince[v.province][v.emotion] = (byProvince[v.province][v.emotion] || 0) + 1
      byEmotion[v.emotion] = (byEmotion[v.emotion] || 0) + 1
    })

    setEvent(ev)
    const topProvince = (Object.entries(byProvince) as [string, Record<string,number>][]).sort((a,b)=>Object.values(b[1]).reduce((s,v)=>s+v,0)-Object.values(a[1]).reduce((s,v)=>s+v,0))[0]?.[0] || '';
    const topProvinceCount = topProvince ? (Object.values(byProvince[topProvince]) as number[]).reduce((s,v)=>s+v,0) : 0;
    setResults({ byProvince, byEmotion, total: votes?.length || 0, topProvince, topProvinceCount, event: ev })
  }

  useEffect(() => {
    const channel = supabase.channel('online-users')
    channel.on('presence', { event: 'sync' }, () => {
      setOnlineCount(Object.keys(channel.presenceState()).length)
      })
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await channel.track({ online: true })
        })
    fetchResults()
    const interval = setInterval(fetchResults, 5000)
    return () => {
        clearInterval(interval)
          supabase.removeChannel(channel)
          }
  }, [])

  return (
    <main>
      <Map results={results} event={event} onVoted={fetchResults} onlineCount={onlineCount} />
    </main>
  )
}
