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
        alert("Success! Please check your email inbox for a verification link.");
      }
    } catch (error) {
      alert(error.error_description || error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#121212", color: "#fff", fontFamily: "sans-serif" }}>
      <div style={{ background: "#181818", padding: "40px", borderRadius: "16px", width: "100%", maxWidth: "350px", boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }}>
        
        <h1 style={{ textAlign: "center", margin: "0 0 8px 0", color: "#1DB954", fontSize: "28px" }}>Euphony</h1>
        <h2 style={{ textAlign: "center", marginBottom: "24px", fontSize: "16px", color: "#a0a0a0", fontWeight: "normal" }}>
          {isLogin ? "Welcome Back" : "Create Account"}
        </h2>
        
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

        <div style={{ display: "flex", alignItems: "center", margin: "20px 0" }}>
          <div style={{ flex: 1, height: "1px", background: "#333" }}></div>
          <span style={{ margin: "0 10px", color: "#666", fontSize: "12px" }}>OR</span>
          <div style={{ flex: 1, height: "1px", background: "#333" }}></div>
        </div>

        <button 
          onClick={handleGoogleLogin} 
          style={{ width: "100%", padding: "12px", borderRadius: "8px", background: "white", color: "#000", fontWeight: "bold", border: "none", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "10px" }}
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: "18px", height: "18px" }} />
          Continue with Google
        </button>

        <p style={{ textAlign: "center", marginTop: "20px", color: "#a0a0a0", fontSize: "14px", cursor: "pointer" }} onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Need an account? Sign up" : "Already have an account? Log in"}
        </p>
      </div>
    </div>
  );
}