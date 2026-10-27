import "./catalog.css";

export function CatalogDemoNotice() {
  return (
    <div className="catalog-demo-notice" role="note">
      Demo mode: changes are temporary and reset when the page reloads. No data
      is saved to Supabase.
    </div>
  );
}