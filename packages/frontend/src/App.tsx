import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import ErrorBoundary from "./components/ErrorBoundary";

// Eagerly loaded
import Landing from "./pages/Landing";

// Lazy loaded
const CheckFacts = lazy(() => import("./pages/CheckFacts"));
const ReviewDocument = lazy(() => import("./pages/ReviewDocument"));
const History = lazy(() => import("./pages/History"));
const HistoryDetail = lazy(() => import("./pages/HistoryDetail"));
const Profile = lazy(() => import("./pages/Profile"));
const About = lazy(() => import("./pages/About"));
const Pricing = lazy(() => import("./pages/Pricing"));
const SharedReport = lazy(() => import("./pages/SharedReport"));

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ivory">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-cerulean border-t-transparent" />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Toaster richColors position="top-right" />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/check" element={<CheckFacts />} />
          <Route path="/review" element={<ReviewDocument />} />
          <Route path="/history" element={<History />} />
          <Route path="/history/:id" element={<HistoryDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/about" element={<About />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/report/:shareToken" element={<SharedReport />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
