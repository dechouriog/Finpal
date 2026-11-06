import { ArrowUpFromLine } from "lucide-react";
import { PagePlaceholder } from "@/components/shell/PagePlaceholder";

export default function WithdrawPage() {
  return (
    <PagePlaceholder
      title="Withdraw"
      icon={ArrowUpFromLine}
      step={4}
      description="Move money from Finpal to a PayPal sandbox account with Payouts."
    />
  );
}
