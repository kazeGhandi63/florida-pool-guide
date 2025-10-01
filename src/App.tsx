import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import PoolReads from "./pages/PoolReads";
import BungalowReads from "./pages/BungalowReads";
import ResortReads from "./pages/ResortReads";
import Reports from "./pages/Reports";
import NotFound from "./pages/NotFound";
import WaterBalanced from "./pages/WaterBalanced";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/resort/:resortId" element={<ResortReads />} />
        <Route path="/reads/:poolId" element={<PoolReads />} />
        <Route path="/bungalows" element={<BungalowReads />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/water-balanced" element={<WaterBalanced />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;