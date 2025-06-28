import { BrowserRouter, Route, Routes } from "react-router-dom";
import AdminLogin from "./pages/AdminLogin";
import AdminPanel from "./pages/AdminPanel";
import LehangaStore from "./pages/LehangaStore";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LehangaStore />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  );
}
