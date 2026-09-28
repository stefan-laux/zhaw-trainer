import { Link } from "react-router-dom";
import { Scale } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zhaw/20 text-zhaw-light">
        <Scale className="h-8 w-8" />
      </div>
      <h1 className="mt-5 text-2xl font-semibold text-white">Seite nicht gefunden</h1>
      <p className="mt-1 text-sm text-slate-400">Diese Seite existiert nicht.</p>
      <Link to="/" className="btn-primary mt-6">Zum Dashboard</Link>
    </div>
  );
}
