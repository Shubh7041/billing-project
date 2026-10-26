
import { Box, Button, Card, Text } from "@/components/ui";
import { PageContainer } from "@/components/layout/PageContainer";

export function InventoryPage() {
  return (
    <PageContainer
      title="Inventory"
      description="Track stock levels and manage your store inventory."
      actions={
        <Button onClick={() => console.log("Add product clicked")}>
          Add product
        </Button>
      }
    >
      <Box direction="row" gap={4} wrap>
        <Card title="Total products">
          <Text variant="h2">248</Text>
          <Text variant="small" tone="muted">
            Products in your catalogue
          </Text>
        </Card>

        <Card title="Low stock">
          <Text variant="h2" tone="warning">12</Text>
          <Text variant="small" tone="muted">
            Products need attention
          </Text>
        </Card>
      </Box>
    </PageContainer>
  );
}
