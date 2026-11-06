import { Plus } from "lucide-react";
import { PagePlaceholder } from "@/components/shell/PagePlaceholder";

export default function AddMoneyPage() {
  return (
    <PagePlaceholder
      title="Add money"
      icon={Plus}
      step={4}
      description="Top up your Finpal balance with PayPal Checkout (sandbox)."
    />
  );
}
