import requests

API_BASE_URL = "https://rls7a91cpd.execute-api.eu-central-1.amazonaws.com/dev/"

# res = requests.post(
#     API_BASE_URL + "products",
#     json={
#         "products": [
#             {
#                 "id": "789",
#                 "name": "Test Product",
#             }
#         ]
#     },
# )

res = requests.get(API_BASE_URL + "products")
print(len(res.json()["products"]))
