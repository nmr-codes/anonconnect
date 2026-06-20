import requests

API_KEY = "rnd_A1clK0F8uwqncEDGmb5dlo7El7D3"
HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Accept": "application/json",
    "Content-Type": "application/json"
}

# 1. Get services
res = requests.get("https://api.render.com/v1/services?limit=20", headers=HEADERS)
services = res.json()

backend_id = None
for s in services:
    if s["service"]["name"] == "anonconnect-backend":
        backend_id = s["service"]["id"]
        break

if not backend_id:
    print("Backend service not found")
    exit(1)

print(f"Found backend id: {backend_id}")

# 2. Trigger deploy
res = requests.post(f"https://api.render.com/v1/services/{backend_id}/deploys", headers=HEADERS)
print(res.status_code, res.text)
