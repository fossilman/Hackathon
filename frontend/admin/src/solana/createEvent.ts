/**
 * Build and send create_event instruction for hackathon_platform program (Anchor).
 * Used when organizer publishes an event so chain has Event PDA, Treasury PDA, Attendance Mint.
 */
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'

const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
const SYSVAR_RENT_PUBKEY = new PublicKey('SysvarRent111111111111111111111111111111111')

function u64Le(n: number): Uint8Array {
  const buf = new ArrayBuffer(8)
  new DataView(buf).setBigUint64(0, BigInt(n), true)
  return new Uint8Array(buf)
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const hash = await crypto.subtle.digest('SHA-256', data as BufferSource)
  return new Uint8Array(hash)
}

async function getCreateEventDiscriminator(): Promise<Uint8Array> {
  const preimage = new TextEncoder().encode('global:create_event')
  const hash = await sha256(preimage)
  return hash.slice(0, 8)
}

/** Anchor string: 4-byte length (LE) + utf-8 bytes, max 64 for event name */
function anchorString(s: string, maxLen = 64): Uint8Array {
  const truncated = s.slice(0, maxLen)
  const utf8 = new TextEncoder().encode(truncated)
  const buf = new Uint8Array(4 + utf8.length)
  new DataView(buf.buffer).setUint32(0, utf8.length, true)
  buf.set(utf8, 4)
  return buf
}

export interface PublishChainParams {
  event_id: number
  name: string
  program_id: string
  organizer_lamports: number
}

export interface CreateEventResult {
  eventPda: string
  eventPdaHex: string
  treasuryPda: string
  attendanceMint: string
  signature: string
}

/**
 * Build create_event instruction and derive PDAs. Caller must add attendance_mint keypair (new Keypair).
 */
export async function buildCreateEventInstruction(
  programId: PublicKey,
  organizer: PublicKey,
  eventId: number,
  name: string,
  organizerLamports: number,
  attendanceMintKeypair: Keypair
): Promise<{ instruction: TransactionInstruction; eventPda: PublicKey; treasuryPda: PublicKey }> {
  const eventIdBytes = u64Le(eventId)
  const eventSeed = new TextEncoder().encode('event')
  const treasurySeed = new TextEncoder().encode('treasury')
  const [eventPda] = PublicKey.findProgramAddressSync(
    [eventSeed, eventIdBytes],
    programId
  )
  const [treasuryPda] = PublicKey.findProgramAddressSync(
    [treasurySeed, eventIdBytes],
    programId
  )

  const discriminator = await getCreateEventDiscriminator()
  const data = new Uint8Array(
    discriminator.length + 8 + anchorString(name).length + 8
  )
  let offset = 0
  data.set(discriminator, offset)
  offset += 8
  data.set(u64Le(eventId), offset)
  offset += 8
  data.set(anchorString(name), offset)
  offset += 4 + new TextEncoder().encode(name.slice(0, 64)).length
  data.set(u64Le(organizerLamports), offset)

  const keys = [
    { pubkey: organizer, isSigner: true, isWritable: true },
    { pubkey: eventPda, isSigner: false, isWritable: true },
    { pubkey: treasuryPda, isSigner: false, isWritable: true },
    { pubkey: attendanceMintKeypair.publicKey, isSigner: true, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: new PublicKey('11111111111111111111111111111111'), isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
  ]

  const instruction = new TransactionInstruction({
    programId,
    keys,
    data: data as unknown as Buffer,
  })

  return { instruction, eventPda, treasuryPda }
}

function pubkeyToHex(pubkey: PublicKey): string {
  return Array.from(pubkey.toBytes())
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Send create_event transaction and return chain data for backend.
 */
export async function sendCreateEvent(
  connection: Connection,
  organizer: PublicKey,
  params: PublishChainParams,
  signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<CreateEventResult> {
  const programId = new PublicKey(params.program_id)
  const attendanceMintKeypair = Keypair.generate()

  const { instruction: createEventIx, eventPda, treasuryPda } = await buildCreateEventInstruction(
    programId,
    organizer,
    params.event_id,
    params.name,
    params.organizer_lamports ?? 0,
    attendanceMintKeypair
  )

  const tx = new Transaction().add(createEventIx)
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
  tx.recentBlockhash = blockhash
  tx.feePayer = organizer

  const signed = await signTransaction(tx)
  signed.partialSign(attendanceMintKeypair)

  let signature: string
  try {
    signature = await connection.sendRawTransaction(signed.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    })
    await connection.confirmTransaction(
      { signature, blockhash, lastValidBlockHeight },
      'confirmed'
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (
      msg.includes('Attempt to debit') ||
      msg.includes('prior credit') ||
      msg.includes('Simulation failed') ||
      msg.includes('insufficient')
    ) {
      const e = new Error('INSUFFICIENT_BALANCE')
      e.cause = err
      throw e
    }
    throw err
  }

  return {
    eventPda: eventPda.toBase58(),
    eventPdaHex: pubkeyToHex(eventPda),
    treasuryPda: treasuryPda.toBase58(),
    attendanceMint: attendanceMintKeypair.publicKey.toBase58(),
    signature: signature!,
  }
}
