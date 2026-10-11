type PagePlaceholderProps = {
  title: string
}

export function PagePlaceholder({ title }: PagePlaceholderProps) {
  return (
    <section className="page-placeholder">
      <p className="eyebrow">Cracker Mall</p>
      <h1>{title}</h1>
      <p>This page is reserved for the upcoming application design.</p>
    </section>
  )
}