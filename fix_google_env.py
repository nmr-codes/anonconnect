import requests

API_KEY = "rnd_A1clK0F8uwqncEDGmb5dlo7El7D3"
HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Accept": "application/json",
    "Content-Type": "application/json"
}

backend_id = "srv-d8r2jkugvqtc73eeuip0"

# Fetch existing
res = requests.get(f"https://api.render.com/v1/services/{backend_id}/env-vars", headers=HEADERS)
current_vars = [item["envVar"] for item in res.json()]

# Check if GOOGLE_CLIENT_ID exists
found = False
for var in current_vars:
    if var["key"] == "GOOGLE_CLIENT_ID":
        found = True
        break

if not found:
    current_vars.append({
        "key": "GOOGLE_CLIENT_ID",
        "value": "500724399689-1jkl9pmjv2qu775108qev1n279d5mjga.apps.googleusercontent.com"
    })
    
    # Put updated
    res = requests.put(f"https://api.render.com/v1/services/{backend_id}/env-vars", headers=HEADERS, json=current_vars)
    print("Env Update Status:", res.status_code)
    
    # Deploy
    res = requests.post(f"https://api.render.com/v1/services/{backend_id}/deploys", headers=HEADERS)
    print("Deploy Status:", res.status_code)
else:
    print("GOOGLE_CLIENT_ID already exists!")
