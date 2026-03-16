
import "./App.css";
import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { useDispatch } from "react-redux";
import Home from "./pages/Home";
import Navbar from "./components/Navbar";
import Rewards from "./pages/Rewards";
import Profile from "./pages/Profile";
import Map from "./pages/Map";
import LoginSignUp, { ResetPasswordPage } from "./pages/LoginSignUp";
import { ToastProvider } from "./components/ToastContext";
import { login } from "./slices/authSlice";
import { getToken, decodeToken, isTokenExpired } from "./services/authService";

function App() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    if (isTokenExpired(token)) return;

    const decoded = decodeToken(token);
    if (!decoded) return;

    const user = {
      id: decoded.sub ?? decoded.id,
      email: decoded.email,
      name: decoded.name,
    };

    dispatch(login({ user, token }));
  }, [dispatch]);

  return (
    <ToastProvider>
      <div>
        <div className="flex">
          <Navbar onHoverChange={setSidebarExpanded} />
          <div className={`flex-1 transition-all duration-300 ${sidebarExpanded ? "ml-64" : "ml-20"}`}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/map" element={<Map />} />
              <Route path="/rewards" element={<Rewards />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/login" element={<LoginSignUp />} />
              {/* reset password have two parameter token and email in url so design it accordingly */}
              <Route path="/reset-password" element={<ResetPasswordPage />} />

            </Routes>
          </div>
        </div>
      </div>
    </ToastProvider>
  );
}

export default App;