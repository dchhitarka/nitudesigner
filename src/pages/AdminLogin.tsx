import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { Button } from "../components/ui/button";
import { auth } from "../utils/firebase";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const [loginInfo, setLoginInfo] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, loginInfo.email, loginInfo.password);
      navigate("/admin");
    } catch (err: any) {
      alert("Login failed: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-xs mx-auto mt-20 p-4 border rounded shadow">
      <h2 className="text-xl font-bold mb-4">Admin Login</h2>
      <input
        type="email"
        placeholder="Email"
        className="border p-2 w-full mb-2"
        value={loginInfo.email}
        onChange={e => setLoginInfo({ ...loginInfo, email: e.target.value })}
      />
      <input
        type="password"
        placeholder="Password"
        className="border p-2 w-full mb-2"
        value={loginInfo.password}
        onChange={e => setLoginInfo({ ...loginInfo, password: e.target.value })}
      />
      <Button onClick={handleLogin} disabled={loading}>
        {loading ? "Logging in..." : "Login"}
      </Button>
    </div>
  );
}