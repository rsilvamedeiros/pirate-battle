import { useEffect, useRef, useState } from 'react'
import { defaultGameplayConfig, gameplayOptionLimits, validateGameplayConfig } from '../core/config'
import type { PlayerOptions } from '../persistence/options'
import type { FormEvent } from 'react'

interface OptionsScreenProps {
  options: Readonly<PlayerOptions>
  onSave(options: Readonly<PlayerOptions>): boolean
  onBack(): void
}

type OptionField = 'sessionTime' | 'enemySpawnInterval'

const fields = [
  { name: 'sessionTime', label: 'Game session time' },
  { name: 'enemySpawnInterval', label: 'Enemy spawn time' },
] as const

export function OptionsScreen({ options, onSave, onBack }: OptionsScreenProps) {
  const [values, setValues] = useState({
    sessionTime: String(options.sessionTime),
    enemySpawnInterval: String(options.enemySpawnInterval),
  })
  const [errors, setErrors] = useState<Partial<Record<OptionField, string>>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [storageError, setStorageError] = useState<string | null>(null)
  const sessionInput = useRef<HTMLInputElement>(null)
  const spawnInput = useRef<HTMLInputElement>(null)
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => { heading.current?.focus() }, [])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    setStorageError(null)
    const result = validateGameplayConfig({
      ...defaultGameplayConfig,
      sessionTime: values.sessionTime.trim() === '' ? NaN : Number(values.sessionTime),
      enemySpawnInterval: values.enemySpawnInterval.trim() === '' ? NaN : Number(values.enemySpawnInterval),
    })
    if (!result.valid) {
      const nextErrors: Partial<Record<OptionField, string>> = {}
      for (const issue of result.issues) {
        if (issue.field === 'sessionTime' || issue.field === 'enemySpawnInterval') nextErrors[issue.field] = issue.message
      }
      setErrors(nextErrors)
      if (nextErrors.sessionTime) sessionInput.current?.focus()
      else spawnInput.current?.focus()
      return
    }
    setErrors({})
    const nextOptions = Object.freeze({
      ...options,
      sessionTime: result.config.sessionTime,
      enemySpawnInterval: result.config.enemySpawnInterval,
    })
    if (!onSave(nextOptions)) {
      setStorageError('Options could not be saved. Your previous settings are unchanged. Check browser storage and try again.')
      return
    }
    setMessage('Options saved. Changes apply to your next match.')
  }

  return (
    <section aria-labelledby="options-heading" className="options-screen">
      <h1 id="options-heading" tabIndex={-1} ref={heading}>Options</h1>
      <p className="intro">Prepare your next voyage.</p>
      <form onSubmit={submit} noValidate>
        {fields.map(({ name, label }) => {
          const limits = gameplayOptionLimits[name]
          return (
            <div className="option-field" key={name}>
              <label htmlFor={name}>{label}</label>
              <div className="number-control">
                <input
                  ref={name === 'sessionTime' ? sessionInput : spawnInput}
                  id={name}
                  name={name}
                  type="number"
                  inputMode="decimal"
                  min={limits.min}
                  max={limits.max}
                  step="any"
                  required
                  value={values[name]}
                  aria-invalid={Boolean(errors[name])}
                  aria-describedby={`${name}-hint${errors[name] ? ` ${name}-error` : ''}`}
                  onChange={(event) => {
                    setValues((current) => ({ ...current, [name]: event.target.value }))
                    setErrors((current) => ({ ...current, [name]: undefined }))
                    setMessage(null)
                    setStorageError(null)
                  }}
                />
                <span aria-hidden="true">seconds</span>
              </div>
              <p className="field-hint" id={`${name}-hint`}>{limits.min}–{limits.max} seconds</p>
              {errors[name] && <p className="field-error" id={`${name}-error`} role="alert">{errors[name]}</p>}
            </div>
          )
        })}
        <div className="save-feedback">
          <p role="status">{message}</p>
          {storageError && <p className="field-error" role="alert">{storageError}</p>}
        </div>
        <div className="form-actions">
          <button className="primary-button" type="submit">Save</button>
          <button className="secondary-button" type="button" onClick={onBack}>Main Menu</button>
        </div>
      </form>
      <p className="field-hint footer-hint">Only saved settings are used for a new match.</p>
    </section>
  )
}
