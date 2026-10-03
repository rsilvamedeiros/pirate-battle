import sharedStyles from '../styles/ui.module.scss'
import styles from './SessionDialog.module.scss'
import { useEffect, useRef, useSyncExternalStore } from 'react'
import type { SimulationState } from '../core/simulation'
import type { ResultsStore } from '../persistence/results'
import { ResultDetails } from './ResultDetails'

interface SessionDialogProps {
  status: Exclude<SimulationState['status'], 'running'>
  endReason: SimulationState['endReason']
  resultsStore: ResultsStore
  onExit(): void
  onRestart(): void
  onResume(): void
}

export function SessionDialog({
  status,
  endReason,
  resultsStore,
  onExit,
  onRestart,
  onResume,
}: SessionDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  const completed = status === 'completed'
  const dead = endReason === 'player-death'
  const { lastResult } = useSyncExternalStore(resultsStore.subscribe, resultsStore.getSnapshot)
  useEffect(() => {
    const element = dialog.current!
    element.showModal()
    return () => {
      element.close()
    }
  }, [])
  return (
    <dialog
      ref={dialog}
      className={styles['session-dialog']}
      aria-labelledby="session-dialog-heading"
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const controls = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((element) => element.getClientRects().length > 0)
        const first = controls[0],
          last = controls.at(-1)
        if (!first || !last) return
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }}
      onCancel={(event) => {
        event.preventDefault()
        if (!completed) onResume()
      }}
    >
      <h2 id="session-dialog-heading">{completed ? 'Voyage complete' : 'Paused'}</h2>
      <p>
        {completed
          ? dead
            ? 'Your ship was destroyed.'
            : 'Time expired. Your voyage has ended.'
          : 'Take a breath. Resume when you are ready.'}
      </p>
      {completed && lastResult && <ResultDetails result={lastResult} store={resultsStore} />}
      {completed ? (
        <button type="button" className={sharedStyles['primary-button']} onClick={onRestart}>
          Play Again
        </button>
      ) : (
        <button type="button" className={sharedStyles['primary-button']} onClick={onResume}>
          Resume
        </button>
      )}
      <button type="button" className={sharedStyles['secondary-button']} onClick={onExit}>
        Main Menu
      </button>
    </dialog>
  )
}
