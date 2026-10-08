'use client'

import Script from 'next/script'
import { useEffect, useId, useRef, useState } from 'react'
import { getOptions, type Option } from '@/lib/vehicles/options'

// Widget para Jotform (iFrame widget): https://www.jotform.com/developers/widgets/
type JFCustomWidgetApi = {
  subscribe: (event: 'ready' | 'submit', callback: () => void) => void
  sendData: (data: { value: string }) => void
  sendSubmit: (data: { valid: boolean; value: string }) => void
  requestFrameResize: (data: { height?: number; width?: number }) => void
}
declare global { interface Window { JFCustomWidget?: JFCustomWidgetApi } }

type Level = { text: string; selected: Option | null; options: Option[] }
const empty: Level = { text: '', selected: null, options: [] }

function findOption(options: Option[], text: string) {
  const wanted = text.trim().toLowerCase()
  return wanted ? options.find((option) => option.label.toLowerCase() === wanted) ?? null : null
}

type FieldProps = {
  label: string
  level: Level
  disabled?: boolean
  loading?: boolean
  onText: (text: string) => void
}

function ComboField({ label, level, disabled, loading, onText }: FieldProps) {
  const listId = useId()
  const invalid = level.text.trim() !== '' && !level.selected && !loading
  return (
    <label className="widget-field">
      <span className="widget-label">{label}</span>
      <input
        className={`widget-input ${invalid ? 'is-invalid' : ''}`}
        list={listId}
        value={level.text}
        disabled={disabled || loading}
        placeholder={loading ? 'Cargando opciones…' : `Escribe o elige ${label.toLowerCase()}`}
        autoComplete="off"
        onChange={(event) => onText(event.target.value)}
      />
      <datalist id={listId}>
        {level.options.map((option) => <option key={option.value} value={option.label} />)}
      </datalist>
    </label>
  )
}

export function VehicleWidget() {
  const [marca, setMarca] = useState<Level>(empty)
  const [modelo, setModelo] = useState<Level>(empty)
  const [anio, setAnio] = useState<Level>(empty)
  const [version, setVersion] = useState<Level>(empty)
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')
  const [jotformReady, setJotformReady] = useState(false)

  const marcaId = marca.selected?.value
  const modeloId = modelo.selected?.value
  const anioId = anio.selected?.value

  useEffect(() => {
    setLoading('marca')
    getOptions('/api/vehicles/marcas').then((options) => setMarca((prev) => ({ ...prev, options }))).catch(() => setError('No se pudieron cargar las marcas.')).finally(() => setLoading(''))
  }, [])

  useEffect(() => {
    if (!marcaId) return
    setLoading('modelo'); setError('')
    getOptions(`/api/vehicles/modelos?marca=${encodeURIComponent(marcaId)}`).then((options) => setModelo({ ...empty, options })).catch(() => setError('No se pudieron cargar los modelos.')).finally(() => setLoading(''))
  }, [marcaId])

  useEffect(() => {
    if (!marcaId || !modeloId) return
    setLoading('anio'); setError('')
    getOptions(`/api/vehicles/anios?marca=${encodeURIComponent(marcaId)}&modelo=${encodeURIComponent(modeloId)}`).then((options) => setAnio({ ...empty, options })).catch(() => setError('No se pudieron cargar los años.')).finally(() => setLoading(''))
  }, [marcaId, modeloId])

  useEffect(() => {
    if (!marcaId || !modeloId || !anioId) return
    setLoading('version'); setError('')
    getOptions(`/api/vehicles/versiones?marca=${encodeURIComponent(marcaId)}&modelo=${encodeURIComponent(modeloId)}&anio=${encodeURIComponent(anioId)}`).then((options) => setVersion({ ...empty, options })).catch(() => setError('No se pudieron cargar las versiones.')).finally(() => setLoading(''))
  }, [marcaId, modeloId, anioId])

  // Al cambiar un nivel se vacían los siguientes.
  function changeMarca(text: string) { setMarca((prev) => ({ ...prev, text, selected: findOption(prev.options, text) })); setModelo(empty); setAnio(empty); setVersion(empty) }
  function changeModelo(text: string) { setModelo((prev) => ({ ...prev, text, selected: findOption(prev.options, text) })); setAnio(empty); setVersion(empty) }
  function changeAnio(text: string) { setAnio((prev) => ({ ...prev, text, selected: findOption(prev.options, text) })); setVersion(empty) }
  function changeVersion(text: string) { setVersion((prev) => ({ ...prev, text, selected: findOption(prev.options, text) })) }

  // Valor que recibe el campo de Jotform: "MARCA | MODELO | AÑO | VERSIÓN".
  const value = marca.selected && modelo.selected && anio.selected && version.selected
    ? [marca.selected.label, modelo.selected.label, anio.selected.label, version.selected.label].join(' | ')
    : ''

  const rootRef = useRef<HTMLElement>(null)
  const valueRef = useRef(value)
  valueRef.current = value

  useEffect(() => {
    if (jotformReady) window.JFCustomWidget?.sendData({ value })
  }, [jotformReady, value])

  // Ajusta el alto del iframe al contenido para que no aparezca scroll.
  useEffect(() => {
    const root = rootRef.current
    if (!jotformReady || !root) return
    const resize = () => window.JFCustomWidget?.requestFrameResize({ height: Math.ceil(root.getBoundingClientRect().height) })
    const observer = new ResizeObserver(resize)
    observer.observe(root)
    return () => observer.disconnect()
  }, [jotformReady])

  function onJotformLoad() {
    const widget = window.JFCustomWidget
    if (!widget) return
    widget.subscribe('ready', () => {
      widget.subscribe('submit', () => {
        widget.sendSubmit({ valid: valueRef.current !== '', value: valueRef.current })
      })
      setJotformReady(true)
    })
  }

  return (
    <main className="widget-page" ref={rootRef}>
      <Script src="https://js.jotform.com/JotFormCustomWidget.min.js" strategy="afterInteractive" onLoad={onJotformLoad} />
      <div className="widget-form">
        <ComboField label="Marca" level={marca} loading={loading === 'marca'} onText={changeMarca} />
        <ComboField label="Modelo" level={modelo} disabled={!marca.selected} loading={loading === 'modelo'} onText={changeModelo} />
        <ComboField label="Año" level={anio} disabled={!modelo.selected} loading={loading === 'anio'} onText={changeAnio} />
        <ComboField label="Versión" level={version} disabled={!anio.selected} loading={loading === 'version'} onText={changeVersion} />
      </div>
      {error && <p className="error-message" role="alert">{error}</p>}
    </main>
  )
}

export default VehicleWidget
