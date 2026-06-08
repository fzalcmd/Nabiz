import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET() {
  try {
    const { data: event } = await supabase
      .from('events')
      .select('*')
      .eq('is_active', true)
      .single()

    const { data: votes, error } = await supabase
      .from('votes')
      .select('province, emotion')
      .eq('event_id', event?.id)

    if (error) throw error

    const byProvince: Record<string, Record<string, number>> = {}
    const byEmotion: Record<string, number> = {}

    votes?.forEach(v => {
      if (!byProvince[v.province]) byProvince[v.province] = {}
      byProvince[v.province][v.emotion] = (byProvince[v.province][v.emotion] || 0) + 1
      byEmotion[v.emotion] = (byEmotion[v.emotion] || 0) + 1
    })

    const topProvince = Object.entries(byProvince).sort((a, b) => {
      const totalA = Object.values(a[1] as Record<string,number>).reduce((s,n)=>s+n,0)
      const totalB = Object.values(b[1] as Record<string,number>).reduce((s,n)=>s+n,0)
      return totalB - totalA
    })[0]?.[0] || null

    return NextResponse.json({
      event,
      byProvince,
      byEmotion,
      topProvince,
      total: votes?.length || 0
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
