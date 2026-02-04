/**
 * 前端构建 publish_activity 交易并用 Phantom 签名，供活动发布使用。
 * 发布密钥由用户钱包授权，后端不配置 SOLANA_AUTHORITY_KEY。
 */
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  Connection,
} from '@solana/web3.js'

// 与合约 target/idl/hackathon.json 中 publish_activity.discriminator 一致
const ANCHOR_DISCRIMINATOR_PUBLISH_ACTIVITY = new Uint8Array([
  20, 103, 95, 10, 205, 95, 194, 150,
])

export interface PreparePublishData {
  program_id: string
  rpc_url: string
  activity_id: number
  title: string
  description_hash_hex: string
}

function u64LeBytes(n: number): Uint8Array {
  const buf = new ArrayBuffer(8)
  new DataView(buf).setBigUint64(0, BigInt(n), true)
  return new Uint8Array(buf)
}

function encodePublishActivityInstruction(
  activityId: number,
  title: string,
  descriptionHashHex: string
): Uint8Array {
  const titleBytes = new TextEncoder().encode(title)
  const descHash = new Uint8Array(32)
  for (let i = 0; i < 32 && i * 2 < descriptionHashHex.length; i++) {
    descHash[i] = parseInt(descriptionHashHex.slice(i * 2, i * 2 + 2), 16)
  }
  const len = 8 + 8 + 4 + titleBytes.length + 32
  const data = new Uint8Array(len)
  let off = 0
  data.set(ANCHOR_DISCRIMINATOR_PUBLISH_ACTIVITY, off)
  off += 8
  data.set(u64LeBytes(activityId), off)
  off += 8
  new DataView(data.buffer).setUint32(off, titleBytes.length, true)
  off += 4
  data.set(titleBytes, off)
  off += titleBytes.length
  data.set(descHash, off)
  return data
}

/** 根据 authority 与 activity_id 推导链上 activity PDA */
export function deriveActivityPDA(
  authority: PublicKey,
  activityId: number,
  programId: PublicKey
): [PublicKey, number] {
  const seeds = [
    new TextEncoder().encode('activity'),
    authority.toBuffer(),
    u64LeBytes(activityId),
  ]
  return PublicKey.findProgramAddressSync(seeds, programId)
}

/**
 * 构建未签名的 publish_activity 交易并返回（用于 Phantom 签名）
 * recentBlockhash 需从 RPC 获取后传入
 */
export function buildPublishActivityTransaction(
  prepare: PreparePublishData,
  authority: PublicKey,
  recentBlockhash: string
): { transaction: Transaction; activityPDA: PublicKey } {
  const programId = new PublicKey(prepare.program_id)
  const [activityPDA] = deriveActivityPDA(authority, prepare.activity_id, programId)
  const data = encodePublishActivityInstruction(
    prepare.activity_id,
    prepare.title,
    prepare.description_hash_hex
  )
  const keys = [
    { pubkey: authority, isSigner: true, isWritable: true },
    { pubkey: activityPDA, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ]
  const ix = new TransactionInstruction({
    programId,
    keys,
    data: data,
  })
  const transaction = new Transaction().add(ix)
  transaction.recentBlockhash = recentBlockhash
  transaction.feePayer = authority
  return { transaction, activityPDA }
}

/**
 * 使用 Phantom 签名交易，返回 base64 序列化（供后端提交）
 */
export async function signTransactionWithPhantom(transaction: Transaction): Promise<string> {
  const phantom = (window as any).phantom?.solana
  if (!phantom || typeof phantom.signTransaction !== 'function') {
    throw new Error('请安装并连接 Phantom 钱包后再发布')
  }
  const signed = await phantom.signTransaction(transaction)
  const serialized = signed.serialize()
  const base64 = btoa(String.fromCharCode(...new Uint8Array(serialized)))
  return base64
}

/**
 * 获取最新 blockhash（用于设置 transaction 并签名）
 */
export async function getLatestBlockhash(rpcUrl: string): Promise<string> {
  const connection = new Connection(rpcUrl)
  const { value } = await connection.getLatestBlockhashAndContext('finalized')
  return value.blockhash
}
