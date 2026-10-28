import { Building2, CircleAlert } from "lucide-react";
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

  if (storeContext.status === "choose-store") {
    return (
      <section className="store-access-page">
        <Card title="Choose a store" description={`Signed in as ${storeContext.profile.displayName}`}>
          <p className="store-access-copy">
            Your account has access to more than one active store. Choose the store for this session.
          </p>
          <div className="store-choice-list" role="group" aria-label="Available stores">
            {storeContext.memberships.map((membership) => (
              <Button
                key={membership.store.id}
                type="button"
                variant={storeContext.selectedStoreId === membership.store.id ? "primary" : "outline"}
                onClick={() => storeContext.selectStore(membership.store.id)}
              >
                <Icon icon={Building2} size={16} />
                <span>{membership.store.name}</span>
                <span className="store-choice-role">{membership.role.replaceAll("_", " ")}</span>
              </Button>
            ))}
          </div>
        </Card>
      </section>
    );
  }

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
      title: "No store membership found",
      description: "A trusted administrator must create an active store membership for this account. Store access cannot be granted from the browser.",
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
        <p className="store-access-footer">
          No business data is shown until profile, active membership, and active store access are resolved.
        </p>
      </Card>
    </section>
  );
}