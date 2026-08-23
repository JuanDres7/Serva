import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

/*
 * Una sola familia de texto, con carácter propio.
 *
 * Plus Jakarta Sans es humanista y algo redondeada: cercana sin ser infantil,
 * que es exactamente el registro que busca Finzen. El carácter del diseño no
 * viene de mezclar tipografías sino del tratamiento —mayúsculas espaciadas para
 * las etiquetas, contraste fuerte de tamaños—, que es más disciplinado y
 * envejece mejor.
 */
const sans = Plus_Jakarta_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
})

/* Para las cifras: monoespaciada, de modo que los montos se alineen. */
const mono = JetBrains_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Finzen',
  description:
    'Registra tus gastos en segundos y entiende a dónde se va tu dinero, sin saber de finanzas.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="es"
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
