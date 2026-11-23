import os
import requests

BING_KEY = os.environ["BING_SEARCH_KEY"]


def search_web(query):
    # RESURRECT: no FoxAPIs equivalent
    response = requests.get(
        "https://api.bing.microsoft.com/v7.0/search",
        params={"q": query},
        headers={"Ocp-Apim-Subscription-Key": BING_KEY},
    )
    return [{"title": p["name"], "link": p["url"]} for p in response.json()["webPages"]["value"]]
