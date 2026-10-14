'use client'

import { useEffect, useState } from 'react'
import { CalendarDays, ChevronDown, Loader2 } from 'lucide-react'
import { useVehicleOptions } from '@/lib/vehicles/use-vehicle-options'
import type { Option } from '@/lib/vehicles/options'
import { inter } from '@/lib/fonts'

const TRACKING_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'landing_url', 'producto'] as const

function Field({ label, hint, className = '', children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`quote-field ${className}`}>
      <label className="quote-label"><span>{label} <span className="quote-required">*</span></span>{children}</label>
      {hint && <span className="quote-hint">{hint}</span>}
    </div>
  )
}

function Select({ value, options, onChange, disabled, loading }: { value: string; options: Option[]; onChange: (value: string) => void; disabled?: boolean; loading?: boolean }) {
  return (
    <span className="quote-control">
      <select className="quote-input" value={value} disabled={disabled || loading} onChange={(e) => onChange(e.target.value)} required>
        <option value="">{loading ? 'Cargando…' : 'Seleccione'}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {loading ? <Loader2 className="quote-icon animate-spin" size={18} aria-hidden="true" /> : <ChevronDown className="quote-icon" size={18} aria-hidden="true" />}
    </span>
  )
}

const SEXO: Option[] = [{ value: 'Mujer', label: 'Mujer' }, { value: 'Hombre', label: 'Hombre' }]
const SUBRAMO: Option[] = [{ value: 'Particular', label: 'Particular' }]
const COBERTURA: Option[] = [{ value: 'Amplia', label: 'Amplia' }]

function maskDate(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 8)
  return [d.slice(0, 2), d.slice(2, 4), d.slice(4)].filter(Boolean).join('/')
}

function maskPhone(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 10)
  if (d.length <= 3) return d
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
}

export function QuoteForm() {
  const v = useVehicleOptions()
  const [nombre, setNombre] = useState('')
  const [paterno, setPaterno] = useState('')
  const [materno, setMaterno] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [sexo, setSexo] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [codigoPostal, setCodigoPostal] = useState('')
  const [tracking, setTracking] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  // Parámetros UTM (y landing_url / producto) que llegan en la URL de la página.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const values: Record<string, string> = {}
    for (const key of TRACKING_KEYS) values[key] = params.get(key) ?? ''
    if (!values.landing_url) values.landing_url = document.referrer
    setTracking(values)
  }, [])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSending(true); setError('')
    try {
      const response = await fetch('/api/cotizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, paterno, materno, email, telefono, sexo, fechaNacimiento, codigoPostal, versionId: v.version, ...tracking }),
      })
      const data = await response.json().catch(() => ({})) as { error?: string; thankYouUrl?: string }
      if (!response.ok) throw new Error(data.error ?? 'No se pudo enviar la solicitud.')
      setSent(true)
      // Misma página de confirmación que usa el formulario de Jotform; si el navegador lo bloquea, queda el mensaje.
      if (data.thankYouUrl) { try { window.top?.location.assign(data.thankYouUrl) } catch { /* el mensaje de abajo basta */ } }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar la solicitud.')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <main className={`quote-page ${inter.className}`}>
        <h1 className="quote-title">¡Gracias!</h1>
        <p className="quote-subtitle">Recibimos tus datos. Un asesor te contactará.</p>
      </main>
    )
  }

  return (
    <main className={`quote-page ${inter.className}`}>
      <h1 className="quote-title">Cotiza tu seguro de auto</h1>
      <p className="quote-subtitle">Completa tus datos y un asesor te contactará</p>
      <hr className="quote-rule" />

      <form className="quote-grid" onSubmit={submit} noValidate={false}>
        <div className="quote-field quote-full">
          <span className="quote-label"><span>Nombre, Apellido Paterno, Apellido materno <span className="quote-required">*</span></span></span>
          <div className="quote-name">
            <label><input className="quote-input" value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={60} required autoComplete="given-name" /><span className="quote-hint">Nombre</span></label>
            <label><input className="quote-input" value={paterno} onChange={(e) => setPaterno(e.target.value)} maxLength={60} required autoComplete="family-name" /><span className="quote-hint">Apellido Paterno</span></label>
            <label><input className="quote-input" value={materno} onChange={(e) => setMaterno(e.target.value)} maxLength={60} /><span className="quote-hint">Apellido Materno</span></label>
          </div>
        </div>

        <Field label="Email" hint="ejemplo@ejemplo.com"><input className="quote-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} required autoComplete="email" /></Field>
        <Field label="Número de teléfono"><input className="quote-input" type="tel" inputMode="numeric" placeholder="(000) 000-0000" value={telefono} onChange={(e) => setTelefono(maskPhone(e.target.value))} pattern="\(\d{3}\) \d{3}-\d{4}" title="10 dígitos" required autoComplete="tel-national" /></Field>

        <Field label="Sexo"><Select value={sexo} options={SEXO} onChange={setSexo} /></Field>
        <Field label="Fecha de Nacimiento" hint="Fecha">
          <span className="quote-control">
            <input className="quote-input" inputMode="numeric" placeholder="DD/MM/YYYY" value={fechaNacimiento} onChange={(e) => setFechaNacimiento(maskDate(e.target.value))} pattern="\d{2}/\d{2}/\d{4}" title="DD/MM/AAAA" required autoComplete="bday" />
            <CalendarDays className="quote-icon" size={18} aria-hidden="true" />
          </span>
        </Field>

        <Field label="Subramo"><Select value="Particular" options={SUBRAMO} onChange={() => {}} /></Field>
        <Field label="Código Postal"><input className="quote-input" inputMode="numeric" value={codigoPostal} onChange={(e) => setCodigoPostal(e.target.value.replace(/\D/g, '').slice(0, 5))} pattern="\d{5}" title="5 dígitos" required autoComplete="postal-code" /></Field>

        <Field label="Marca"><Select value={v.marca} options={v.marcas} onChange={v.changeMarca} loading={v.loading === 'marca'} /></Field>
        <Field label="Modelo"><Select value={v.modelo} options={v.modelos} onChange={v.changeModelo} disabled={!v.marca} loading={v.loading === 'modelo'} /></Field>
        <Field label="Año"><Select value={v.anio} options={v.anios} onChange={v.changeAnio} disabled={!v.modelo} loading={v.loading === 'anio'} /></Field>
        <Field label="Versión"><Select value={v.version} options={v.versiones} onChange={v.changeVersion} disabled={!v.anio} loading={v.loading === 'version'} /></Field>

        <Field label="Cobertura"><Select value="Amplia" options={COBERTURA} onChange={() => {}} /></Field>

        <p className="quote-note quote-full">Por ahora el cotizador está disponible únicamente para vehículos de uso <strong>particular</strong>.</p>
        {(error || v.error) && <p className="quote-error quote-full" role="alert">{error || v.error}</p>}
        <button className="quote-submit quote-full" type="submit" disabled={sending || !v.version}>
          {sending ? <><Loader2 className="animate-spin" size={18} aria-hidden="true" /> Enviando…</> : 'Enviar'}
        </button>
      </form>
    </main>
  )
}

export default QuoteForm
