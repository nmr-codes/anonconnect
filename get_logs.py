import requests

API_KEY = "rnd_A1clK0F8uwqncEDGmb5dlo7El7D3"
HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Accept": "application/json"
}

res = requests.get("https://api.render.com/v1/services/srv-d8r2jkugvqtc73eeuip0/deploys/dep-d8r5vecvikkc7386bqcg", headers=HEADERS)
print(res.text)
