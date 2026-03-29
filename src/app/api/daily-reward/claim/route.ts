import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth-middleware'
import { DAILY_REWARDS } from '@/engine/constants'

export async function POST(request: Request) {
  const auth = requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const { walletAddress } = auth

  try {
    const supabase = getServiceSupabase()

    const todayDate = new Date().toISOString().slice(0, 10) // 'YYYY-MM-DD'

    // ── Load existing daily reward record + login streak ──────────────────
    const [{ data: rewardRecord }, { data: player }] = await Promise.all([
      supabase
        .from('daily_rewards')
        .select('last_claimed_date, last_claimed_day')
        .eq('wallet_address', walletAddress)
        .single(),

      supabase
        .from('players')
        .select('login_streak')
        .eq('wallet_address', walletAddress)
        .single(),
    ])

    // ── Already claimed today? ────────────────────────────────────────────
    if (rewardRecord?.last_claimed_date === todayDate) {
      return NextResponse.json(
        { error: 'Daily reward already claimed today', alreadyClaimed: true },
        { status: 400 }
      )
    }

    // ── Determine which day in the 7-day cycle ────────────────────────────
    // Day is driven by login_streak so consistent with the game's streak display.
    // Cycles 1→2→3→4→5→6→7→1→2… indefinitely.
    // streak=0 (brand new): day 1. streak=6: day 7. streak=7: day 1 again.
    const loginStreak = player?.login_streak ?? 1
    const dayIndex = ((loginStreak - 1) % DAILY_REWARDS.length + DAILY_REWARDS.length) % DAILY_REWARDS.length
    const reward = DAILY_REWARDS[dayIndex]
    const dayNumber = reward.day

    // ── Upsert daily_rewards record (idempotency) ─────────────────────────
    // Do this BEFORE crediting resources/tokens. If the resource updates fail
    // the player loses that day's reward (recoverable) but can't double-claim.
    const { error: upsertError } = await supabase
      .from('daily_rewards')
      .upsert(
        {
          wallet_address: walletAddress,
          last_claimed_date: todayDate,
          last_claimed_day: dayNumber,
        },
        { onConflict: 'wallet_address' }
      )

    if (upsertError) {
      console.error('[daily-reward/claim] Upsert failed:', upsertError)
      return NextResponse.json({ error: 'Failed to record claim — try again' }, { status: 500 })
    }

    // ── Credit token reward to shadow ledger ──────────────────────────────
    const tokenMicroReward = reward.tokenMicroReward ?? 0

    if (tokenMicroReward > 0) {
      // reference_id 'daily_reward_<date>' ensures one token credit per calendar day.
      // UNIQUE constraint silently rejects any duplicate insert.
      await supabase.from('token_ledger').insert({
        wallet_address: walletAddress,
        event_type: 'daily_reward',
        amount: tokenMicroReward,
        reference_id: `daily_reward_${todayDate}`,
        settled: false,
      })
      // Note: we intentionally don't fail if this insert errors (e.g. duplicate).
      // The daily_rewards record is the source of truth for "was today claimed".
    }

    // ── Audit log ──────────────────────────────────────────────────────
    if (tokenMicroReward > 0) {
      await supabase.from('token_audit_log').insert({
        wallet_address: walletAddress,
        action: 'credit',
        amount: tokenMicroReward,
        reference_id: `daily_reward_${todayDate}`,
        metadata: { source: 'daily_reward', dayNumber, loginStreak },
      })
    }

    // ── Return reward info — client applies petrodollars/crude locally ────
    // Petrodollars and crude are applied client-side (consistent with architecture:
    // game state is client-managed between saves). The server only tracks
    // idempotency and handles token ledger entries.
    return NextResponse.json({
      dayNumber,
      rewardType: reward.type,
      rewardAmount: reward.amount,
      tokenMicroReward,
    })
  } catch (error) {
    console.error('[daily-reward/claim] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
