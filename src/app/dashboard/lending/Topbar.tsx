export default function Topbar() {
  return (
    <header className="w-full flex items-center justify-center py-6 px-4 md:px-8 mb-6 bg-white shadow-none">
      <div className="flex w-full max-w-5xl items-center justify-between">
        <a href="/dashboard" className="flex items-center gap-2">
          <img src="/logo.png" alt="Persal Logo" className="w-[100px] h-[100px] object-contain -my-5" style={{ width: '100px', height: '100px' }} />
        </a>
      </div>
    </header>
  );
}
