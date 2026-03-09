"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, signIn } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const canvas = document.getElementById("auth-bg-balls-canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const balls = Array.from({ length: 18 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 18 + Math.random() * 18,
      dx: (Math.random() - 0.5) * 0.7,
      dy: (Math.random() - 0.5) * 0.7,
      color: `hsl(210, 80%, ${60 + Math.random() * 20}%)`,
    }));

    let running = true;
    function animate() {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);
      for (const b of balls) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, 2 * Math.PI);
        ctx.fillStyle = b.color;
        ctx.globalAlpha = 0.18;
        ctx.fill();
        ctx.globalAlpha = 1;
        b.x += b.dx;
        b.y += b.dy;
        if (b.x < -b.r) b.x = width + b.r;
        if (b.x > width + b.r) b.x = -b.r;
        if (b.y < -b.r) b.y = height + b.r;
        if (b.y > height + b.r) b.y = -b.r;
      }
      requestAnimationFrame(animate);
    }

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener("resize", handleResize);
    animate();

    return () => {
      running = false;
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError("");
    setIsSubmitting(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!result || result.error) {
        setError("Invalid credentials");
        return;
      }

      const session = await getSession();
      const role = session?.user?.role;

      if (role === "ADMIN") {
        router.push("/admin");
        return;
      }

      router.push("/dashboard");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center bg-neutral-100 px-4 md:px-0 overflow-hidden">
      <canvas id="auth-bg-balls-canvas" className="fixed inset-0 w-full h-full z-0 pointer-events-none" style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh" }} />
      <div className="relative z-10 w-full flex items-center justify-center">
        <form onSubmit={handleLogin} className="w-full max-w-md bg-white rounded-2xl p-6 md:p-8 shadow flex flex-col gap-6">
          <h2 className="text-xl md:text-2xl font-bold mb-2 text-center">Sign In</h2>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="border rounded p-3 w-full"
          />
          <div className="relative w-full">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="border rounded p-3 pr-12 w-full"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {error && <div className="text-red-600 text-sm font-semibold">{error}</div>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Signing In..." : "Sign In"}
          </button>
          <div className="text-center text-sm text-gray-500">Don't have an account? <a href="/auth/signup" className="text-blue-600 hover:underline">Sign Up</a></div>
        </form>
      </div>
    </section>
  );
}
