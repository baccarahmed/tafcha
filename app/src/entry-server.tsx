import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { HelmetProvider, HelmetServerState } from 'react-helmet-async'
import App from './App.tsx'

export function render(url: string, preloadedData?: unknown) {
  const helmetContext = {} as { helmet?: HelmetServerState }

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
