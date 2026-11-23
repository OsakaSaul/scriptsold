import os
import requests

api_key = os.environ["PROXYCURL_API_KEY"]
api_endpoint = "https://nubela.co/proxycurl/api/v2/linkedin"
headers = {"Authorization": "Bearer " + api_key}

def load_profile(profile_url):
    response = requests.get(
        api_endpoint,
        params={"url": profile_url, "use_cache": "if-present"},
        headers=headers,
    )
    return response.json()

if __name__ == "__main__":
    person = load_profile("https://www.linkedin.com/in/satyanadella/")
    print(person["full_name"], "-", person["headline"])
