import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import CheckFacts from "./pages/CheckFacts";
import ReviewDocument from "./pages/ReviewDocument";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/check" element={<CheckFacts />} />
      <Route path="/review" element={<ReviewDocument />} />
    </Routes>
  );
}
