import requests

API_KEY = "rnd_A1clK0F8uwqncEDGmb5dlo7El7D3"
HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Accept": "application/json"
}

res = requests.get("https://api.render.com/v1/postgres/dpg-d8r2jbugvqtc73eeu4ng-a/connection-info", headers=HEADERS)
print(res.text)
