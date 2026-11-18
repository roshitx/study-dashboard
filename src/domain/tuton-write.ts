export type WriteValue = boolean | number | null
export interface WriteRequest {
  operationId: string
  offeringId: string
  sessionNumber: number
  activity: string
  expectedValue: WriteValue
  value: WriteValue
}
export interface WriteReceipt {
  operationId: string
  status: 'pending' | 'confirmed' | 'rejected' | 'uncertain'
  code?: string
  value?: WriteValue
}
export type WriteTarget = Record<string, unknown>
export interface WriteRecord {
  owner: string
  input: WriteRequest
  target?: WriteTarget
  receipt: WriteReceipt
}
export interface WriteStore {
  get(key: string): Promise<WriteRecord | undefined>
  put(key: string, value: WriteRecord): Promise<void>
}
export interface WriteProvider {
  prepare(owner: string, input: WriteRequest): Promise<WriteTarget>
  write(target: WriteTarget, value: WriteValue): Promise<void>
  read(target: WriteTarget): Promise<WriteValue>
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const fields = ['operationId', 'offeringId', 'sessionNumber', 'activity', 'expectedValue', 'value']
const validValue = (value: unknown): value is WriteValue => value === null || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))
export function parseWriteRequest(input: unknown): WriteRequest {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('invalid_input')
  const data = input as Record<string, unknown>
  if (Object.keys(data).length !== fields.length || fields.some(field => !Object.hasOwn(data, field)) ||
    typeof data.operationId !== 'string' || !uuid.test(data.operationId) ||
    typeof data.offeringId !== 'string' || !data.offeringId.trim() || data.offeringId.length > 256 ||
    typeof data.activity !== 'string' || !data.activity.trim() || data.activity.length > 128 ||
    typeof data.sessionNumber !== 'number' || !Number.isSafeInteger(data.sessionNumber) || data.sessionNumber < 1 || data.sessionNumber > 1000 ||
    !validValue(data.expectedValue) || !validValue(data.value)) throw new Error('invalid_input')
  return { operationId: data.operationId, offeringId: data.offeringId, sessionNumber: data.sessionNumber, activity: data.activity, expectedValue: data.expectedValue, value: data.value }
}

function sameRequest(a: WriteRequest, b: WriteRequest): boolean {
  return a.operationId === b.operationId && a.offeringId === b.offeringId && a.sessionNumber === b.sessionNumber && a.activity === b.activity && a.expectedValue === b.expectedValue && a.value === b.value
}
function errorCode(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : error instanceof Error ? error.message : undefined
  return typeof code === 'string' && ['mapping_changed', 'conflict', 'reconnect_required', 'rate_limited', 'formula_protected', 'invalid_value', 'invalid_checkbox', 'not_configured', 'source_too_large', 'provider_error'].includes(code) ? code : 'prepare_failed'
}

export class WriteCoordinator {
  private queue: Promise<void> = Promise.resolve()
  constructor(private readonly store: WriteStore, private readonly provider: WriteProvider) { }

  private serial<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation)
    this.queue = result.then(() => undefined, () => undefined)
    return result
  }
  private key(owner: string, operationId: string): string { return JSON.stringify([owner, operationId]) }
  private async recover(key: string, record: WriteRecord): Promise<WriteRecord> {
    if (record.receipt.status === 'pending') {
      record = { ...record, receipt: { operationId: record.input.operationId, status: 'uncertain', code: 'interrupted' } }
      await this.store.put(key, record)
    }
    return record
  }
  execute(owner: string, input: unknown): Promise<WriteReceipt> {
    return this.serial(async () => {
      const request = parseWriteRequest(input)
      const key = this.key(owner, request.operationId)
      let record = await this.store.get(key)
      if (record) {
        if (record.owner !== owner || !sameRequest(record.input, request)) return { operationId: request.operationId, status: 'rejected', code: 'operation_id_conflict' }
        return (await this.recover(key, record)).receipt
      }
      let target: WriteTarget
      try { target = await this.provider.prepare(owner, request) } catch (error) {
        const receipt: WriteReceipt = { operationId: request.operationId, status: 'rejected', code: errorCode(error) }
        await this.store.put(key, { owner, input: request, receipt })
        return receipt
      }
      record = { owner, input: request, target, receipt: { operationId: request.operationId, status: 'pending' } }
      await this.store.put(key, record)
      try {
        await this.provider.write(target, request.value)
        const value = await this.provider.read(target)
        record.receipt = value === request.value ? { operationId: request.operationId, status: 'confirmed', value } : { operationId: request.operationId, status: 'uncertain', code: 'readback_mismatch', value }
      } catch {
        record.receipt = { operationId: request.operationId, status: 'uncertain', code: 'dispatch_uncertain' }
      }
      await this.store.put(key, record)
      return record.receipt
    })
  }
  receipt(owner: string, operationId: string): Promise<WriteReceipt | undefined> {
    return this.serial(async () => {
      const key = this.key(owner, operationId); const record = await this.store.get(key)
      if (!record || record.owner !== owner) return undefined
      return (await this.recover(key, record)).receipt
    })
  }
  reconcile(owner: string, operationId: string): Promise<WriteReceipt | undefined> {
    return this.serial(async () => {
      const key = this.key(owner, operationId); let record = await this.store.get(key)
      if (!record || record.owner !== owner) return undefined
      record = await this.recover(key, record)
      if (record.receipt.status !== 'uncertain' || !record.target) return record.receipt
      try {
        const value = await this.provider.read(record.target)
        record.receipt = value === record.input.value ? { operationId, status: 'confirmed', value } : { operationId, status: 'uncertain', code: 'readback_mismatch', value }
      } catch {
        record.receipt = { operationId, status: 'uncertain', code: 'readback_failed' }
      }
      await this.store.put(key, record)
      return record.receipt
    })
  }
}
