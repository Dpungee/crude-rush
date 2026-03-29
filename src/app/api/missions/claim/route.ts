import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase-server'
import { requireAuth } from '@/lib/auth-middleware'
import { MISSION_DEFINITIONS } from '@/data/missions'

export async function POST(request: Request) {
  const auth = requireAuth(request)
  if (auth instanceof NextResponse) return auth
  const { walletAddress } = auth

  try {
    const { missionKey } = await request.json()

    if (!missionKey || typeof missionKey !== 'string') {
      return NextResponse.json({ error: 'Missing missionKey' }, { status: 400 })
    }

    // Validate the mission key exists in our definitions
    const def = MISSION_DEFINITIONS.find((d) => d.key === missionKey)
    if (!def) {
      return NextResponse.json({ error: 'Unknown mission' }, { status: 400 })
    }

    const supabase = getServiceSupabase()

    // ── Load server-side mission state ────────────────────────────────────
    // Mission progress is periodically saved by the save route.
    // This is the anti-cheat check: we verify completion on the server,
    // not on the client. A user cannot claim a mission they haven't
    // actually completed — the server's record must show completed=true.
    const { data: mission, error: missionError } = await supabase
      .from('missions')
      .select('mission_key, completed, claimed, progress, target, server_verified')
      .eq('wallet_address', walletAddress)
      .eq('mission_key', missionKey)
      .single()

    if (missionError || !mission) {
      return NextResponse.json(
        { error: 'Mission progress not synced yet — wait for auto-save and try again' },
        { status: 404 }
      )
    }

    if (!mission.completed) {
      return NextResponse.json({ error: 'Mission not completed' }, { status: 400 })
    }

    // Double-check: server must have verified completion via the save route.
    // This prevents a client from setting completed=true directly in the DB
    // via a tampered save payload (the save route now computes completed
    // server-side from progress >= target).
    if (!mission.server_verified) {
      // Re-verify inline: maybe the server_verified column hasn't been
      // backfilled yet. Check progress >= target with canonical definition.
      if (mission.progress < def.target) {
        return NextResponse.json({ error: 'Mission completion not verified by server' }, { status: 400 })
      }
    }

    if (mission.claimed) {
      // Idempotent: already claimed — return success so UI can sync
      return NextResponse.json({
        petrodollarReward: 0,
        tokenMicroReward: 0,
        alreadyClaimed: true,
      })
    }

    // ── Mark claimed atomically ───────────────────────────────────────────
    // Set claimed=true FIRST before inserting to token_ledger.
    // If the token_ledger insert fails after this, the player loses a token
    // reward (recoverable by support) but cannot double-claim.
    // The opposite order (ledger first) would allow double-claiming.
    const { error: updateError } = await supabase
      .from('missions')
      .update({ claimed: true, updated_at: new Date().toISOString() })
      .eq('wallet_address', walletAddress)
      .eq('mission_key', missionKey)
      .eq('claimed', false) // guard against race condition

    if (updateError) {
      console.error('[missions/claim] Failed to mark claimed:', updateError)
      return NextResponse.json({ error: 'Claim failed — try again' }, { status: 500 })
    }

    // ── Credit token reward to shadow ledger ──────────────────────────────
    const tokenMicroReward = def.tokenMicroReward ?? 0

    if (tokenMicroReward > 0) {
      // reference_id ensures idempotency: if this insert fails and the client
      // retries, the UNIQUE constraint on reference_id silently rejects the
      // duplicate rather than double-crediting.
      const { error: ledgerError } = await supabase.from('token_ledger').insert({
        wallet_address: walletAddress,
        event_type: 'mission_reward',
        amount: tokenMicroReward,
        reference_id: `mission_${missionKey}`,
        settled: false,
      })

      if (ledgerError && !ledgerError.message.includes('duplicate')) {
        // Non-duplicate error — log but don't fail the claim. Petrodollars
        // were already awarded. Token shortfall can be corrected manually.
        console.error('[missions/claim] Ledger insert failed:', ledgerError)
      }
    }

    // ── Audit log ──────────────────────────────────────────────────────
    await supabase.from('token_audit_log').insert({
      wallet_address: walletAddress,
      action: 'credit',
      amount: tokenMicroReward,
      reference_id: `mission_${missionKey}`,
      metadata: { source: 'mission_claim', missionKey, petrodollarReward: def.rewardAmount },
    })

    return NextResponse.json({
      petrodollarReward: def.rewardAmount,
      tokenMicroReward,
    })
  } catch (error) {
    console.error('[missions/claim] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
