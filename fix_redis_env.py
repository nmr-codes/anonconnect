import requests

API_KEY = "rnd_A1clK0F8uwqncEDGmb5dlo7El7D3"
HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Accept": "application/json",
    "Content-Type": "application/json"
}

backend_id = "srv-d8r2jkugvqtc73eeuip0"

payload = [
    {"envVars": [{"key": "REDIS_URL", "value": "redis://red-d8r2jbugvqtc73eeu4jg:6379"}]}
]

res = requests.put(f"https://api.render.com/v1/services/{backend_id}/env-vars", headers=HEADERS, json=payload[0]["envVars"])
print(res.status_code, res.text)
