import { useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import FtcPlanner from "./pages/ftc/Planner";
import FtcInstructions from "./pages/ftc/Instructions";
import FtcSettings from "./pages/ftc/Settings";
import FtcPatchNotes from "./pages/ftc/PatchNotes";
import FtcAbout from "./pages/ftc/About";
import FtcTerms from "./pages/ftc/Terms";
import FtcPrivacy from "./pages/ftc/Privacy";
import FtcLicense from "./pages/ftc/License";
import FrcPlanner from "./pages/frc/Planner";
import FrcInstructions from "./pages/frc/Instructions";
import FrcSettings from "./pages/frc/Settings";
import FrcPatchNotes from "./pages/frc/PatchNotes";
import FrcAbout from "./pages/frc/About";
import FrcTerms from "./pages/frc/Terms";
import FrcPrivacy from "./pages/frc/Privacy";
import FrcLicense from "./pages/frc/License";
import NotFound from "./pages/NotFound";

const THEME_STORAGE_KEY = "planner-theme-mode";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const normalizedTheme =
      storedTheme === "basic"
        ? "base"
        : storedTheme === "base" || storedTheme === "dark" || storedTheme === "light" || storedTheme === "sharkans"
          ? storedTheme
          : "dark";
    document.documentElement.setAttribute("data-theme", normalizedTheme);
  }, []);

  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/ftc/planner" element={<FtcPlanner />} />
              <Route path="/ftc/instructions" element={<FtcInstructions />} />
              <Route path="/ftc/settings" element={<FtcSettings />} />
              <Route path="/ftc/about" element={<FtcAbout />} />
              <Route path="/ftc/patch-notes" element={<FtcPatchNotes />} />
              <Route path="/ftc/terms" element={<FtcTerms />} />
              <Route path="/ftc/privacy" element={<FtcPrivacy />} />
              <Route path="/ftc/license" element={<FtcLicense />} />
              <Route path="/frc/planner" element={<FrcPlanner />} />
              <Route path="/frc/instructions" element={<FrcInstructions />} />
              <Route path="/frc/settings" element={<FrcSettings />} />
              <Route path="/frc/about" element={<FrcAbout />} />
              <Route path="/frc/patch-notes" element={<FrcPatchNotes />} />
              <Route path="/frc/terms" element={<FrcTerms />} />
              <Route path="/frc/privacy" element={<FrcPrivacy />} />
              <Route path="/frc/license" element={<FrcLicense />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <Analytics />
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;
