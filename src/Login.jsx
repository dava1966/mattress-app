import { useState } from "react";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "./firebase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmail = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError("Invalid email or password. Please try again.");
    }
    setLoading(false);
  };

  const handleGoogle = async () => {
    setError(""); setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setError("Google sign-in failed. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#f5ede0",
      backgroundImage: "radial-gradient(circle at 15% 15%, #e8c9a822 0%, transparent 55%), radial-gradient(circle at 85% 85%, #c4694a11 0%, transparent 50%)",
      fontFamily: "'Lora', Georgia, serif",
      padding: "1rem"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');
        * { box-sizing: border-box; }
        .login-input { transition: border-color 0.15s; }
        .login-input:focus { outline: none; border-color: #c4694a !important; }
        .google-btn:hover { background: #f0ebe4 !important; }
        .email-btn:hover { opacity: 0.88; }
      `}</style>

      <div style={{
        background: "#fdf6ec", borderRadius: "24px", padding: "2.5rem",
        width: "100%", maxWidth: "420px",
        boxShadow: "0 20px 60px rgba(80,40,10,0.15)",
        border: "1.5px solid #d4c0a6",
        animation: "fadeIn 0.3s ease"
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>💰</div>
          <h1 style={{
            margin: 0, fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: "1.8rem", color: "#3d2a1a", fontWeight: 700, letterSpacing: "-0.02em"
          }}>Mattress</h1>
          <p style={{ margin: "4px 0 0", color: "#7a5c42", fontSize: "0.85rem", fontStyle: "italic" }}>
            Family finances, together
          </p>
        </div>

        {/* Google Sign In */}
        <button onClick={handleGoogle} disabled={loading} className="google-btn" style={{
          width: "100%", padding: "0.75rem", borderRadius: "12px",
          border: "1.5px solid #d4c0a6", background: "#fdf6ec",
          display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
          cursor: "pointer", fontSize: "0.95rem", fontFamily: "'Lora', Georgia, serif",
          fontWeight: 600, color: "#3d2a1a", marginBottom: "1.25rem",
          transition: "background 0.15s"
        }}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          Continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem" }}>
          <div style={{ flex: 1, height: "1px", background: "#d4c0a6" }}/>
          <span style={{ fontSize: "0.78rem", color: "#7a5c42", fontStyle: "italic" }}>or sign in with email</span>
          <div style={{ flex: 1, height: "1px", background: "#d4c0a6" }}/>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleEmail}>
          <div style={{ marginBottom: "0.85rem" }}>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#7a5c42", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="login-input"
              style={{ width: "100%", padding: "0.65rem 0.9rem", borderRadius: "10px", border: "1.5px solid #d4c0a6", background: "#f5ede0", fontSize: "0.95rem", fontFamily: "'Lora', Georgia, serif", color: "#3d2a1a" }}
              placeholder="you@email.com" required
            />
          </div>
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#7a5c42", marginBottom: "0.3rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="login-input"
              style={{ width: "100%", padding: "0.65rem 0.9rem", borderRadius: "10px", border: "1.5px solid #d4c0a6", background: "#f5ede0", fontSize: "0.95rem", fontFamily: "'Lora', Georgia, serif", color: "#3d2a1a" }}
              placeholder="••••••••" required
            />
          </div>
          {error && (
            <div style={{ background: "#fde8e8", border: "1px solid #e07070", borderRadius: "10px", padding: "0.65rem 0.9rem", fontSize: "0.85rem", color: "#c04040", marginBottom: "1rem" }}>
              {error}
            </div>
          )}
          <button type="submit" disabled={loading} className="email-btn" style={{
            width: "100%", padding: "0.75rem", background: "#c4694a", color: "#fff",
            border: "none", borderRadius: "12px", fontSize: "1rem",
            fontFamily: "'Playfair Display', Georgia, serif", cursor: "pointer",
            letterSpacing: "0.03em", transition: "opacity 0.15s"
          }}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
