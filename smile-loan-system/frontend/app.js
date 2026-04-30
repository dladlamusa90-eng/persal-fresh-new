const API_BASE = "http://localhost:5000";
const page = document.body?.dataset?.page;

const state = {
	stream: null,
};

function getFeedbackElement(id, parentSelector) {
	let el = document.getElementById(id);
	if (el) return el;

	const parent = document.querySelector(parentSelector);
	if (!parent) return null;

	el = document.createElement("p");
	el.id = id;
	el.className = "muted";
	el.style.marginTop = "12px";
	parent.appendChild(el);
	return el;
}

function setFeedback(element, message, isError) {
	if (!element) return;
	element.textContent = message || "";
	element.style.color = isError ? "#b42318" : "#4e6180";
	element.style.fontWeight = isError ? "700" : "400";
}

function setButtonLoading(button, isLoading, loadingText, defaultText) {
	if (!button) return;
	button.disabled = isLoading;
	button.textContent = isLoading ? loadingText : defaultText;
}

async function handleApplyPage() {
	const form = document.getElementById("apply-form");
	if (!form) return;

	const submitButton = form.querySelector('button[type="submit"]');
	const feedback = getFeedbackElement("apply-feedback", ".card");

	form.addEventListener("submit", async (event) => {
		event.preventDefault();
		setFeedback(feedback, "", false);

		const formData = new FormData(form);
		const payload = {
			first_name: String(formData.get("first_name") || "").trim(),
			last_name: String(formData.get("last_name") || "").trim(),
			id_number: String(formData.get("id_number") || "").trim(),
			phone_number: String(formData.get("phone_number") || "").trim(),
		};

		if (!payload.first_name || !payload.last_name || !payload.id_number || !payload.phone_number) {
			setFeedback(feedback, "Please complete all fields.", true);
			return;
		}

		setButtonLoading(submitButton, true, "Submitting...", "Continue");
		setFeedback(feedback, "Submitting your application...", false);

		try {
			const response = await fetch(`${API_BASE}/api/apply-loan`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			});

			const body = await response.json();

			if (!response.ok) {
				throw new Error(body.error || "Failed to submit loan application.");
			}

			localStorage.setItem("loan_user_id", body.user_id);
			localStorage.setItem("loan_id_number", payload.id_number);

			window.location.href = "./verify.html";
		} catch (error) {
			setFeedback(
				feedback,
				error instanceof Error ? error.message : "Unexpected error while submitting application.",
				true
			);
		} finally {
			setButtonLoading(submitButton, false, "Submitting...", "Continue");
		}
	});
}

async function startCamera(videoEl, placeholderEl, feedbackEl) {
	try {
		const stream = await navigator.mediaDevices.getUserMedia({
			video: { facingMode: "user" },
			audio: false,
		});

		state.stream = stream;
		videoEl.srcObject = stream;
		videoEl.style.display = "block";
		if (placeholderEl) placeholderEl.style.display = "none";
		setFeedback(feedbackEl, "Camera ready. Capture a clear selfie.", false);
	} catch (error) {
		setFeedback(
			feedbackEl,
			error instanceof Error
				? `Unable to access camera: ${error.message}`
				: "Unable to access camera.",
			true
		);
	}
}

async function captureAndVerify(videoEl, canvasEl, feedbackEl, captureButton) {
	const user_id = localStorage.getItem("loan_user_id") || "";
	const id_number = localStorage.getItem("loan_id_number") || "";

	if (!user_id || !id_number) {
		setFeedback(feedbackEl, "Missing application details. Please apply again.", true);
		return;
	}

	if (!videoEl.videoWidth || !videoEl.videoHeight) {
		setFeedback(feedbackEl, "Camera is not ready. Please wait a moment.", true);
		return;
	}

	setButtonLoading(captureButton, true, "Verifying...", "Capture Selfie");
	setFeedback(feedbackEl, "Capturing and verifying your selfie...", false);

	try {
		canvasEl.width = videoEl.videoWidth;
		canvasEl.height = videoEl.videoHeight;

		const ctx = canvasEl.getContext("2d");
		if (!ctx) {
			throw new Error("Could not initialize camera capture.");
		}

		ctx.drawImage(videoEl, 0, 0, canvasEl.width, canvasEl.height);

		const blob = await new Promise((resolve, reject) => {
			canvasEl.toBlob(
				(result) => {
					if (!result) {
						reject(new Error("Failed to capture selfie image."));
						return;
					}
					resolve(result);
				},
				"image/jpeg",
				0.92
			);
		});

		const formData = new FormData();
		formData.append("user_id", user_id);
		formData.append("id_number", id_number);
		formData.append("selfie_image", blob, "selfie.jpg");

		const response = await fetch(`${API_BASE}/api/verify-identity`, {
			method: "POST",
			body: formData,
		});

		const body = await response.json();

		if (!response.ok) {
			throw new Error(body.error || "Identity verification failed.");
		}

		localStorage.setItem("loan_verification_status", body.status || "rejected");
		localStorage.setItem("loan_verification_confidence", String(body.confidence ?? 0));

		window.location.href = "./success.html";
	} catch (error) {
		setFeedback(
			feedbackEl,
			error instanceof Error ? error.message : "Unexpected error during verification.",
			true
		);
	} finally {
		setButtonLoading(captureButton, false, "Verifying...", "Capture Selfie");
	}
}

async function handleVerifyPage() {
	const videoEl = document.getElementById("camera-preview");
	const canvasEl = document.getElementById("capture-canvas");
	const placeholderEl = document.querySelector(".camera-placeholder");
	const captureButton = document.getElementById("capture-selfie");
	const feedback = getFeedbackElement("verify-feedback", ".card");

	if (!videoEl || !canvasEl || !captureButton) return;

	if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
		setFeedback(feedback, "This browser does not support camera access.", true);
		return;
	}

	await startCamera(videoEl, placeholderEl, feedback);

	captureButton.addEventListener("click", async () => {
		await captureAndVerify(videoEl, canvasEl, feedback, captureButton);
	});

	window.addEventListener("beforeunload", () => {
		if (state.stream) {
			state.stream.getTracks().forEach((track) => track.stop());
		}
	});
}

function handleSuccessPage() {
	const titleEl = document.getElementById("result-title");
	const statusEl = document.getElementById("result-status");
	const confidenceEl = document.getElementById("result-confidence");

	if (!titleEl || !statusEl || !confidenceEl) return;

	const status = localStorage.getItem("loan_verification_status") || "rejected";
	const confidenceRaw = Number(localStorage.getItem("loan_verification_confidence") || "0");
	const confidence = Number.isFinite(confidenceRaw) ? confidenceRaw : 0;

	if (status === "approved_for_processing") {
		titleEl.textContent = "Application Approved for Processing";
		statusEl.textContent = "Approved";
		statusEl.classList.add("approved");
	} else {
		titleEl.textContent = "Application Rejected";
		statusEl.textContent = "Rejected";
		statusEl.classList.add("rejected");
	}

	confidenceEl.textContent = `Confidence score: ${confidence.toFixed(2)}`;
}

if (page === "apply") {
	void handleApplyPage();
}

if (page === "verify") {
	void handleVerifyPage();
}

if (page === "success") {
	handleSuccessPage();
}
