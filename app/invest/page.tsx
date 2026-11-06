import { TrendingUp } from "lucide-react";
import { PagePlaceholder } from "@/components/shell/PagePlaceholder";

export default function InvestPage() {
  return (
    <PagePlaceholder
      title="Invest"
      icon={TrendingUp}
      step={6}
      description="Your portfolio, assets, allocation and Auto-invest schedule."
    />
  );
}
