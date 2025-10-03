import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ResortReads from "./pages/ResortReads";
import BungalowReads from "./pages/BungalowReads";
import WeeklySchedule from "./pages/WeeklySchedule";
import Reports from "./pages/Reports";
import WaterBalanced from "./pages/WaterBalanced";
import TreatmentDashboard from "./pages/TreatmentDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/resort/:resortId" element={<ResortReads />} />
          <Route path="/bungalows" element={<BungalowReads />} />
          <Route path="/weekly-schedule" element={<WeeklySchedule />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/water-balanced" element={<WaterBalanced />} />
          <Route path="/treatment-dashboard" element={<TreatmentDashboard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;