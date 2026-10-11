import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="message-page">
      <p className="eyebrow">404</p>
      <h1>Page not found</h1>
      <p>The page you requested does not exist.</p>
      <Link className="text-link" to="/">
        Return to dashboard
      </Link>
    </section>
  )
}