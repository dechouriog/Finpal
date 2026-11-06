import { ReceiptText } from "lucide-react";
import { PagePlaceholder } from "@/components/shell/PagePlaceholder";

export default function ActivityPage() {
  return (
    <PagePlaceholder
      title="Activity"
      icon={ReceiptText}
      step={5}
      description="Every deposit, withdrawal, transfer and investment in one place."
    />
  );
}
