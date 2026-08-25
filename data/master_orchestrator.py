import concurrent.futures

from data.live_weather_api import LiveWeatherFetcher
from data.mandi_price_api import LiveMandiFetcher
from data.ndvi_satellite_api import LiveNDVIFetcher

def gather_all_farm_data(lat: float, lon: float, crop_name: str, state: str) -> dict:
    """
    Orchestrates fetching data from all live API connectors concurrently.
    """
    weather_fetcher = LiveWeatherFetcher()
    mandi_fetcher = LiveMandiFetcher()
    ndvi_fetcher = LiveNDVIFetcher()
    
    # Use ThreadPoolExecutor to run these IO-bound tasks concurrently
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        future_weather = executor.submit(weather_fetcher.get_live_farm_weather, lat, lon)
        future_mandi = executor.submit(mandi_fetcher.get_live_price, crop_name, state)
        future_ndvi = executor.submit(ndvi_fetcher.get_satellite_ndvi, lat, lon)
        
        weather_data = future_weather.result()
        mandi_data = future_mandi.result()
        ndvi_data = future_ndvi.result()
        
    return {
        "weather": weather_data,
        "market": mandi_data,
        "satellite": ndvi_data
    }

if __name__ == "__main__":
    import json
    # Example test
    result = gather_all_farm_data(30.900965, 75.857277, "Wheat", "Punjab")
    print(json.dumps(result, indent=4))
