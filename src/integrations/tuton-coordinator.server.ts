import { DurableObject } from 'cloudflare:workers'
import { WriteCoordinator, type WriteRecord } from '../domain/tuton-write'
import { createTutonProvider, type TutonEnv } from './tuton-provider.server'

export class TutonCoordinator extends DurableObject<TutonEnv> {
  private coordinator: WriteCoordinator
  constructor(ctx: DurableObjectState, env: TutonEnv) {
    super(ctx, env)
    this.coordinator = new WriteCoordinator({ get: key => ctx.storage.get<WriteRecord>(key), put: (key, value) => ctx.storage.put(key, value) }, createTutonProvider(env))
  }
  async execute(owner: string, input: unknown) { return this.coordinator.execute(owner, input) }
  async receipt(owner: string, operationId: string) { return this.coordinator.receipt(owner, operationId) }
  async reconcile(owner: string, operationId: string) { return this.coordinator.reconcile(owner, operationId) }
}
