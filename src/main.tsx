import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { browserOptionsStorage, loadPlayerOptions } from './persistence/options'
import { createResultsStore } from './persistence/results'

// Bootstrap once outside StrictMode so setup does not regenerate player identity.
const initialOptions = loadPlayerOptions(browserOptionsStorage, () => crypto.randomUUID())
const resultsStore = createResultsStore(browserOptionsStorage, initialOptions.options, () => crypto.randomUUID(), () => new Date().toISOString())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App initialOptions={initialOptions} resultsStore={resultsStore} />
  </StrictMode>,
)
