import { setupWorker } from 'msw/browser'
import { handlers } from '../mocks/handlers'

export const worker = setupWorker(...handlers)

export async function startMockWorker() {
  if (import.meta.env?.CONTEXT_VITEST !== true) return
  await worker.start({
    onUnhandledRequest: 'bypass',
  })
}
