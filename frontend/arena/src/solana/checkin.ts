/**
 * Build and send checkin instruction for hackathon_platform program (Anchor).
 * Participant signs; on-chain checkin record + 1 attendance NFT minted to participant ATA.
 */
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'

const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
const SYSVAR_RENT_PUBKEY = new PublicKey('SysvarRent111111111111111111111111111111111')

function getAssociatedTokenAddressSync(mint: PublicKey, owner: PublicKey): PublicKey {
  const [ata] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )
  return ata
}

function u64Le(n: number): Uint8Array {
  const buf = new ArrayBuffer(8)
  new DataView(buf).setBigUint64(0, BigInt(n), true)
  return new Uint8Array(buf)
}

// Anchor instruction discriminator = first 8 bytes of SHA256("global:checkin") (raw method name)
// Precomputed to avoid encoding/async mismatch with on-chain program.
const CHECKIN_DISCRIMINATOR = new Uint8Array([0xdf, 0xaf, 0xa5, 0x1b, 0x7b, 0x07, 0x36, 0xfc])

export interface CheckinParams {
  program_id: string
  event_id: number
  event_pda: string
  attendance_mint: string
}

/**
 * Build checkin instruction. Participant is signer; PDAs: event, checkin_record; ATA for participant + attendance_mint.
 */
export function buildCheckinInstruction(
  programId: PublicKey,
  participant: PublicKey,
  eventId: number,
  eventPda: PublicKey,
  attendanceMint: PublicKey
): TransactionInstruction {
  const eventIdBytes = u64Le(eventId)
  const eventSeed = new TextEncoder().encode('event')
  const [eventPdaDerived] = PublicKey.findProgramAddressSync(
    [eventSeed, eventIdBytes],
    programId
  )
  if (!eventPdaDerived.equals(eventPda)) {
    throw new Error('Event PDA mismatch')
  }

  const [checkinRecordPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('checkin'), eventPda.toBuffer(), participant.toBuffer()],
    programId
  )

  const participantAta = getAssociatedTokenAddressSync(
    attendanceMint,
    participant
  )

  const data = new Uint8Array(CHECKIN_DISCRIMINATOR.length)
  data.set(CHECKIN_DISCRIMINATOR)

  const keys = [
    { pubkey: participant, isSigner: true, isWritable: true },
    { pubkey: eventPda, isSigner: false, isWritable: true },
    { pubkey: checkinRecordPda, isSigner: false, isWritable: true },
    { pubkey: participantAta, isSigner: false, isWritable: true },
    { pubkey: attendanceMint, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: new PublicKey('11111111111111111111111111111111'), isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
  ]

  return new TransactionInstruction({
    programId,
    keys,
    data: data as unknown as Buffer,
  })
}

/**
 * Send checkin transaction; returns signature for backend POST .../checkin { checkin_tx_sig }.
 */
export async function sendCheckin(
  connection: Connection,
  participant: PublicKey,
  params: CheckinParams,
  signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<string> {
  const programId = new PublicKey(params.program_id)
  const eventPda = new PublicKey(params.event_pda)
  const attendanceMint = new PublicKey(params.attendance_mint)

  const instruction = buildCheckinInstruction(
    programId,
    participant,
    params.event_id,
    eventPda,
    attendanceMint
  )

  const tx = new Transaction().add(instruction)
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
  tx.recentBlockhash = blockhash
  tx.feePayer = participant

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
