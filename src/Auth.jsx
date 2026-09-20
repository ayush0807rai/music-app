import React, { useState } from "react";
import { supabase } from "./supabase";
import { Loader2 } from "lucide-react";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // Updated alert message to prompt email verification
        alert("Success! Please check your email inbox for a verification link.");
      }
    } catch (error) {
      alert(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#121212", color: "#fff", fontFamily: "sans-serif" }}>
      <div style={{ background: "#181818", padding: "40px", borderRadius: "16px", width: "100%", maxWidth: "350px", boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }}>
        <h2 style={{ textAlign: "center", marginBottom: "24px" }}>{isLogin ? "Welcome Back" : "Create Account"}</h2>
        <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: "12px", borderRadius: "8px", border: "1px solid #333", background: "#2a2a2a", color: "white", outline: "none" }}
          />
          <input
            type="password"
            placeholder="Password (min 6 chars)"
            value={password}
            required
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: "12px", borderRadius: "8px", border: "1px solid #333", background: "#2a2a2a", color: "white", outline: "none" }}
          />
          <button type="submit" disabled={loading} style={{ padding: "12px", borderRadius: "8px", background: "#1DB954", color: "#000", fontWeight: "bold", border: "none", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}>
            {loading && <Loader2 size={16} className="animate-spin" />}
            {isLogin ? "Log In" : "Sign Up"}
          </button>
        </form>
        <p style={{ textAlign: "center", marginTop: "20px", color: "#a0a0a0", fontSize: "14px", cursor: "pointer" }} onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Need an account? Sign up" : "Already have an account? Log in"}
        </p>
      </div>
    </div>
  );
}