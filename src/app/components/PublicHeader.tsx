import Link from "next/link";

export default function PublicHeader() {
  return (
    <header className="w-full flex items-center justify-center py-2 px-4 md:px-8 mb-2 bg-white shadow-none">
      <div className="flex w-full max-w-5xl items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="Persal Logo" className="w-[100px] h-[100px] object-contain -my-5" style={{ width: '100px', height: '100px' }} />
        </a>
        <nav className="flex gap-4 items-center">
          <a
            href="/auth/signup"
            className="bg-white text-persal-blue border border-persal-blue font-semibold px-4 py-2 rounded shadow hover:bg-persal-blue hover:text-white transition"
          >
            SignUp
          </a>
          <a
            href="/auth/login"
            className="bg-persal-blue text-white font-semibold px-4 py-2 rounded shadow hover:bg-persal-dark transition"
          >
            LogIn
          </a>
        </nav>
      </div>
    </header>
  );
}
