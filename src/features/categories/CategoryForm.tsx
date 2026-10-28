import { useState, type FormEvent } from "react";
import { CheckCircle2, Plus, X } from "lucide-react";
import { Button, Card, Icon } from "../../components/ui";
import type { Category, CategoryInput } from "../catalog/catalogTypes";

interface CategoryFormProps {
  category?: Category;
  onSubmit: (input: CategoryInput) => string | null;
  onCancel: () => void;
}

export function CategoryForm({ category, onSubmit, onCancel }: CategoryFormProps) {
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = name.trim();
    if (!normalizedName) {
      setError("Enter a category name.");
      return;
    }

    const submitError = onSubmit({
      name: normalizedName,
      description: description.trim(),
      isActive,
    });
    setError(submitError);
  }

  return (
    <Card
      className="catalog-form-card"
      title={category ? "Edit category" : "Create category"}
      description="Category names are unique within this store, ignoring letter case and surrounding spaces."
    >
      <form className="catalog-form" onSubmit={handleSubmit} noValidate>
        <div className="catalog-form-field">
          <label htmlFor="category-name">Category name</label>
          <input
            id="category-name"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "category-form-error" : undefined}
            autoComplete="off"
            required
          />
        </div>

        <div className="catalog-form-field">
          <label htmlFor="category-description">Description (optional)</label>
          <textarea
            id="category-description"
            name="description"
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>

        <label className="catalog-checkbox-field">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
          />
          <span>Active category</span>
        </label>

        {error && (
          <p className="catalog-form-error" id="category-form-error" role="alert">
            {error}
          </p>
        )}

        <div className="catalog-form-actions">
          <Button type="submit">
            <Icon icon={category ? CheckCircle2 : Plus} size={16} />
            {category ? "Save category" : "Create category"}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            <Icon icon={X} size={15} />
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}