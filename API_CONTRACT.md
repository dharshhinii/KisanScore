# 🚀 KISANSCORE API CONTRACT (MVP)
**Base Backend URL:** `http://localhost:8000`

---

## 📱 1. Submit New Farmer (Used by the `/postman` Web View)
**Endpoint:** `POST /api/v1/applications`

**Description:** Sends the data from the Postman's data-entry form to the FastAPI backend.

**Request Body (Frontend sends this):**
```json
{
  "aadhaar": "XXXX-XXXX-1234",
  "farmer_name": "Ramesh Kumar",
  "crop_type": "Paddy",
  "land_size_acres": 2.5,
  "gps_coordinates": "12.971, 77.594",
  "cibil_score": -1
}
```

**Response Body (Backend replies):**
```json
{
  "status": "success",
  "application_id": "APP_9942",
  "message": "Application saved. AI Routing initiated."
}
```

---

## 💻 2. Fetch Pending Queue (Used by the `/dashboard` Web View)
**Endpoint:** `GET /api/v1/applications`

**Description:** Fetches the list of all farmers waiting for a loan approval to display on the Bank Officer's table.

**Response Body (Backend replies):**
```json
[
  {
    "application_id": "APP_9942",
    "farmer_name": "Ramesh Kumar",
    "crop": "Paddy",
    "route": "Route A (Cold-Start)"
  },
  {
    "application_id": "APP_9943",
    "farmer_name": "Suresh Patel",
    "crop": "Cotton",
    "route": "Route B (Fast-Track)"
  }
]
```

---

## 🧠 3. Fetch AI Score & SHAP Data (Used by the `/dashboard` Web View)
**Endpoint:** `GET /api/v1/applications/{application_id}/score`

**Description:** When the Bank Officer clicks on a farmer in the table, fetch the heavy ML data (XGBoost Score + SHAP Impact Cards).

**Response Body (Backend replies):**
```json
{
  "application_id": "APP_9942",
  "farmer_type": "First-Year Farmer (No History)",
  "kisan_score": 640,
  "risk_level": "Moderate",
  "shap_explainability": [
    {"feature": "Rich Soil Quality (ISRIC)", "impact": "+50"},
    {"feature": "High Demand Crop (Paddy)", "impact": "+20"},
    {"feature": "Slight Regional Flood Risk", "impact": "-10"}
  ],
  "system_recommendation": "Offer Starter Micro-Loan. Mandate Crop Insurance."
}
```

---

## 🏦 4. Submit Officer Decision (Used by the `/dashboard` Web View)
**Endpoint:** `POST /api/v1/applications/{application_id}/decision`

**Description:** Triggered when the Bank Officer clicks the giant "Approve" or "Reject" button on the UI.

**Request Body (Frontend sends this):**
```json
{
  "decision": "APPROVED",
  "loan_amount": 15000,
  "insurance_bundled": true
}
```

**Response Body (Backend replies):**
```json
{
  "status": "success",
  "message": "Loan Approved. Disbursement scheduled to IPPB account."
}
```
