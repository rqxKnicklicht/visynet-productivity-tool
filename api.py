import requests
from datetime import datetime

API_BASE_URL = "https://rls7a91cpd.execute-api.eu-central-1.amazonaws.com/dev/"

sample_product = {"id": "435345", "title": "TABLETAS DE LIMPIEZA ESPRESSO-"}

# res = requests.post(API_BASE_URL + "products", json={"product": sample_product})


# res = requests.patch(
#     API_BASE_URL + "products/3263893",
#     json={
#         "asin": "B07Y1N56LW",
#         "current_amazon_price": 5.99,
#         "current_amazon_price_timestamp": datetime.now().isoformat(),
#     },
# )

API_KEY = "0KKWtc1G6O5j0To4qSKPw2T0CpsreNiU1ufAmo4z"
HEADERS = {
    "Content-Type": "application/json",
    "x-api-key": API_KEY,
}
# res = requests.get(API_BASE_URL + "products/3263893", headers=HEADERS)

res = requests.get(
    API_BASE_URL + "products",
    headers=HEADERS,
    json={"product_ids": ["3263893"]},
)
print(res.json())
# print(len(res.json()["products"]))
