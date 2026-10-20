import { createHash, timingSafeEqual } from 'node:crypto'

// Los endpoints de /api/bot/* exigen `Authorization: Bearer <BOT_API_KEY>`. Devuelve una respuesta de error, o null si pasa.
export function checkBotKey(request: Request) {
  const expected = process.env.BOT_API_KEY?.trim()
  if (!expected) {
    console.error('Bot: la variable BOT_API_KEY no existe en este despliegue o está vacía')
    return Response.json({ error: 'El bot no está configurado.' }, { status: 500 })
  }
  const received = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ?? ''
  // Se comparan los hashes para que la comparación tarde lo mismo sin importar el largo de la clave.
  const hash = (value: string) => createHash('sha256').update(value).digest()
  if (!timingSafeEqual(hash(received), hash(expected))) return Response.json({ error: 'No autorizado.' }, { status: 401 })
  return null
}
