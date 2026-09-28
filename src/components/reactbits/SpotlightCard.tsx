import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface Props {
  children: ReactNode;
  className?: string;
  spotlight?: string;
}

export default function SpotlightCard({ children, className }: Props) {
  return (
    <div className={cn("group relative overflow-hidden rounded-2xl glass card-hover", className)}>
      <div className="relative">{children}</div>
    </div>
  );
}
