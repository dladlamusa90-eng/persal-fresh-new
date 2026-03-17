export default function Topbar() {
  return (
    <header className="w-full flex items-center justify-between py-6 px-4 md:px-8 mb-6 bg-white shadow-none">
      <div className="flex w-full items-center justify-between">
        <a href="/dashboard" className="flex items-center gap-2">
          <img src="/logo.png" alt="Persal Logo" className="w-[120px] h-[120px] object-contain -my-8" style={{ width: '120px', height: '120px' }} />
        </a>
      </div>
    </header>
  );
}
