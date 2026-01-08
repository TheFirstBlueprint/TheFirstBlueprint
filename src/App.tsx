import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import Planner from "./pages/Planner";
import PatchNotes from "./pages/PatchNotes";
import About from "./pages/About";
import NotFound from "./pages/NotFound";

const THEME_STORAGE_KEY = "planner-theme-mode";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    const normalizedTheme =
      storedTheme === "basic"
        ? "base"
        : storedTheme === "base" || storedTheme === "dark" || storedTheme === "light"
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
              <Route path="/planner" element={<Planner />} />
              <Route path="/patch-notes" element={<PatchNotes />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
};

export default App;
