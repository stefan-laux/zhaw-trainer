import { HashRouter, Route, Routes } from "react-router-dom";
import { motion } from "framer-motion";
import { Scale, Loader2 } from "lucide-react";
import Layout from "./components/Layout";
import Aurora from "./components/reactbits/Aurora";
import Dashboard from "./pages/Dashboard";
import Modules from "./pages/Modules";
import ModuleDetail from "./pages/ModuleDetail";
import Flashcards from "./pages/Flashcards";
import ExamHome from "./pages/ExamHome";
import ExamRunner from "./pages/ExamRunner";
import ExamResult from "./pages/ExamResult";
import ExamPdf from "./pages/ExamPdf";
import Practice from "./pages/Practice";
import Stats from "./pages/Stats";
import AITutor from "./pages/AITutor";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import { AuthProvider, useAuth } from "./lib/auth";

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Gate />
      </HashRouter>
    </AuthProvider>
  );
}

function Gate() {
  const { user, ready, configured } = useAuth();

  if (configured && !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-300">
        <Aurora />
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-zhaw to-zhaw-dark shadow-glow ring-1 ring-zhaw-light/40">
            <Scale className="h-7 w-7 text-white keep-white" />
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Wird geladen...
          </div>
        </div>
      </div>
    );
  }

  if (configured && !user) {
    return (
      <div className="relative flex min-h-screen items-center justify-center px-4 py-10">
        <Aurora />
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Login standalone />
        </motion.div>
      </div>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/module" element={<Modules />} />
        <Route path="/module/:id" element={<ModuleDetail />} />
        <Route path="/karten" element={<Flashcards />} />
        <Route path="/pruefung" element={<ExamHome />} />
        <Route path="/pruefung/pdf" element={<ExamPdf />} />
        <Route path="/pruefung/:id" element={<ExamRunner />} />
        <Route path="/pruefung/:id/resultat" element={<ExamResult />} />
        <Route path="/aufgaben" element={<Practice />} />
        <Route path="/statistik" element={<Stats />} />
        <Route path="/tutor" element={<AITutor />} />
        <Route path="/einstellungen" element={<Settings />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}
