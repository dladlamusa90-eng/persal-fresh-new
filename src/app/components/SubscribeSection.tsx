"use client";
import React, { useState } from "react";

export default function SubscribeSection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <section className="w-full max-w-xl mx-auto bg-blue-50 rounded-2xl p-8 flex flex-col items-center gap-4 shadow mt-8">
      <h3 className="text-xl font-bold text-blue-700 mb-2">Subscribe for Updates</h3>
      <p className="text-gray-700 text-center mb-2">Get the latest news and updates about Persal Loans. No spam, ever.</p>
      {submitted ? (
        <div className="text-green-700 font-semibold">Thank you for subscribing!</div>
      ) : (
        <form className="flex flex-col md:flex-row gap-2 w-full max-w-md" onSubmit={handleSubmit}>
          <input
            type="email"
            required
            placeholder="Enter your email"
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-base focus:outline-none focus:border-blue-700"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <button
            type="submit"
            className="px-6 py-2 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800 transition"
          >
            Subscribe
          </button>
        </form>
      )}
    </section>
  );
}
