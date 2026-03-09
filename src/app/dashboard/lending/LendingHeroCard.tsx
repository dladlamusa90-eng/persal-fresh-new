import { ShieldCheck, BadgeCheck, Banknote } from "lucide-react";

export default function LendingHeroCard() {
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 flex flex-col gap-4 w-full max-w-xs mx-auto">
      <div className="flex items-center gap-2">
        <Banknote className="w-6 h-6 text-blue-600" />
        <span className="text-lg font-bold text-gray-900">R 2,500</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-500 text-xs">Monthly Deduction</span>
        <span className="text-base font-semibold text-blue-700 ml-auto">R 1,250</span>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <ShieldCheck className="w-5 h-5 text-blue-600" />
        <span className="text-xs font-medium text-blue-700">Secure Payroll Deduction</span>
      </div>
    </div>
  );
}
