import { CircleAlert } from "lucide-react";
import { Outlet } from "react-router-dom";
import { Button, Card, Icon, LoadingState } from "../../components/ui";
import { useStoreContext } from "./storeContext";
import "./storeContext.css";

export function RequireStoreContext() {
  const storeContext = useStoreContext();

  if (storeContext.status === "loading" || storeContext.status === "signed-out") {
    return <LoadingState message="Resolving your store access" />;
  }
  if (storeContext.status === "ready") return <Outlet />;

  const issueContent = {
    "profile-missing": {
      title: "Application profile not found",
      description: "This Auth account has no matching public.profiles row. A trusted administrator must complete the approved account bootstrap.",
    },
    "profile-inactive": {
      title: "Profile is inactive",
      description: "Ask a store administrator to review this account. The browser cannot activate profiles.",
    },
    "membership-missing": {
      title: "No active store membership found",
      description: "No active membership is available to this account. A trusted administrator must review or create its membership; the browser cannot grant or reactivate access.",
    },
    "membership-inactive": {
      title: "No active store membership",
      description: "Ask a store administrator to review membership status. The browser cannot grant or reactivate membership.",
    },
    "store-unavailable": {
      title: "No active store is available",
      description: "The account has no membership to an active, readable store. Ask an administrator to review the store and membership records.",
    },
  } as const;
  const issue = storeContext.status === "error"
    ? {
        title: "Store access could not be loaded",
        description: `${storeContext.message} Confirm authenticated read grants and RLS policies for the current user's profile, memberships, and active stores.`,
      }
    : issueContent[storeContext.status];

  return (
    <section className="store-access-page">
      <Card title={issue.title}>
        <div className="store-access-issue">
          <Icon icon={CircleAlert} size={18} />
          <p>{issue.description}</p>
        </div>
        {storeContext.status === "error" && (
          <Button type="button" variant="outline" onClick={storeContext.retry}>
            Retry access check
          </Button>
        )}
        {storeContext.status !== "error" && (
          <Button type="button" variant="outline" onClick={() => window.location.reload()}>
            Retry after administrator provisioning
          </Button>
        )}
        <p className="store-access-footer">
          No business data is shown until profile, active membership, and active store access are resolved.
        </p>
      </Card>
    </section>
  );
}