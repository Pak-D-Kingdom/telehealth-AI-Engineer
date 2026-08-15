import httpx
import time
from typing import List, Dict, Any, Optional


class BackendClient:
    def __init__(self, backend_url: str = "http://localhost:4000", cache_ttl: int = 300):
        self.backend_url = backend_url
        self.cache_ttl = cache_ttl
        
        self._products_cache = None
        self._doctors_cache = None
        self._categories_cache = None
        self._cache_timestamp = 0

    def _is_cache_valid(self) -> bool:
        return (time.time() - self._cache_timestamp) < self.cache_ttl

    def _fetch_data(self, endpoint: str) -> Optional[Any]:
        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.get(f"{self.backend_url}{endpoint}")
                if response.status_code == 200:
                    data = response.json()
                    print(f"[BackendClient] Fetched {endpoint}: {type(data)}")
                    return data
                print(f"[BackendClient] Backend returned {response.status_code} for {endpoint}")
                return None
        except Exception as e:
            print(f"[BackendClient] Error fetching from backend: {e}")
            return None

    def _extract_array(self, data: Any) -> List[Dict]:
        if isinstance(data, list):
            return [item for item in data if isinstance(item, dict)]
        
        if isinstance(data, dict):
            for key in ['data', 'products', 'items', 'results']:
                if key in data and isinstance(data[key], list):
                    return [item for item in data[key] if isinstance(item, dict)]
        
        return []

    def get_products(self) -> List[Dict]:
        if self._is_cache_valid() and self._products_cache is not None:
            return self._products_cache
        
        data = self._fetch_data("/api/products")
        
        if data is not None:
            products = self._extract_array(data)
            self._products_cache = products
            self._cache_timestamp = time.time()
            print(f"[BackendClient] Cached {len(products)} products")
            return products
        
        return self._products_cache or []

    def get_doctors(self) -> List[Dict]:
        if self._is_cache_valid() and self._doctors_cache is not None:
            return self._doctors_cache
        
        data = self._fetch_data("/api/doctors")
        
        if data is not None:
            doctors = self._extract_array(data)
            self._doctors_cache = doctors
            self._cache_timestamp = time.time()
            print(f"[BackendClient] Cached {len(doctors)} doctors")
            return doctors
        
        return self._doctors_cache or []

    def get_categories(self) -> List[Dict]:
        if self._is_cache_valid() and self._categories_cache is not None:
            return self._categories_cache
        
        data = self._fetch_data("/api/doctor-categories")
        
        if data is not None:
            categories = self._extract_array(data)
            self._categories_cache = categories
            self._cache_timestamp = time.time()
            print(f"[BackendClient] Cached {len(categories)} categories")
            return categories
        
        return self._categories_cache or []

    def search_products(self, keywords: List[str], category: str = None) -> List[Dict]:
        products = self.get_products()
        
        if not keywords and not category:
            return products[:4]
        
        results = []
        for product in products:
            if not isinstance(product, dict):
                print(f"[BackendClient] Skipping non-dict product: {product}")
                continue
            
            product_text = (
                product.get("name", "") + " " +
                product.get("category", "") + " " +
                product.get("description", "")
            ).lower()
            
            if category and category.lower() in product.get("category", "").lower():
                results.append(product)
                continue
            
            if any(kw.lower() in product_text for kw in keywords):
                results.append(product)
        
        return results[:4]

    def search_doctors(self, keywords: List[str], category_id: str = None) -> List[Dict]:
        doctors = self.get_doctors()
        
        if not keywords and not category_id:
            return doctors
        
        results = []
        for doctor in doctors:
            if not isinstance(doctor, dict):
                print(f"[BackendClient] Skipping non-dict doctor: {doctor}")
                continue
            
            doctor_text = (
                doctor.get("name", "") + " " +
                doctor.get("specialty", "")
            ).lower()
            
            if any(kw.lower() in doctor_text for kw in keywords):
                results.append(doctor)
        
        return results