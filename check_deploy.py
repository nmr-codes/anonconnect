import requests

API_KEY = "rnd_A1clK0F8uwqncEDGmb5dlo7El7D3"
HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Accept": "application/json"
}

backend_id = "srv-d8r2jkugvqtc73eeuip0"
res = requests.get(f"https://api.render.com/v1/services/{backend_id}/deploys?limit=1", headers=HEADERS)
print(res.text)
