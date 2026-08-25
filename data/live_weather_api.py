import requests

class LiveWeatherFetcher:
    """
    LiveWeatherFetcher handles real-time meteorological data fetching.
    This module represents Layer 3 (Alternative Data Intelligence) of our KisanScore architecture.
    It uses the Open-Meteo API, which requires no authentication key, making it ideal for the live demo.
    """
    
    def get_live_farm_weather(self, lat: float, lon: float) -> dict:
        """
        Fetches live weather data for a given farm location.
        Extracts current precipitation, soil temperature at 10cm, and daily precipitation sum.
        If the API call fails, falls back to a hardcoded mock dataset to ensure demo continuity.
        """
        url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=precipitation,soil_temperature_10cm&daily=precipitation_sum&timezone=auto"
        
        try:
            # Set a 5-second timeout so the UI doesn't hang if there's no internet during the demo
            response = requests.get(url, timeout=5)
            response.raise_for_status()  # Raise an exception for HTTP errors (like 404, 500)
            
            data = response.json()
            
            # Extract requested fields
            current_precipitation = data.get("current", {}).get("precipitation", 0.0)
            soil_temp = data.get("current", {}).get("soil_temperature_10cm", 0.0)
            
            # 'daily.precipitation_sum' is usually a list corresponding to forecasted days. We take today's (index 0).
            daily_precip_list = data.get("daily", {}).get("precipitation_sum", [])
            daily_precip_sum = daily_precip_list[0] if daily_precip_list else 0.0
            
            return {
                "current_precipitation": current_precipitation,
                "soil_temp_10cm": soil_temp,
                "daily_precipitation_sum": daily_precip_sum,
                "status": "live_api_success"
            }
            
        except Exception as e:
            # Hackathon Fallback Mechanism
            print(f"WARNING: Live API failed ({e}). Falling back to mock data.")
            return {
                "current_precipitation": 0.0,
                "soil_temp_10cm": 24.5,
                "daily_precipitation_sum": 0.0,
                "status": "mock_fallback"
            }

if __name__ == "__main__":
    # Test block using coordinates for Tiruppur, Tamil Nadu
    test_lat = 11.1085
    test_lon = 77.3411
    
    print(f"Testing Layer 3: LiveWeatherFetcher for Tiruppur (Lat: {test_lat}, Lon: {test_lon})")
    
    fetcher = LiveWeatherFetcher()
    weather_data = fetcher.get_live_farm_weather(test_lat, test_lon)
    
    print(f"Result: {weather_data}")
