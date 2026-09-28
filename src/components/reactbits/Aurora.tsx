import { motion } from "framer-motion";
import { useTheme } from "../../store/useTheme";

export default function Aurora() {
  const theme = useTheme((s) => s.theme);
  const light = theme === "light";

  return (
    <div className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${light ? "bg-[#f5f1e8]" : "bg-[#0a0e17]"}`}>
      {light ? (
        <>
          <motion.div
            className="absolute -left-[20%] -top-[30%] h-[80vh] w-[80vw] rounded-full blur-[130px]"
            style={{ background: "radial-gradient(circle, rgba(30,58,95,0.10), transparent 65%)" }}
            animate={{ x: [0, 90, 0], y: [0, 50, 0], scale: [1, 1.12, 1] }}
            transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -right-[15%] top-[2%] h-[70vh] w-[65vw] rounded-full blur-[140px]"
            style={{ background: "radial-gradient(circle, rgba(198,161,91,0.22), transparent 66%)" }}
            animate={{ x: [0, -70, 0], y: [0, 70, 0], scale: [1, 1.14, 1] }}
            transition={{ duration: 34, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-[-25%] left-[15%] h-[60vh] w-[60vw] rounded-full blur-[150px]"
            style={{ background: "radial-gradient(circle, rgba(255,255,255,0.85), transparent 65%)" }}
            animate={{ x: [0, 60, 0], y: [0, -40, 0], scale: [1, 1.08, 1] }}
            transition={{ duration: 38, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_45%,rgba(245,241,232,0.6)_100%)]" />
        </>
      ) : (
        <>
          <motion.div
            className="absolute -left-[20%] -top-[30%] h-[80vh] w-[80vw] rounded-full blur-[130px]"
            style={{ background: "radial-gradient(circle, rgba(30,58,95,0.55), transparent 65%)" }}
            animate={{ x: [0, 90, 0], y: [0, 50, 0], scale: [1, 1.12, 1] }}
            transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -right-[15%] top-[2%] h-[70vh] w-[65vw] rounded-full blur-[140px]"
            style={{ background: "radial-gradient(circle, rgba(198,161,91,0.14), transparent 66%)" }}
            animate={{ x: [0, -70, 0], y: [0, 70, 0], scale: [1, 1.14, 1] }}
            transition={{ duration: 34, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-[-25%] left-[15%] h-[60vh] w-[60vw] rounded-full blur-[150px]"
            style={{ background: "radial-gradient(circle, rgba(14,27,46,0.7), transparent 65%)" }}
            animate={{ x: [0, 60, 0], y: [0, -40, 0], scale: [1, 1.08, 1] }}
            transition={{ duration: 38, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,transparent_35%,rgba(10,14,23,0.9)_100%)]" />
        </>
      )}
    </div>
  );
}
