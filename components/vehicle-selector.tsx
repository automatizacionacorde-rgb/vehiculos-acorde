'use client'

import Script from 'next/script'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Info, Loader2, ShieldCheck } from 'lucide-react'
import { getOptions, type Option } from '@/lib/vehicles/options'

// Modo widget para Jotform (iFrame widget): https://www.jotform.com/developers/widgets/
type JFCustomWidgetApi = {
  subscribe: (event: 'ready' | 'submit', callback: () => void) => void
  sendData: (data: { value: string }) => void
  sendSubmit: (data: { valid: boolean; value: string }) => void
  requestFrameResize: (data: { height?: number; width?: number }) => void
}
declare global { interface Window { JFCustomWidget?: JFCustomWidgetApi } }

type FieldProps = {
  label: string
  value: string
  options: Option[]
  disabled?: boolean
  loading?: boolean
  onChange: (value: string) => void
}

function SelectField({ label, value, options, disabled, loading, onChange }: FieldProps) {
  return (
    <label className="field-group">
      <span className="field-label">{label}</span>
      <span className="select-wrap">
        <select
          className="vehicle-select"
          value={value}
          disabled={disabled || loading}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{loading ? 'Cargando opciones…' : `Selecciona ${label.toLowerCase()}`}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {loading ? <Loader2 aria-hidden="true" className="select-icon animate-spin" size={18} /> : <ChevronDown aria-hidden="true" className="select-icon" size={18} />}
      </span>
    </label>
  )
}

export function VehicleSelector({ widget = false }: { widget?: boolean }) {
  const [marca, setMarca] = useState('')
  const [modelo, setModelo] = useState('')
  const [anio, setAnio] = useState('')
  const [version, setVersion] = useState('')
  const [versionLabel, setVersionLabel] = useState('')
  const [marcas, setMarcas] = useState<Option[]>([])
  const [modelos, setModelos] = useState<Option[]>([])
  const [anios, setAnios] = useState<Option[]>([])
  const [versiones, setVersiones] = useState<Option[]>([])
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    setLoading('marca')
    getOptions('/api/vehicles/marcas').then(setMarcas).catch(() => setError('No se pudieron cargar las marcas.')).finally(() => setLoading(''))
  }, [])

  useEffect(() => {
    if (!marca) return
    setLoading('modelo'); setError(''); setModelos([]); setAnios([]); setVersiones([])
    getOptions(`/api/vehicles/modelos?marca=${encodeURIComponent(marca)}`).then(setModelos).catch(() => setError('No se pudieron cargar los modelos.')).finally(() => setLoading(''))
  }, [marca])

  useEffect(() => {
    if (!marca || !modelo) return
    setLoading('anio'); setError(''); setAnios([]); setVersiones([])
    getOptions(`/api/vehicles/anios?marca=${encodeURIComponent(marca)}&modelo=${encodeURIComponent(modelo)}`).then(setAnios).catch(() => setError('No se pudieron cargar los años.')).finally(() => setLoading(''))
  }, [marca, modelo])

  useEffect(() => {
    if (!marca || !modelo || !anio) return
    setLoading('version'); setError(''); setVersiones([])
    getOptions(`/api/vehicles/versiones?marca=${encodeURIComponent(marca)}&modelo=${encodeURIComponent(modelo)}&anio=${encodeURIComponent(anio)}`).then(setVersiones).catch(() => setError('No se pudieron cargar las versiones.')).finally(() => setLoading(''))
  }, [marca, modelo, anio])

  const complete = useMemo(() => Boolean(marca && modelo && anio && version), [marca, modelo, anio, version])

  async function submit() {
    setSending(true); setError('')
    try {
      const response = await fetch('/api/jotform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId: version }),
      })
      const data = await response.json().catch(() => ({})) as { error?: string }
      if (!response.ok) throw new Error(data.error ?? 'No se pudo enviar la solicitud.')
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la solicitud.')
    } finally {
      setSending(false)
    }
  }

  // Valor que recibe el campo de Jotform: "MARCA | MODELO | AÑO | VERSIÓN".
  const widgetValue = complete
    ? [marcas.find((o) => o.value === marca)?.label ?? marca, modelos.find((o) => o.value === modelo)?.label ?? modelo, anios.find((o) => o.value === anio)?.label ?? anio, versionLabel].join(' | ')
    : ''
  const rootRef = useRef<HTMLElement>(null)
  const valueRef = useRef(widgetValue)
  valueRef.current = widgetValue
  const [jotformReady, setJotformReady] = useState(false)
  const [readyTick, setReadyTick] = useState(0)

  useEffect(() => {
    if (widget && jotformReady) window.JFCustomWidget?.sendData({ value: widgetValue })
  }, [widget, jotformReady, readyTick, widgetValue])

  // Ajusta el alto del iframe al contenido para que no aparezca scroll.
  useEffect(() => {
    const root = rootRef.current
    if (!widget || !jotformReady || !root) return
    const resize = () => window.JFCustomWidget?.requestFrameResize({ height: Math.ceil(root.getBoundingClientRect().height) })
    const observer = new ResizeObserver(resize)
    observer.observe(root)
    return () => observer.disconnect()
  }, [widget, jotformReady, readyTick])

  // El aviso 'ready' de Jotform puede llegar antes de suscribirnos, así que nada depende de él:
  // el envío y el valor se registran en cuanto carga el SDK, y 'ready' solo reenvía el valor.
  function onJotformLoad() {
    const api = window.JFCustomWidget
    if (!api) return
    api.subscribe('submit', () => api.sendSubmit({ valid: valueRef.current !== '', value: valueRef.current }))
    api.subscribe('ready', () => setReadyTick((tick) => tick + 1))
    setJotformReady(true)
  }

  function changeMarca(value: string) { setSent(false); setMarca(value); setModelo(''); setAnio(''); setVersion(''); setVersionLabel('') }
  function changeModelo(value: string) { setSent(false); setModelo(value); setAnio(''); setVersion(''); setVersionLabel('') }
  function changeAnio(value: string) { setSent(false); setAnio(value); setVersion(''); setVersionLabel('') }
  function changeVersion(value: string) {
    setSent(false)
    setVersion(value)
    setVersionLabel(versiones.find((option) => option.value === value)?.label ?? '')
  }

  return (
    <main className={widget ? 'selector-page widget-embed' : 'selector-page'} ref={rootRef}>
      {widget && <Script src="https://js.jotform.com/JotFormCustomWidget.min.js" strategy="afterInteractive" onLoad={onJotformLoad} />}
      <section className="selector-shell" aria-labelledby="selector-title">
        <div className="brand-mark" aria-hidden="true"><ShieldCheck size={22} strokeWidth={2.5} /></div>
        <p className="eyebrow">Cotización de seguro · Uso particular</p>
        <h1 id="selector-title">Identifica tu vehículo</h1>
        <p className="intro">Selecciona los datos de tu vehículo para continuar con tu cotización.</p>
        <p className="particular-note" role="note"><Info size={16} aria-hidden="true" /><span>Por ahora el cotizador está disponible únicamente para vehículos de uso <strong>particular</strong>.</span></p>

        <div className="progress" aria-label="Progreso de selección">
          {[['01', 'Marca', Boolean(marca)], ['02', 'Modelo', Boolean(modelo)], ['03', 'Año', Boolean(anio)], ['04', 'Versión', Boolean(version)]].map(([number, label, done], index) => (
            <div className={`progress-step ${done ? 'is-done' : ''}`} key={label as string}>
              <span className="step-number">{done ? <Check size={14} /> : number}</span>
              <span>{label}</span>
              {index < 3 && <span className="progress-line" aria-hidden="true" />}
            </div>
          ))}
        </div>

        <div className="selector-form">
          <SelectField label="Marca" value={marca} options={marcas} loading={loading === 'marca'} onChange={changeMarca} />
          <SelectField label="Modelo" value={modelo} options={modelos} disabled={!marca} loading={loading === 'modelo'} onChange={changeModelo} />
          <SelectField label="Año" value={anio} options={anios} disabled={!modelo} loading={loading === 'anio'} onChange={changeAnio} />
          <SelectField label="Versión" value={version} options={versiones} disabled={!anio} loading={loading === 'version'} onChange={changeVersion} />
        </div>

        {error && <p className="error-message" role="alert">{error}</p>}
        {!widget && complete && !sent && <button type="button" className="submit-button" onClick={submit} disabled={sending}>{sending ? <><Loader2 aria-hidden="true" className="animate-spin" size={18} /> Enviando…</> : 'Enviar solicitud'}</button>}
        {!widget && sent && <div className="selection-confirmation" role="status"><Check size={18} /><div><strong>Solicitud enviada</strong><span>Recibimos los datos de tu vehículo.</span></div></div>}
        {complete && <div className="selection-confirmation" role="status"><Check size={18} /><div><strong>Vehículo identificado</strong><span>{marca} {modelo} {anio} · {versionLabel}</span></div></div>}
      </section>
    </main>
  )
}

export default VehicleSelector
