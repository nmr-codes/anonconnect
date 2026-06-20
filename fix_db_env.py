import requests

API_KEY = "rnd_A1clK0F8uwqncEDGmb5dlo7El7D3"
HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Accept": "application/json",
    "Content-Type": "application/json"
}

backend_id = "srv-d8r2jkugvqtc73eeuip0"

env_vars = [
    {"key": "DATABASE_URL", "value": "postgresql://anonconnect_db_bp_user:RKWMKIcyL9NkXt9NFHnbIHinZ9AeCjSJ@dpg-d8r2jbugvqtc73eeu4ng-a/anonconnect_db_bp"},
    {"key": "REDIS_URL", "value": "redis://red-d8r2jbugvqtc73eeu4jg:6379"},
    {"key": "JWT_SECRET", "value": "Jhd7Pzg1eL9qgkZ7ujrtZM4KRgfnlTD5gDEKp1vrrcM="},
    {"key": "FRONTEND_URL", "value": "https://anonconnect-alpha.vercel.app"},
    {"key": "DEBUG", "value": "False"}
]

res = requests.put(f"https://api.render.com/v1/services/{backend_id}/env-vars", headers=HEADERS, json=env_vars)
print(res.status_code, res.text)

# Also trigger deploy explicitly just in case
res = requests.post(f"https://api.render.com/v1/services/{backend_id}/deploys", headers=HEADERS)
print("Deploy Trigger:", res.status_code, res.text)
