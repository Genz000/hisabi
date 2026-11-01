import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const Demo = import.meta.env.DEV ? lazy(() => import("./pages/Demo")) : null;

const App = () => (
  <TooltipProvider>
    <Toaster position="top-center" theme="light" />
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth />} />
        {Demo && (
          <Route
            path="/demo"
            element={
              <Suspense fallback={null}>
                <Demo />
              </Suspense>
            }
          />
        )}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
