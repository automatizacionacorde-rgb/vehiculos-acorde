'use client'

import { useEffect, useState } from 'react'
import { getOptions, type Option } from '@/lib/vehicles/options'

// Cascada marca → modelo (año) → submarca (tipo) → descripción (versión) contra /api/vehicles/*.
// Cambiar un nivel vacía los siguientes. `descripcion` guarda el id del vehículo.
export function useVehicleOptions() {
  const [marca, setMarca] = useState('')
  const [anio, setAnio] = useState('')
  const [submarca, setSubmarca] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [marcas, setMarcas] = useState<Option[]>([])
  const [anios, setAnios] = useState<Option[]>([])
  const [submarcas, setSubmarcas] = useState<Option[]>([])
  const [descripciones, setDescripciones] = useState<Option[]>([])
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading('marca')
    getOptions('/api/vehicles/marcas').then(setMarcas).catch(() => setError('No se pudieron cargar las marcas.')).finally(() => setLoading(''))
  }, [])

  useEffect(() => {
    if (!marca) return
    setLoading('anio'); setError(''); setAnios([]); setSubmarcas([]); setDescripciones([])
    getOptions(`/api/vehicles/anios-marca?marca=${encodeURIComponent(marca)}`).then(setAnios).catch(() => setError('No se pudieron cargar los modelos.')).finally(() => setLoading(''))
  }, [marca])

  useEffect(() => {
    if (!marca || !anio) return
    setLoading('submarca'); setError(''); setSubmarcas([]); setDescripciones([])
    getOptions(`/api/vehicles/submarcas?marca=${encodeURIComponent(marca)}&anio=${encodeURIComponent(anio)}`).then(setSubmarcas).catch(() => setError('No se pudieron cargar las submarcas.')).finally(() => setLoading(''))
  }, [marca, anio])

  useEffect(() => {
    if (!marca || !anio || !submarca) return
    setLoading('descripcion'); setError(''); setDescripciones([])
    getOptions(`/api/vehicles/versiones?marca=${encodeURIComponent(marca)}&modelo=${encodeURIComponent(submarca)}&anio=${encodeURIComponent(anio)}`).then(setDescripciones).catch(() => setError('No se pudieron cargar las descripciones.')).finally(() => setLoading(''))
  }, [marca, anio, submarca])

  return {
    marca, anio, submarca, descripcion, marcas, anios, submarcas, descripciones, loading, error,
    changeMarca: (value: string) => { setMarca(value); setAnio(''); setSubmarca(''); setDescripcion('') },
    changeAnio: (value: string) => { setAnio(value); setSubmarca(''); setDescripcion('') },
    changeSubmarca: (value: string) => { setSubmarca(value); setDescripcion('') },
    changeDescripcion: setDescripcion,
  }
}
