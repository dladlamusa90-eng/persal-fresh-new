"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, signIn } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";

type LoginTab = "id" | "email";

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<LoginTab>("id");
  const [idNumber, setIdNumber] = useState("");
  const [otpInfo, setOtpInfo] = useState("");
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

  function handleOtpRequest(e: React.FormEvent) {
    e.preventDefault();

    const sanitized = idNumber.replace(/\D/g, "");
    if (sanitized.length !== 13) {
      setOtpInfo("Please enter a valid 13-digit SA ID number.");
      return;
    }

    setOtpInfo("OTP sent. Please check your cellphone linked to your ID number.");
  }

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
    <section className="relative min-h-screen bg-neutral-100 overflow-hidden">
      <canvas id="auth-bg-balls-canvas" className="fixed inset-0 w-full h-full z-0 pointer-events-none" style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh" }} />
      <div className="relative z-10 min-h-screen flex flex-col">
        <header className="w-full flex items-center justify-between py-2 px-4 md:px-8 mb-2 bg-white shadow-none">
          <div className="flex w-full items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Persal Logo" className="w-[90px] h-[90px] object-contain -my-4" style={{ width: "90px", height: "90px" }} />
            </a>
            <nav className="flex gap-4 items-center">
              <a href="/auth/login" className="text-persal-dark font-medium px-4 py-2 rounded hover:bg-blue-50 transition">Login</a>
              <a href="/auth/login" className="bg-persal-blue text-white font-semibold px-4 py-2 rounded shadow hover:bg-persal-dark transition">Apply</a>
            </nav>
          </div>
        </header>

        <div className="max-w-6xl mx-auto w-full px-4 md:px-6 mt-8 pb-10 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-3xl p-6 md:p-10 shadow-sm">
          <div className="bg-gray-200 rounded-full p-1 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab("id");
                setError("");
              }}
              className={`w-1/2 rounded-full py-3 text-base font-medium transition ${activeTab === "id" ? "bg-white text-sky-600 shadow" : "text-gray-700 hover:text-gray-900"}`}
            >
              ID number login
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("email");
                setOtpInfo("");
              }}
              className={`w-1/2 rounded-full py-3 text-base font-medium transition ${activeTab === "email" ? "bg-white text-sky-600 shadow" : "text-gray-700 hover:text-gray-900"}`}
            >
              Email login
            </button>
          </div>

          <div className="mt-12">
            <h1 className="text-3xl md:text-4xl text-gray-800 font-medium">Welcome back, please log in</h1>

            {activeTab === "id" ? (
              <form onSubmit={handleOtpRequest} className="mt-8 space-y-10">
                <p className="text-lg text-gray-600">Enter your SA ID number and we&apos;ll send you a One Time Pin (OTP)</p>
                <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] items-center gap-4">
                  <label htmlFor="id-number" className="text-gray-700 text-xl">SA ID number</label>
                  <input
                    id="id-number"
                    type="text"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="ID number"
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-300"
                  />
                </div>
                {otpInfo && <p className="text-sm font-medium text-sky-700">{otpInfo}</p>}
                <div className="flex items-center justify-between gap-4 pt-8">
                  <p className="text-gray-700 text-lg">Don&apos;t have an account? <a href="/auth/signup" className="text-sky-600 hover:underline">Register</a></p>
                  <button type="submit" className="bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl px-10 py-3 text-2xl min-w-[260px] transition">
                    Get OTP
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="mt-8 space-y-6 max-w-2xl">
                <div className="grid grid-cols-1 gap-5">
                  <div>
                    <label htmlFor="email" className="block text-gray-700 mb-2">Email</label>
                    <input
                      id="email"
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="border rounded-xl p-3 w-full"
                    />
                  </div>
                  <div className="relative w-full">
                    <label htmlFor="password" className="block text-gray-700 mb-2">Password</label>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="border rounded-xl p-3 pr-12 w-full"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-[58px] -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                {error && <div className="text-red-600 text-sm font-semibold">{error}</div>}
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm text-gray-500">Don&apos;t have an account? <a href="/auth/signup" className="text-blue-600 hover:underline">Sign Up</a></p>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Signing In..." : "Sign In"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
