import requests

class LiveMandiFetcher:
    """
    LiveMandiFetcher handles real-time market price data fetching for crops.
    """
    def __init__(self):
        # Hardcoded 2024 prices (INR/quintal) for common crops
        self.mock_prices = {
            "wheat": 2275,
            "rice": 2183,
            "paddy": 2183,
            "maize": 2090,
            "cotton": 6620,
            "sugarcane": 315,
            "soybean": 4600
        }

    def get_live_price(self, crop_name: str, state: str) -> dict:
        """
        Simulates fetching live mandi prices for a given crop and state.
        In production, this would scrape agmarknet.gov.in using BeautifulSoup.
        Falls back to hardcoded dictionary if the live request fails.
        """
        crop_normalized = crop_name.lower().strip()
        # Simulated Govt API endpoint
        url = f"https://api.example-agmarknet-mock.gov.in/price?crop={crop_normalized}&state={state}"
        
        try:
            # Simulate an HTTP request that will likely time out or fail (connection error)
            response = requests.get(url, timeout=1)
            response.raise_for_status()
            data = response.json()
            return {
                "crop": crop_name,
                "state": state,
                "price_inr_per_quintal": data.get("price"),
                "status": "live_api_success"
            }
        except Exception as e:
            print(f"WARNING: Live Mandi API failed ({e}). Falling back to mock data.")
            # Fallback logic
            price = self.mock_prices.get(crop_normalized, 2000) # Default to 2000 if crop not found
            return {
                "crop": crop_name,
                "state": state,
                "price_inr_per_quintal": price,
                "status": "mock_fallback"
            }

if __name__ == "__main__":
    fetcher = LiveMandiFetcher()
    print(fetcher.get_live_price("Wheat", "Punjab"))
