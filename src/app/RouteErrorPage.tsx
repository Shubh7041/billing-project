import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'

export function RouteErrorPage() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : 'The application could not load this page.'

  return (
    <main className="message-page">
      <p className="eyebrow">Something went wrong</p>
      <h1>Unable to load page</h1>
      <p>{message}</p>
      <Link className="text-link" to="/">
        Return to dashboard
      </Link>
    </main>
  )
}