import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface FeedItem {
  c: string
  e: string
  t: string
}

export function useFeed() {
  const [feed, setFeed] = useState<FeedItem[]>([])

  useEffect(() => {
    supabase.from('live_feed').select('province,emotion,created_at')
      .order('created_at', { ascending: false }).limit(5)
      .then(({ data }) => {
        if (data) setFeed(data.map((r: any) => ({ c: r.province, e: r.emotion, t: r.created_at })))
      })

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

  return { feed }
}
