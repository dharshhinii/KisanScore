import math

class LiveNDVIFetcher:
    """
    Simulates querying Google Earth Engine (GEE) REST API or Sentinel Hub for a GeoTIFF image 
    and parsing the pixel values to calculate Normalized Difference Vegetation Index (NDVI).
    """

    def get_satellite_ndvi(self, lat: float, lon: float) -> dict:
        """
        Fetches satellite NDVI data. Falls back to a proxy calculation based on coordinates
        if authentication fails (e.g., missing API keys).
        """
        try:
            # Simulate AuthenticationError for GEE
            raise PermissionError("AuthenticationError: Invalid or missing Google Earth Engine API keys.")
        except Exception as e:
            print(f"WARNING: Satellite API failed ({e}). Calculating proxy NDVI.")
            # Proxy NDVI calculation based on latitude and longitude
            # Example: Punjab/Haryana (Lat ~29-32) are highly fertile, so higher NDVI
            if 28.0 <= lat <= 32.5 and 73.0 <= lon <= 77.0:
                proxy_ndvi = 0.75  # High fertility region
            else:
                # Generate a pseudo-random but deterministic NDVI between 0.2 and 0.8 based on coordinates
                base_val = abs(math.sin(lat * lon)) 
                proxy_ndvi = 0.2 + (base_val * 0.6)
            
            return {
                "ndvi": round(proxy_ndvi, 2),
                "status": "mock_fallback"
            }

if __name__ == "__main__":
    fetcher = LiveNDVIFetcher()
    # Test Ludhiana, Punjab
    print(fetcher.get_satellite_ndvi(30.900965, 75.857277))
