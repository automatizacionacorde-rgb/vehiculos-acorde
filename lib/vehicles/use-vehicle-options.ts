'use client'

import { useEffect, useState } from 'react'
import { getOptions, type Option } from '@/lib/vehicles/options'

// Cascada marca → modelo (año) → submarca (tipo + versión) contra /api/vehicles/*.
// Cambiar un nivel vacía los siguientes. `submarca` guarda el id del vehículo.
export function useVehicleOptions() {
  const [marca, setMarca] = useState('')
  const [anio, setAnio] = useState('')
  const [submarca, setSubmarca] = useState('')
  const [marcas, setMarcas] = useState<Option[]>([])
  const [anios, setAnios] = useState<Option[]>([])
  const [submarcas, setSubmarcas] = useState<Option[]>([])
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading('marca')
    getOptions('/api/vehicles/marcas').then(setMarcas).catch(() => setError('No se pudieron cargar las marcas.')).finally(() => setLoading(''))
  }, [])

  useEffect(() => {
    if (!marca) return
    setLoading('anio'); setError(''); setAnios([]); setSubmarcas([])
    getOptions(`/api/vehicles/anios-marca?marca=${encodeURIComponent(marca)}`).then(setAnios).catch(() => setError('No se pudieron cargar los modelos.')).finally(() => setLoading(''))
  }, [marca])

  useEffect(() => {
    if (!marca || !anio) return
    setLoading('submarca'); setError(''); setSubmarcas([])
    getOptions(`/api/vehicles/submarcas?marca=${encodeURIComponent(marca)}&anio=${encodeURIComponent(anio)}`).then(setSubmarcas).catch(() => setError('No se pudieron cargar las submarcas.')).finally(() => setLoading(''))
  }, [marca, anio])

  return {
    marca, anio, submarca, marcas, anios, submarcas, loading, error,
    changeMarca: (value: string) => { setMarca(value); setAnio(''); setSubmarca('') },
    changeAnio: (value: string) => { setAnio(value); setSubmarca('') },
    changeSubmarca: setSubmarca,
  }
}
