import requests
from datetime import datetime

API_BASE_URL = "https://rls7a91cpd.execute-api.eu-central-1.amazonaws.com/dev/"

sample_product = {"id": "435345", "title": "TABLETAS DE LIMPIEZA ESPRESSO-"}

res = requests.post(API_BASE_URL + "products", json={"product": sample_product})


# res = requests.patch(API_BASE_URL + "products/3263893", json={"asin": "B07Y1N56LW", "current_amazon_price": 5.99, "current_amazon_price_timestamp": datetime.now().isoformat()})

# res = requests.get(API_BASE_URL + "products/3263893")

# res = requests.get(API_BASE_URL + "products")
print(res.json())
