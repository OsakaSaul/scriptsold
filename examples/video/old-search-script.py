import os
import requests

search_key = os.environ["SEARCH_API_KEY"]

def search(words):
    response = requests.get(
        "https://api.bing.microsoft.com/v7.0/search",
        params={"q": words},
        headers={"Ocp-Apim-Subscription-Key": search_key},
    )
    return response.json()
