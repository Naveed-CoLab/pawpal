import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface ActivityDay {
  date: string; // YYYY-MM-DD
  hasActivity: boolean;
  sources: {
    chat: boolean;
    mood: boolean;
    assessment: boolean;
  };
}

export function useDailyActivity(userId?: string, windowDays = 365) {
  const [dates, setDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    const fetch = async () => {
      try {
        setLoading(true);
        setError(null);

        const today = new Date();
        const start = new Date(today);
        start.setDate(today.getDate() - (windowDays - 1));
        const startIso = start.toISOString();

        // Fetch chats (use chat_messages table timestamps via joins if available; fall back to chats.updated_at)
        const { data: chats } = await supabase
          .from('chats')
          .select('updated_at')
          .eq('user_id', userId)
          .gte('updated_at', startIso);

        // Fetch mood logs
        const { data: moods } = await supabase
          .from('mood_logs')
          .select('created_at')
          .eq('user_id', userId)
          .gte('created_at', startIso);

        // Fetch symptom assessments
        const { data: assessments } = await supabase
          .from('symptom_assessments')
          .select('created_at')
          .eq('user_id', userId)
          .gte('created_at', startIso);

        const bucket = new Map<string, ActivityDay>();

        const mark = (iso: string, source: keyof ActivityDay['sources']) => {
          const date = iso.split('T')[0];
          const prev = bucket.get(date) || {
            date,
            hasActivity: false,
            sources: { chat: false, mood: false, assessment: false },
          };
          prev.sources[source] = true;
          prev.hasActivity = true;
          bucket.set(date, prev);
        };

        (chats || []).forEach((c: any) => c?.updated_at && mark(c.updated_at, 'chat'));
        (moods || []).forEach((m: any) => m?.created_at && mark(m.created_at, 'mood'));
        (assessments || []).forEach((a: any) => a?.created_at && mark(a.created_at, 'assessment'));

        setDates(new Set(Array.from(bucket.keys())));
      } catch (e: any) {
        setError(e?.message || 'Failed to load activity');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [userId, windowDays]);

  const currentStreak = useMemo(() => {
    let count = 0;
    const today = new Date();
    for (let i = 0; i < windowDays; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().split('T')[0];
      if (dates.has(key)) count++; else break;
    }
    return count;
  }, [dates, windowDays]);

  return { dates, currentStreak, loading, error };
}


