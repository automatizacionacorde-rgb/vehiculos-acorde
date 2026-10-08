export type Option = { value: string; label: string; id?: string }

export async function getOptions(path: string): Promise<Option[]> {
  const response = await fetch(path)
  if (!response.ok) throw new Error('No se pudieron cargar las opciones')
  const data = await response.json() as Array<{ value: string; label?: string; id?: string }>
  return data.map((option) => ({
    value: option.id ?? String(option.value),
    label: option.label ?? String(option.value),
    id: option.id,
  }))
}
