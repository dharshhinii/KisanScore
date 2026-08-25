/**
 * client.js
 * ---------
 * KisanScore API Client — connects to the live FastAPI backend.
 * Base URL: http://localhost:8000
 *
 * All 4 endpoints wired to the real API contract.
 * Falls back gracefully with error messages if backend is offline.
 */

const BASE_URL = "http://localhost:8000";

// ── Generic fetch wrapper ────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── 1. POST /api/v1/applications ─────────────────────────────────────────────
/**
 * Called by Postman portal on "Submit Application".
 * Sends farmer data → backend runs routing engine → returns application_id.
 */
export async function submitApplication(data) {
  return apiFetch("/api/v1/applications", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ── 2. GET /api/v1/applications ──────────────────────────────────────────────
/**
 * Called by Bank Dashboard on load.
 * Returns array of all pending applications for the table.
 */
export async function fetchPendingQueue() {
  return apiFetch("/api/v1/applications");
}

// ── 3. GET /api/v1/applications/{id}/score ───────────────────────────────────
/**
 * Called when Bank Officer clicks a farmer row.
 * Returns kisan_score, shap_explainability, risk_level, routing_path.
 */
export async function fetchScore(application_id) {
  return apiFetch(`/api/v1/applications/${application_id}/score`);
}

// ── 4. POST /api/v1/applications/{id}/decision ───────────────────────────────
/**
 * Called when Bank Officer clicks APPROVE or REJECT.
 * Persists decision to database and triggers downstream actions.
 */
export async function submitDecision(application_id, decision, loan_amount = 50000) {
  return apiFetch(`/api/v1/applications/${application_id}/decision`, {
    method: "POST",
    body: JSON.stringify({
      officer_id: "OFF_001",
      decision,
      loan_amount,
      insurance_bundled: decision === "APPROVED",
    }),
  });
}
