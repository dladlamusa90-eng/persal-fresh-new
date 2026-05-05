"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";

interface FaceIdGateProps {
  onVerified: () => void;
}

type Step = "checking" | "idle" | "camera" | "captured" | "submitting" | "verified" | "failed";

export default function FaceIdGate({ onVerified }: FaceIdGateProps) {
  const [step, setStep] = useState<Step>("checking");
  const [statusMessage, setStatusMessage] = useState("");
  const [enrolled, setEnrolled] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let mounted = true;
    async function checkStatus() {
      try {
        const res = await fetch("/api/faceid/session");
        if (!mounted) return;
        if (res.ok) {
          const data = (await res.json()) as { verified?: boolean; enrolled?: boolean };
          if (data.verified) {
            setStep("verified");
            onVerified();
          } else {
            // FaceIdGate component removed. No face recognition logic remains.
            export default function FaceIdGate() {
              return null;
            }
          setStep("idle");
