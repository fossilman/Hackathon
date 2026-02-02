/**
 * Build and send distribute instruction for hackathon_platform program (Anchor).
 * Organizer signs; treasury pays winners, organizer refund, sponsor refunds.
 */
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'

function u64Le(n: number): Uint8Array {
  const buf = new ArrayBuffer(8)
  new DataView(buf).setBigUint64(0, BigInt(n), true)
  return new Uint8Array(buf)
}

function u32Le(n: number): Uint8Array {
  const buf = new ArrayBuffer(4)
  new DataView(buf).setUint32(0, n, true)
  return new Uint8Array(buf)
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest('SHA-256', data as BufferSource)
  return new Uint8Array(hash)
}

async function getDistributeDiscriminator(): Promise<Uint8Array> {
  const preimage = new TextEncoder().encode('global:distribute')
  const hash = await sha256(preimage)
  return hash.slice(0, 8)
}

export interface DistributionParams {
  program_id: string
  event_id: number
  event_pda: string
  treasury_pda: string
  winner_wallets: string[]
  winner_amounts: number[]
  organizer_wallet: string
  organizer_refund: number
  sponsor_wallets: string[]
  sponsor_refunds: number[]
}

/**
 * Build distribute instruction data (Anchor: discriminator + Vec<Pubkey> + Vec<u64> + u64 + Vec<u64> + Vec<Pubkey>).
 */
async function buildDistributeData(params: DistributionParams): Promise<Uint8Array> {
  const disc = await getDistributeDiscriminator()
  const parts: Uint8Array[] = [disc]

  const winnerWallets = params.winner_wallets.map((w) => new PublicKey(w))
  parts.push(u32Le(winnerWallets.length))
  for (const w of winnerWallets) {
    parts.push(new Uint8Array(w.toBytes()))
  }

  parts.push(u32Le(params.winner_amounts.length))
  for (const a of params.winner_amounts) {
    parts.push(u64Le(a))
  }

  parts.push(u64Le(params.organizer_refund))

  parts.push(u32Le(params.sponsor_refunds.length))
  for (const a of params.sponsor_refunds) {
    parts.push(u64Le(a))
  }

  const sponsorWallets = params.sponsor_wallets.map((w) => new PublicKey(w))
  parts.push(u32Le(sponsorWallets.length))
  for (const w of sponsorWallets) {
    parts.push(new Uint8Array(w.toBytes()))
  }

  const totalLen = parts.reduce((s, p) => s + p.length, 0)
  const out = new Uint8Array(totalLen)
  let offset = 0
  for (const p of parts) {
    out.set(p, offset)
    offset += p.length
  }
  return out
}

/**
 * Build and send distribute transaction; organizer must sign.
 */
export async function sendDistribute(
  connection: Connection,
  organizer: PublicKey,
  params: DistributionParams,
  signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<string> {
  const programId = new PublicKey(params.program_id)
  const eventPda = new PublicKey(params.event_pda)
  const treasuryPda = new PublicKey(params.treasury_pda)

  const eventIdBytes = u64Le(params.event_id)
  const eventSeed = new TextEncoder().encode('event')
  const [eventPdaDerived] = PublicKey.findProgramAddressSync(
    [eventSeed, eventIdBytes],
    programId
  )
  if (!eventPdaDerived.equals(eventPda)) {
    throw new Error('Event PDA mismatch')
  }

  const data = await buildDistributeData(params)
  const keys = [
    { pubkey: organizer, isSigner: true, isWritable: true },
    { pubkey: eventPda, isSigner: false, isWritable: false },
    { pubkey: treasuryPda, isSigner: false, isWritable: true },
  ]

  const instruction = new TransactionInstruction({
    programId,
    keys,
    data: data as unknown as Buffer,
  })

  const tx = new Transaction().add(instruction)
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
  tx.recentBlockhash = blockhash
  tx.feePayer = organizer

  const signed = await signTransaction(tx)
  const signature = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  })
  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    'confirmed'
  )
  return signature
}
