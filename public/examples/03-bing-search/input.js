// Web search for a query, using the Bing Search API.
const BING_KEY = process.env.BING_SEARCH_KEY;

export async function searchWeb(query) {
  const url = "https://api.bing.microsoft.com/v7.0/search?q=" + encodeURIComponent(query);
  const res = await fetch(url, { headers: { "Ocp-Apim-Subscription-Key": BING_KEY } });
  const data = await res.json();
  return data.webPages.value.map((p) => ({ title: p.name, link: p.url }));
}
