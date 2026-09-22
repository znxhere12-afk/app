import { Badge } from "@/components/ui/badge";
import type { PaymentStatus } from "@/lib/types";

const MAP: Record<PaymentStatus, string> = {
  approved: "border-[#22C55E]/40 bg-[#062E1A] text-[#4ADE80]",
  pending: "border-[#FACC15]/40 bg-[#2B2304] text-[#FACC15]",
  rejected: "border-[#EF4444]/40 bg-[#2A1215] text-[#F87171]",
  refunded: "border-[#38BDF8]/40 bg-[#0B2430] text-[#7DD3FC]",
};

export default function StatusBadge({
  status,
  testid,
}: {
  status: PaymentStatus;
  testid?: string;
}) {
  return (
    <Badge
      variant="outline"
      data-testid={testid}
      className={`capitalize ${MAP[status]}`}
    >
      {status}
    </Badge>
  );
}
