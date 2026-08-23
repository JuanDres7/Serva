/**
 * Envío de correo transaccional.
 *
 * Finzen solo envía dos tipos de correo: verificación de cuenta y
 * restablecimiento de contraseña. Ninguno lleva datos financieros.
 *
 * Sin proveedor configurado —el caso por defecto, y el de quien clone el
 * repositorio— el enlace se escribe en el registro del servidor. El flujo
 * funciona igual en desarrollo y conectar un proveedor real es cuestión de
 * rellenar dos variables de entorno (D-042).
 */

export type Correo = {
  readonly para: string
  readonly asunto: string
  readonly texto: string
}

export type ResultadoEnvio =
  | { readonly enviado: true }
  | { readonly enviado: false; readonly motivo: string }

const REMITENTE = process.env.EMAIL_FROM ?? 'Finzen <onboarding@resend.dev>'

export async function enviarCorreo(correo: Correo): Promise<ResultadoEnvio> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    // Sin proveedor: el enlace queda en el registro del servidor para poder
    // seguir el flujo en desarrollo. Nunca se escribe nada más que el enlace.
    console.info(
      `[correo sin proveedor] para: ${correo.para}\n${correo.asunto}\n${correo.texto}`,
    )
    return { enviado: false, motivo: 'sin proveedor de correo configurado' }
  }

  try {
    const respuesta = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: REMITENTE,
        to: correo.para,
        subject: correo.asunto,
        text: correo.texto,
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!respuesta.ok) {
      return { enviado: false, motivo: `el proveedor respondió ${respuesta.status}` }
    }
    return { enviado: true }
  } catch (error) {
    return {
      enviado: false,
      motivo: error instanceof Error ? error.message : 'fallo desconocido',
    }
  }
}

export function correoDeRestablecimiento(enlace: string): Omit<Correo, 'para'> {
  return {
    asunto: 'Restablece tu contraseña de Finzen',
    texto: `Recibimos una solicitud para restablecer tu contraseña.

Abre este enlace para elegir una nueva:
${enlace}

El enlace caduca en una hora y solo funciona una vez.
Si no fuiste tú, puedes ignorar este mensaje: tu contraseña no cambiará.`,
  }
}

export function correoDeVerificacion(enlace: string): Omit<Correo, 'para'> {
  return {
    asunto: 'Confirma tu correo en Finzen',
    texto: `Confirma que este correo es tuyo abriendo este enlace:
${enlace}

Si no creaste una cuenta en Finzen, puedes ignorar este mensaje.`,
  }
}
