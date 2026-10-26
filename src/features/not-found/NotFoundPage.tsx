import { Link } from "react-router-dom";
import { PageContainer } from "@/components/layout/PageContainer";
import {  Button, Card, Text } from "@/components/ui";
import { ROUTES } from "@/app/routePaths";
import "./not-found.css";

export function NotFoundPage() {
  return (
    <PageContainer>
      <Card padding="lg">
        <Text variant="caption" tone="muted">
          ERROR 404
        </Text>

        <Text variant="h1">Page not found</Text>

        <Text tone="secondary">
          This page may have moved, or the address may be incorrect.
        </Text>

        <Button variant="danger" size="md"   >
          <Link className="not-found-link" to={ROUTES.dashboard}>
            Back to dashboard
          </Link>
        </Button>
      </Card>
    </PageContainer>
  );
}
