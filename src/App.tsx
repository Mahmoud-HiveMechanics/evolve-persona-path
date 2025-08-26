import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Home } from "./pages/Home";
import { Assessment } from "./pages/Assessment";
import { Model } from "./pages/Model";
import { About } from "./pages/About";
import { Auth } from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/ProtectedRoute";
import Evaluation from "./pages/Evaluation";
import { ErrorBoundary } from "./components/ErrorBoundary";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/assessment" element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <Assessment />
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/evaluation" element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <Evaluation />
                </ErrorBoundary>
              </ProtectedRoute>
            } />
            <Route path="/model" element={<Model />} />
            <Route path="/about" element={<About />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
