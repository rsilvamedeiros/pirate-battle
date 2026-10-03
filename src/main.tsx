import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.scss'
import App from './App.tsx'
import { browserOptionsStorage, loadPlayerOptions } from './persistence/options'
import { createResultsStore } from './persistence/results'
import { createDataRuntime } from './api/runtime'
import { QueryClientProvider } from '@tanstack/react-query'

// Bootstrap once outside StrictMode so setup does not regenerate player identity.
const initialOptions = loadPlayerOptions(browserOptionsStorage, () => crypto.randomUUID())
const resultsStore = createResultsStore(
  browserOptionsStorage,
  initialOptions.options,
  () => crypto.randomUUID(),
  () => new Date().toISOString(),
)
const dataRuntime = createDataRuntime(resultsStore, browserOptionsStorage, initialOptions.options)
void dataRuntime.start()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={dataRuntime.client}>
      <App initialOptions={initialOptions} resultsStore={resultsStore} dataRuntime={dataRuntime} />
    </QueryClientProvider>
  </StrictMode>,
)
