/**
 * Build and send vote instruction for hackathon_platform program (Anchor).
 * Voter must have checked in on-chain. Vote data is written to chain.
 */
import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js'

// Anchor instruction discriminator = first 8 bytes of SHA256("global:vote")
const VOTE_DISCRIMINATOR = new Uint8Array([0xe3, 0x6e, 0x9b, 0x17, 0x88, 0x7e, 0xac, 0x19])

function u64Le(n: number): Uint8Array {
  const buf = new ArrayBuffer(8)
  new DataView(buf).setBigUint64(0, BigInt(n), true)
  return new Uint8Array(buf)
}

export interface VoteParams {
  program_id: string
  event_id: number
  event_pda: string
  submission_id: number
}

/**
 * Build vote instruction. Voter is signer; requires on-chain checkin; creates vote_record PDA.
 */
export function buildVoteInstruction(
  programId: PublicKey,
  voter: PublicKey,
  eventId: number,
  eventPda: PublicKey,
  submissionId: number
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

  const [checkinPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('checkin'), eventPda.toBuffer(), voter.toBuffer()],
    programId
  )

  const submissionIdBytes = u64Le(submissionId)
  const [voteRecordPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('vote'),
      eventPda.toBuffer(),
      voter.toBuffer(),
      submissionIdBytes,
    ],
    programId
  )

  const data = new Uint8Array(VOTE_DISCRIMINATOR.length + 8)
  data.set(VOTE_DISCRIMINATOR)
  data.set(submissionIdBytes, 8)

  const keys = [
    { pubkey: voter, isSigner: true, isWritable: true },
    { pubkey: eventPda, isSigner: false, isWritable: false },
    { pubkey: checkinPda, isSigner: false, isWritable: false },
    { pubkey: voteRecordPda, isSigner: false, isWritable: true },
    { pubkey: new PublicKey('11111111111111111111111111111111'), isSigner: false, isWritable: false },
  ]

  return new TransactionInstruction({
    programId,
    keys,
    data: data as unknown as Buffer,
  })
}

/**
 * Send vote transaction; returns signature for backend POST .../vote { vote_tx_sig }.
 */
export async function sendVote(
  connection: Connection,
  voter: PublicKey,
  params: VoteParams,
  signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<string> {
  const programId = new PublicKey(params.program_id)
  const eventPda = new PublicKey(params.event_pda)

  const instruction = buildVoteInstruction(
    programId,
    voter,
    params.event_id,
    eventPda,
    params.submission_id
  )

  const tx = new Transaction().add(instruction)
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
  tx.recentBlockhash = blockhash
  tx.feePayer = voter

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
