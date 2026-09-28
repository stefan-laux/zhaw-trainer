import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "../../lib/utils";

interface Props extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
}

export default function GradientText({ children, className, ...rest }: Props) {
  return (
    <motion.div
      className={cn(
        "bg-gradient-to-r from-zhaw-light via-white to-zhaw-light bg-[length:200%_auto] bg-clip-text text-transparent animate-shimmer",
        className
      )}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
