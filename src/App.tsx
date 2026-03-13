import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { I18nProvider } from "./i18n/I18nProvider";
import BottomNav from "./components/BottomNav";
import Dashboard from "./pages/Dashboard";
import WorkoutSelect from "./pages/WorkoutSelect";
import WorkoutLogger from "./pages/WorkoutLogger";
import WorkoutEdit from "./pages/WorkoutEdit";
import Profile from "./pages/Profile";
import Progress from "./pages/Progress";
import MonthlyReport from "./pages/MonthlyReport";
import ShareProgress from "./pages/ShareProgress";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <I18nProvider>
        <AppProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="max-w-lg mx-auto min-h-screen">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/workout" element={<WorkoutSelect />} />
                <Route path="/workout/:routineId" element={<WorkoutLogger />} />
                <Route path="/workout/edit/:workoutId" element={<WorkoutEdit />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/progress" element={<Progress />} />
                <Route path="/report" element={<MonthlyReport />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <BottomNav />
            </div>
          </BrowserRouter>
        </AppProvider>
      </I18nProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
