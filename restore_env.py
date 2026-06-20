import requests

API_KEY = "rnd_A1clK0F8uwqncEDGmb5dlo7El7D3"
HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Accept": "application/json",
    "Content-Type": "application/json"
}

backend_id = "srv-d8r2jkugvqtc73eeuip0"

env_vars = [
    {"key": "DATABASE_URL", "value": "postgresql://anonconnect_db_user:vcoAwu6zP1mJ6l9ZaI0cRXTGXjY2HeEO@dpg-d8r2dnojs32c73bgd2u0-a/anonconnect_db"},
    {"key": "REDIS_URL", "value": "redis://red-d8r2jbugvqtc73eeu4jg:6379"},
    {"key": "JWT_SECRET", "generateValue": True},
    {"key": "FRONTEND_URL", "value": "https://anonconnect-alpha.vercel.app"},
    {"key": "DEBUG", "value": "False"}
]

res = requests.put(f"https://api.render.com/v1/services/{backend_id}/env-vars", headers=HEADERS, json=env_vars)
print(res.status_code, res.text)
