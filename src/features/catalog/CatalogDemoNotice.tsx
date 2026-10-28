import { Info } from "lucide-react";
import { Icon } from "../../components/ui";
import "./catalog.css";

export function CatalogDemoNotice() {
  return (
    <div className="catalog-demo-notice" role="note">
      <Icon icon={Info} size={16} />
      Demo mode: changes are temporary and reset when the page reloads. No data
      is saved to Supabase.
    </div>
  );
}