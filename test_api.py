import requests
import json

url = "http://127.0.0.1:8000/api/calculate_score"
payload = {
    "aadhaar_hash": "Aadhaar123",
    "polygon": [
        {"lat": 30.900965, "lon": 75.857277},
        {"lat": 30.91, "lon": 75.86}
    ],
    "crop_name": "Wheat",
    "state": "Punjab",
    "cibil_score": 650
}

response = requests.post(url, json=payload)
print(f"Status Code: {response.status_code}")
print("Response JSON:")
print(json.dumps(response.json(), indent=4))
