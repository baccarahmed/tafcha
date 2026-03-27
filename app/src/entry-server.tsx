import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import App, { type PreloadedData } from './App.tsx'

export function render(url: string, preloadedData?: PreloadedData) {
  const helmetContext = {} as any

  const RouterComponent = ({ children }: { children: React.ReactNode }) => (
    <StaticRouter location={url}>{children}</StaticRouter>
  )

  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <App RouterComponent={RouterComponent} preloadedData={preloadedData} />
    </HelmetProvider>
  )
  
  // helmetContext.helmet should be populated now
  const { helmet } = helmetContext
  return { html, helmet }
}
