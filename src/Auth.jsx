import React, { useState } from "react";
import { supabase } from "./supabase";
import { Loader2, Music } from "lucide-react";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  
  const [focusedField, setFocusedField] = useState(null);

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

  const APPLE_RED = "#FA243C";

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", width: "100%", background: "#000000", color: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}>
      <style>{`
        body, html, #root { margin: 0 !important; padding: 0 !important; width: 100% !important; height: 100% !important; max-width: none !important; background: #000000 !important; overflow: hidden !important; }
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; outline: none; -webkit-user-select: none; user-select: none; }
        input { -webkit-user-select: auto; user-select: auto; }
      `}</style>
      <div style={{ padding: "40px", width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        
        <img src="/logo.png" alt="Euphony Logo" style={{ width: "72px", height: "72px", marginBottom: "24px", borderRadius: "16px", border: "2px solid rgba(255, 255, 255, 0.4)" }} />
        
        <h1 style={{ textAlign: "center", margin: "0 0 8px 0", color: "#FFFFFF", fontSize: "24px", fontWeight: "600" }}>
          {isForgotPassword ? "Reset Password" : isLogin ? "Enter Your Password" : "Create Account"}
        </h1>
        <h2 style={{ textAlign: "center", margin: "0 0 32px 0", fontSize: "15px", color: "#a1a1a6", fontWeight: "normal", lineHeight: "1.4" }}>
          {isForgotPassword 
            ? "Enter your email to receive a password reset link." 
            : isLogin 
              ? "You have a Euphony Account associated with this email." 
              : "Sign up to start listening to your favorite music."}
        </h2>

        <form onSubmit={handleAuth} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "16px" }}>
          
          <div style={{ border: "1px solid #333", borderRadius: "12px", background: "#1C1C1E", overflow: "hidden" }}>
            <div style={{ position: "relative", border: focusedField === 'email' ? `2px solid ${APPLE_RED}` : "2px solid transparent", borderRadius: focusedField === 'email' ? "12px" : "0", zIndex: focusedField === 'email' ? 10 : 1, transition: "border 0.2s ease" }}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                required
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: "100%", padding: "16px", background: "transparent", border: "none", color: "white", outline: "none", boxSizing: "border-box", fontSize: "16px" }}
              />
            </div>
            
            {!isForgotPassword && (
              <>
                <div style={{ height: "1px", background: "#333", marginLeft: "16px", display: focusedField === 'email' || focusedField === 'password' ? 'none' : 'block' }} />
                <div style={{ position: "relative", border: focusedField === 'password' ? `2px solid ${APPLE_RED}` : "2px solid transparent", borderRadius: focusedField === 'password' ? "12px" : "0", zIndex: focusedField === 'password' ? 10 : 1, transition: "border 0.2s ease", marginTop: focusedField === 'password' ? "-2px" : "0" }}>
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    required
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ width: "100%", padding: "16px", background: "transparent", border: "none", color: "white", outline: "none", boxSizing: "border-box", fontSize: "16px" }}
                  />
                </div>
              </>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
            {!isForgotPassword && isLogin ? (
              <p style={{ margin: 0, color: APPLE_RED, fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }} onClick={() => setIsForgotPassword(true)}>
                Forgotten your password? <span style={{ fontSize: "16px" }}>↗</span>
              </p>
            ) : (
              <div />
            )}
            
            <p style={{ margin: 0, color: "#a1a1a6", fontSize: "14px", cursor: "pointer" }} onClick={() => { setIsForgotPassword(false); setIsLogin(!isLogin); }}>
              {isLogin ? "Need an account?" : "Already have an account?"}
            </p>
          </div>

          <button type="submit" disabled={loading} style={{ marginTop: "32px", padding: "16px", borderRadius: "12px", background: APPLE_RED, color: "#FFFFFF", fontWeight: "bold", fontSize: "16px", border: "none", cursor: loading ? "not-allowed" : "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", opacity: loading || (!email || (!isForgotPassword && !password)) ? 0.5 : 1, transition: "opacity 0.2s" }}>
            {loading && <Loader2 size={18} className="animate-spin" />}
            {isForgotPassword ? "Send Reset Link" : isLogin ? "Sign In" : "Sign Up"}
          </button>
        </form>

        {!isForgotPassword && (
          <>
            <div style={{ display: "flex", alignItems: "center", margin: "32px 0 24px 0", width: "100%" }}>
              <div style={{ flex: 1, height: "1px", background: "#333" }}></div>
              <span style={{ margin: "0 10px", color: "#86868b", fontSize: "14px" }}>or</span>
              <div style={{ flex: 1, height: "1px", background: "#333" }}></div>
            </div>

            <button 
              onClick={handleGoogleLogin} 
              style={{ width: "100%", padding: "16px", borderRadius: "12px", background: "#1C1C1E", border: "none", color: "white", fontWeight: "bold", fontSize: "16px", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", transition: "background 0.2s" }}
              onMouseOver={(e) => e.target.style.background = "#2C2C2E"}
              onMouseOut={(e) => e.target.style.background = "#1C1C1E"}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          </>
        )}
      </div>
    </div>
  );
}
