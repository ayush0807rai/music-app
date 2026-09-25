import React, { useState } from "react";
import { supabase } from "./supabase";
import { Loader2 } from "lucide-react";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin
        });
        if (error) throw error;
        alert("Password reset link sent! Check your email.");
        setIsForgotPassword(false);
      } else if (isLogin) {
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
      alert(error.error_description || error.message);
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "#121212", color: "#fff", fontFamily: "sans-serif" }}>
      <div style={{ background: "#181818", padding: "40px", borderRadius: "16px", width: "100%", maxWidth: "350px", boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }}>
        
        <h1 style={{ textAlign: "center", margin: "0 0 8px 0", color: "#1DB954", fontSize: "28px" }}>Euphony</h1>
                <h2 style={{ textAlign: "center", marginBottom: "24px", fontSize: "16px", color: "#a0a0a0", fontWeight: "normal" }}>
          {isForgotPassword ? "Reset Password" : isLogin ? "Log in to Euphony" : "Create Account"}
        </h2>

        {!isForgotPassword && (
          <>
            <button 
              onClick={handleGoogleLogin} 
              style={{ width: "100%", padding: "12px", marginBottom: "20px", borderRadius: "24px", background: "transparent", border: "1px solid #555", color: "white", fontWeight: "bold", fontSize: "14px", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", transition: "all 0.2s" }}
              onMouseOver={(e) => e.target.style.background = "rgba(255,255,255,0.05)"}
              onMouseOut={(e) => e.target.style.background = "transparent"}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            <div style={{ display: "flex", alignItems: "center", margin: "0 0 20px 0" }}>
              <div style={{ flex: 1, height: "1px", background: "#333" }}></div>
              <span style={{ margin: "0 10px", color: "#666", fontSize: "14px" }}>or</span>
              <div style={{ flex: 1, height: "1px", background: "#333" }}></div>
            </div>
          </>
        )}
        
        <form onSubmit={handleAuth} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <input
            type="email"
            placeholder="Email address"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: "12px", borderRadius: "8px", border: "1px solid #333", background: "#2a2a2a", color: "white", outline: "none" }}
          />
          {!isForgotPassword && (
            <input
              type="password"
              placeholder="Password (min 6 chars)"
              value={password}
              required
              onChange={(e) => setPassword(e.target.value)}
              style={{ padding: "12px", borderRadius: "8px", border: "1px solid #333", background: "#2a2a2a", color: "white", outline: "none" }}
            />
          )}
          <button type="submit" disabled={loading} style={{ padding: "12px", borderRadius: "8px", background: "#1DB954", color: "#000", fontWeight: "bold", border: "none", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}>
            {loading && <Loader2 size={16} className="animate-spin" />}
            {isForgotPassword ? "Send Reset Link" : isLogin ? "Log In" : "Sign Up"}
          </button>
        </form>

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", marginTop: "20px" }}>
          {!isForgotPassword && isLogin && (
            <p style={{ margin: 0, color: "#1DB954", fontSize: "14px", cursor: "pointer" }} onClick={() => setIsForgotPassword(true)}>
              Forgot your password?
            </p>
          )}
          <p style={{ margin: 0, color: "#a0a0a0", fontSize: "14px", cursor: "pointer" }} onClick={() => { setIsForgotPassword(false); setIsLogin(!isLogin); }}>
            {isForgotPassword ? "Back to Login" : isLogin ? "Need an account? Sign up" : "Already have an account? Log in"}
          </p>
        </div>
      </div>
    </div>
  );
}


