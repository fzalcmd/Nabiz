import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  try {
    const { province, emotion, eventId } = await request.json()
    const ip = (request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim()
    const ipHash = crypto.createHash('sha256').update(ip + eventId).digest('hex')

    const { data: existing } = await supabase
      .from('votes')
      .select('id')
      .eq('ip_hash', ipHash)
      .eq('event_id', eventId)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Zaten oy kullandınız' }, { status: 429 })
    }

    const { error } = await supabase.from('votes').insert({
      event_id: eventId,
      province,
      emotion,
      ip_hash: ipHash
    })

    if (error) throw error

    await supabase.from('live_feed').insert({ province, emotion })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
