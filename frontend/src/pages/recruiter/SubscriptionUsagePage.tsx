import { useEffect, useState } from "react";
import { fetchSubscriptionUsage, purchaseCredits } from "../../api/recruiter";
import { LoadingSkeleton } from "../../components/common/LoadingSkeleton";
import { PageHeader } from "../../components/common/PageHeader";
import { UsageProgressCard } from "../../components/subscription/UsageProgressCard";
import type { UsageOverview } from "../../types";
import { useToast } from "../../context/ToastContext";

export function SubscriptionUsagePage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<UsageOverview[]>([]);

  async function load() {
    setLoading(true);
    try {
      const response = await fetchSubscriptionUsage();
      setUsage(response.usage);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <LoadingSkeleton className="h-80" />;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Usage" title="Current billing-period usage" description="Watch quota consumption, plan limits, additional credits, and reset timing by resource." />
      <div className="flex flex-wrap gap-3">
        <button
          className="btn-primary"
          onClick={async () => {
            await purchaseCredits({ creditType: "aiQuestionCredits", quantity: 50 });
            showToast("AI question credits purchased.", "success");
            load();
          }}
          type="button"
        >
          Buy AI credits
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {usage.map((item) => (
          <UsageProgressCard key={item.resourceType} usage={item} />
        ))}
      </div>
    </div>
  );
}

