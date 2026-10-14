'use client'

import { useEffect, useState } from 'react'
import { getOptions, type Option } from '@/lib/vehicles/options'

// Cascada marca → modelo → año → versión contra /api/vehicles/*. Cambiar un nivel vacía los siguientes.
export function useVehicleOptions() {
  const [marca, setMarca] = useState('')
  const [modelo, setModelo] = useState('')
  const [anio, setAnio] = useState('')
  const [version, setVersion] = useState('')
  const [marcas, setMarcas] = useState<Option[]>([])
  const [modelos, setModelos] = useState<Option[]>([])
  const [anios, setAnios] = useState<Option[]>([])
  const [versiones, setVersiones] = useState<Option[]>([])
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')

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

  return {
    marca, modelo, anio, version, marcas, modelos, anios, versiones, loading, error,
    changeMarca: (value: string) => { setMarca(value); setModelo(''); setAnio(''); setVersion('') },
    changeModelo: (value: string) => { setModelo(value); setAnio(''); setVersion('') },
    changeAnio: (value: string) => { setAnio(value); setVersion('') },
    changeVersion: setVersion,
  }
}
