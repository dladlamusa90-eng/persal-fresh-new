
"use client";
import React, { useEffect, useState } from "react";

export default function LoanAnimation() {
  const [salary, setSalary] = useState(0);
  const [disposable, setDisposable] = useState(0);
  const [maxLoan, setMaxLoan] = useState(0);

  useEffect(() => {
    let s = 0, d = 0;
    const salaryTarget = 8500;
    const disposableTarget = 2100;
    const salaryStep = 170;
    const disposableStep = 42;
    const interval = setInterval(() => {
      if (s < salaryTarget) {
        s += salaryStep;
        setSalary(Math.min(s, salaryTarget));
      } else if (d < disposableTarget) {
        d += disposableStep;
        setDisposable(Math.min(d, disposableTarget));
      } else {
        // Calculate max loan once numbers are in
        setMaxLoan(calculateLogicalMax(salaryTarget, disposableTarget));
        clearInterval(interval);
      }
    }, 30);
    return () => clearInterval(interval);
  }, []);

  function calculateLogicalMax(salary: number, disposable: number) {
    if (salary >= 10000) return Math.min(disposable, 5000);
    if (salary < 2000) return 0;
    const minCap = 500;
    const maxCap = 5000;
    const scaled = minCap + ((salary - 2000) / (10000 - 2000)) * (maxCap - minCap);
    return Math.floor(Math.min(disposable, scaled) / 100) * 100;
  }

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow p-6 flex flex-col gap-4 items-center mt-8">
      <div className="flex flex-col md:flex-row gap-8 w-full justify-between">
        <div className="flex flex-col items-center">
          <span className="text-gray-500 text-xs">Gross Salary</span>
          <span className="text-2xl font-bold text-blue-700">R {salary.toLocaleString()}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-gray-500 text-xs">Disposable Income</span>
          <span className="text-2xl font-bold text-blue-700">R {disposable.toLocaleString()}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-gray-500 text-xs">Max Loan</span>
          <span className="text-2xl font-bold text-green-700">R {maxLoan.toLocaleString()}</span>
        </div>
      </div>
      <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden mt-4">
        <div className="h-2 bg-blue-700 rounded-full transition-all duration-500" style={{ width: `${(salary/10000)*100}%` }} />
      </div>
      <div className="w-full h-2 bg-green-100 rounded-full overflow-hidden mt-2">
        <div className="h-2 bg-green-700 rounded-full transition-all duration-500" style={{ width: `${(disposable/5000)*100}%` }} />
      </div>
    </div>
  );
}
