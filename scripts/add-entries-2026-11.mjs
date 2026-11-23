// One-off helper that appended the second batch of registry entries (2026-11-23).
// Kept so the batch can be reviewed. Run once; it refuses to add an id twice.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'data', 'registry.json');
const reg = JSON.parse(readFileSync(file, 'utf8'));
const READ = '2026-11-23';

const noMap = (reason) => ({ mapping: null, noEquivalentReason: reason });
const NO_PEOPLE = 'FoxAPIs has no endpoint for this. Nothing is mapped and your code is left alone.';

const E = [];
const add = (o) => E.push(o);

add({
  id: 'google-custom-search',
  name: 'Google Custom Search JSON API',
  status: 'scheduled',
  date: '2027-01-01',
  summary: "Google's overview page says the API is closed to new customers and that existing customers have until 1 January 2027 to move to another solution. It still answers today.",
  source: { url: 'https://developers.google.com/custom-search/v1/overview', read_on: READ },
  hosts: ['customsearch.googleapis.com', 'www.googleapis.com'],
  requirePath: true,
  endpoints: [{
    id: 'search', name: 'Custom Search', method: 'GET', oldPath: '/customsearch/v1', pathPattern: '^/customsearch/v1(/siterestrict)?/?$',
    oldPathStatus: 'host and path as commonly called; the vendor page does not print them',
    ...noMap('There is no web search endpoint in the FoxAPIs catalog. Follow Google\'s own page for what to move to.'),
  }],
});

add({
  id: 'google-plus-api',
  name: 'Google+ API',
  status: 'ended',
  date: '2019-03-07',
  summary: "Google's shutdown page says the legacy Google+ APIs were shut down on 7 March 2019.",
  source: { url: 'https://developers.google.com/+/api-shutdown', read_on: READ },
  hosts: ['www.googleapis.com'],
  requirePath: true,
  endpoints: [{
    id: 'people', name: 'People, activities and comments', method: 'GET', oldPath: '/plus/v1/people/me', pathPattern: '^/plus/v1/(people|activities|comments)(/.*)?$',
    oldPathStatus: 'path as commonly called; the vendor page does not print it',
    ...noMap(NO_PEOPLE),
  }],
});

const xNote = 'Dated entry in the X developer changelog.';
add({
  id: 'x-v11-search',
  name: 'X API v1.1 search endpoints',
  status: 'moved',
  date: null,
  effective: '2023-09-28',
  summary: "The X changelog entry of 28 September 2023 says the v1.1 search/tweets, users/search and geo/search endpoints were deprecated. The notice gives no removal date, so this is shown as moved, not as shut down.",
  source: { url: 'https://docs.x.com/changelog', read_on: READ, note: xNote },
  hosts: ['api.twitter.com', 'api.x.com'],
  requirePath: true,
  endpoints: [{
    id: 'search', name: 'search/tweets, users/search, geo/search', method: 'GET', oldPath: '/1.1/search/tweets.json', pathPattern: '^/1\\.1/(search/tweets|users/search|geo/search)\\.json$',
    ...noMap('FoxAPIs has no X search endpoint. Nothing is mapped.'),
  }],
});

add({
  id: 'x-v11-statuses-filter',
  name: 'X API v1.1 statuses/filter stream',
  status: 'moved',
  date: null,
  effective: '2023-03-14',
  summary: 'The X changelog entry of 14 March 2023 says the v1.1 statuses/filter endpoint was deprecated. No removal date is given, so this is shown as moved, not as shut down.',
  source: { url: 'https://docs.x.com/changelog', read_on: READ, note: xNote },
  hosts: ['stream.twitter.com'],
  requirePath: true,
  endpoints: [{
    id: 'filter', name: 'statuses/filter', method: 'POST', oldPath: '/1.1/statuses/filter.json', pathPattern: '^/1\\.1/statuses/filter\\.json$',
    ...noMap('FoxAPIs has no streaming endpoint. Nothing is mapped.'),
  }],
});

add({
  id: 'x-v11-legacy-dm',
  name: 'X API v1.1 legacy Direct Message endpoints',
  status: 'ended',
  date: '2018-09-17',
  summary: 'The X changelog entry of 17 September 2018 says the legacy Direct Message endpoints were fully retired. The newer direct_messages/events paths are not covered.',
  source: { url: 'https://docs.x.com/changelog', read_on: READ, note: xNote },
  hosts: ['api.twitter.com', 'api.x.com'],
  requirePath: true,
  endpoints: [{
    id: 'dm', name: 'direct_messages (legacy)', method: 'GET', oldPath: '/1.1/direct_messages.json', pathPattern: '^/1\\.1/direct_messages(/(sent|show|new|destroy))?\\.json$',
    oldPathStatus: 'paths from the old API reference, not re-read; the changelog names the group only',
    ...noMap('FoxAPIs has no direct message endpoint. Nothing is mapped.'),
  }],
});

add({
  id: 'x-v11-help-configuration',
  name: 'X API v1.1 help/configuration',
  status: 'ended',
  date: '2021-06-18',
  summary: 'The X changelog entry of 18 June 2021 says the standard v1.1 GET help/configuration endpoint was retired.',
  source: { url: 'https://docs.x.com/changelog', read_on: READ, note: xNote },
  hosts: ['api.twitter.com', 'api.x.com'],
  requirePath: true,
  endpoints: [{
    id: 'help_configuration', name: 'help/configuration', method: 'GET', oldPath: '/1.1/help/configuration.json', pathPattern: '^/1\\.1/help/configuration\\.json$',
    ...noMap('Configuration values for the X API have no FoxAPIs equivalent. Nothing is mapped.'),
  }],
});

add({
  id: 'instagram-legacy-api',
  name: 'Instagram API Platform (legacy, api.instagram.com/v1)',
  status: 'ended',
  date: '2020-06-29',
  summary: "Meta's developer blog says the Instagram Legacy API Platform was due to be disabled on 31 March 2020 and that, in a 30 March 2020 update, it was postponed by 90 days to 29 June 2020.",
  source: { url: 'https://developers.facebook.com/blog/post/2020/03/10/final-reminder-Instagram-legacy-api-platform-disabled-mar-31/', read_on: READ },
  hosts: ['api.instagram.com'],
  requirePath: true,
  endpoints: [{
    id: 'legacy_v1', name: 'Legacy v1 users, media and tags', method: 'GET', oldPath: '/v1/users/self/media/recent', pathPattern: '^/v1/(users|media|tags|locations|geographies)(/.*)?$',
    oldPathStatus: 'host and path as commonly called; the vendor post names the platform, not the paths',
    ...noMap('FoxAPIs reads one Instagram post by its address (POST /v1/social/instagram/post). That is not the same call as the old user and tag listings, so nothing is mapped.'),
  }],
});

add({
  id: 'crunchbase-v3',
  name: 'Crunchbase API v3.1',
  status: 'ended',
  date: '2021-01-29',
  summary: "Crunchbase's release history says end of support for API v3.1 was 30 October 2020 and end of life 29 January 2021, after which it is no longer accessible. Crunchbase's Basic getting-started page also says the Basic API is no longer offered (no date given).",
  source: { url: 'https://data.crunchbase.com/docs/api-release-history', read_on: READ },
  hosts: ['api.crunchbase.com'],
  requirePath: true,
  endpoints: [{
    id: 'organizations', name: 'Organizations (v3.1)', method: 'GET', oldPath: '/v3.1/organizations/{permalink}', pathPattern: '^/(v/3|v3\\.1)/(odm-)?(organizations|people|funding-rounds|acquisitions|ipos|products|categories|locations|searches)(/.*)?$',
    oldPathStatus: 'paths as commonly called; the release history names the version, not the paths',
    oldParams: ['user_key'],
    mapping: {
      foxapis: { path: '/v1/get_company_snapshot', method: 'POST' },
      async: true,
      body: [{ to: 'domain', inputs: ['domain'], required: true, todo: 'company website domain (the old call had only a Crunchbase permalink)' }],
      paramNotes: [
        { old: '(permalink in the path)', new: 'domain', note: 'not convertible: FoxAPIs takes the company website domain, so a TODO placeholder is inserted' },
        { old: 'user_key', new: '(dropped)', note: 'replaced by your FoxAPIs key in FOXAPIS_KEY' },
      ],
      result: {
        kind: 'raw',
        rawNote: 'PARTIAL. get_company_snapshot answers with a written company snapshot (async: 202, then poll), not Crunchbase fields. It is returned unchanged and no field table is claimed.',
        fieldMap: [],
      },
    },
  }],
});

add({
  id: 'yahoo-boss',
  name: 'Yahoo BOSS Search API',
  status: 'ended',
  date: '2016-03-31',
  summary: "The Next Web (11 March 2016) reports Yahoo's notice that BOSS users must switch to Yahoo Partner Ads by 31 March 2016. The article does not use the word discontinued; the date is the vendor's switch-by date.",
  source: { url: 'https://thenextweb.com/news/yahoo-killing-off-products-sidelining-search-access-developers', read_on: READ, published: '2016-03-11' },
  hosts: ['yboss.yahooapis.com'],
  requirePath: false,
  endpoints: [{
    id: 'search', name: 'BOSS web search', method: 'GET', oldPath: '/ysearch/web', pathPattern: '^/ysearch(/.*)?$',
    oldPathStatus: 'host and path as commonly called; the article does not print them',
    ...noMap('There is no web search endpoint in the FoxAPIs catalog. Nothing is mapped.'),
  }],
});

add({
  id: 'alexa-awis',
  name: 'Alexa Web Information Service and Top Sites APIs',
  status: 'ended',
  date: '2022-12-15',
  summary: 'SecurityWeek (6 May 2022) reports that the Alexa Top Sites and Web Information Service APIs were scheduled to be retired on 15 December 2022. The date comes from news coverage of the retirement notice, not from a page on the vendor site.',
  source: { url: 'https://www.securityweek.com/impact-alexa-ranking-service-shutdown-cybersecurity-industry', read_on: READ, published: '2022-05-06' },
  hosts: ['awis.amazonaws.com', 'awis.us-west-1.amazonaws.com', 'ats.amazonaws.com'],
  requirePath: false,
  endpoints: [{
    id: 'url_info', name: 'UrlInfo and TopSites', method: 'GET', oldPath: '/api', pathPattern: '^/(api)?/?$',
    oldPathStatus: 'host and path as commonly called; the article does not print them',
    mapping: {
      foxapis: { path: '/v1/brand/similarweb/domain', method: 'POST' },
      async: false,
      body: [{ to: 'domain', inputs: ['domain'], required: true, todo: 'the site domain you looked up (the old call carried it in the Url parameter)' }],
      paramNotes: [
        { old: 'Url, Action, ResponseGroup', new: 'domain', note: 'the domain is passed on; Action and ResponseGroup have no counterpart' },
        { old: 'signature and access key parameters', new: '(dropped)', note: 'replaced by your FoxAPIs key in FOXAPIS_KEY' },
      ],
      result: {
        kind: 'raw',
        rawNote: 'PARTIAL. The FoxAPIs answer is SimilarWeb domain traffic and ranking data. It is a different ranking, not the old Alexa rank, and is returned unchanged; no field table is claimed.',
        fieldMap: [],
      },
    },
  }],
});

add({
  id: 'fullcontact-v2-company',
  name: 'FullContact v2 Company API',
  status: 'ended',
  date: '2022-06-30',
  summary: "FullContact's migration page says that on 30 June 2022 it would sunset its legacy v2 Company API. The v2 Person API is not covered: the page gives no sunset date for it.",
  source: { url: 'https://docs.fullcontact.com/docs/v2-company-domain-lookup-migration', read_on: READ },
  hosts: ['api.fullcontact.com'],
  requirePath: true,
  authHeaders: ['X-FullContact-APIKey'],
  endpoints: [{
    id: 'company_lookup', name: 'Company lookup by domain', method: 'GET', oldPath: '/v2/company/lookup', pathPattern: '^/v2/company/lookup(\\.json)?/?$',
    oldParams: ['domain'],
    mapping: {
      foxapis: { path: '/v1/get_company_snapshot', method: 'POST' },
      async: true,
      body: [{ to: 'domain', inputs: ['domain'], fromOld: ['domain'], required: true, todo: 'company website domain' }],
      paramNotes: [{ old: 'domain', new: 'domain', note: 'copied' }],
      result: {
        kind: 'raw',
        rawNote: 'PARTIAL. get_company_snapshot answers with a written company snapshot (async: 202, then poll), not FullContact company fields. It is returned unchanged and no field table is claimed.',
        fieldMap: [],
      },
    },
  }],
});

add({
  id: 'linkedin-open-apis',
  name: 'LinkedIn open APIs (v1 people and companies)',
  status: 'moved',
  date: null,
  effective: '2015-05-12',
  summary: 'Computerworld (12 February 2015) reports that from 12 May 2015 LinkedIn offered only a handful of APIs for general use, and that only companies in its partner program would have API access. This is an access restriction, not a shutdown, so it is shown as moved.',
  source: { url: 'https://www.computerworld.com/article/1637984/linkedin-restricts-api-usage.html', read_on: READ, published: '2015-02-12' },
  hosts: ['api.linkedin.com'],
  requirePath: true,
  endpoints: [{
    id: 'people_v1', name: 'v1 people, companies and search', method: 'GET', oldPath: '/v1/people/~', pathPattern: '^/v1/(people|companies|company-search|people-search|jobs|job-search)',
    oldPathStatus: 'paths as commonly called; the article names the program change, not the paths',
    mapping: {
      foxapis: { path: '/v1/enrich_person', method: 'POST' },
      async: false,
      body: [
        { to: 'name', inputs: ['name'], required: true, todo: 'full name of the person (the old call used a member id or the signed-in member)' },
        { to: 'company', inputs: ['company'], todo: 'current employer, narrows the match (optional)' },
        { to: 'domain', inputs: ['domain'], todo: 'employer website domain, narrows the match (optional)' },
      ],
      paramNotes: [{ old: 'member id in the path, fields selector, OAuth token', new: '(dropped)', note: 'NOT a drop-in: FoxAPIs looks a person up by name, so you must supply one' }],
      result: {
        kind: 'raw',
        rawNote: 'The old response layout was not checked, so the FoxAPIs answer is returned unchanged and no field table is claimed.',
        fieldMap: [],
      },
    },
  }],
});

add({
  id: 'pinterest-v3-v4',
  name: 'Pinterest API v3 and v4',
  status: 'moved',
  date: null,
  effective: '2023-07',
  summary: "Pinterest's developer community post (1 February 2023) says v3 and v4 endpoints would no longer be supported beginning July 2023 and that support moves to v5. It says unsupported, not switched off, so this is shown as moved.",
  source: { url: 'https://community.pinterest.biz/t/pinterest-api-migration-required-by-june-2023/1374', read_on: READ, published: '2023-02-01' },
  hosts: ['api.pinterest.com'],
  requirePath: true,
  endpoints: [{
    id: 'v3_v4', name: 'v3 and v4 endpoints', method: 'GET', oldPath: '/v3/pins/', pathPattern: '^/v[34](/.*)?$',
    ...noMap('FoxAPIs reads a single Pinterest pin by its address (POST /v1/visual/pinterest/pin). That is not the same call as the old listing calls, so nothing is mapped.'),
  }],
});

const have = new Set(reg.apis.map((a) => a.id));
for (const e of E) if (have.has(e.id)) throw new Error('already added: ' + e.id);

let text = readFileSync(file, 'utf8');
const tail = '\n  ]\n}\n';
if (!text.endsWith(tail)) throw new Error('unexpected file end');
const body = E.map((e) => JSON.stringify(e, null, 2).split('\n').map((l) => '    ' + l).join('\n')).join(',\n');
text = text.slice(0, -tail.length) + ',\n' + body + tail;
writeFileSync(file, text);

// fixtures: one per new entry
const dir = join(root, 'fixtures', 'dead');
mkdirSync(dir, { recursive: true });
const URLS = {
  'google-custom-search': 'https://www.googleapis.com/customsearch/v1?q=x&cx=y',
  'google-plus-api': 'https://www.googleapis.com/plus/v1/people/me',
  'x-v11-search': 'https://api.twitter.com/1.1/search/tweets.json?q=x',
  'x-v11-statuses-filter': 'https://stream.twitter.com/1.1/statuses/filter.json',
  'x-v11-legacy-dm': 'https://api.twitter.com/1.1/direct_messages.json',
  'x-v11-help-configuration': 'https://api.twitter.com/1.1/help/configuration.json',
  'instagram-legacy-api': 'https://api.instagram.com/v1/users/self/media/recent',
  'crunchbase-v3': 'https://api.crunchbase.com/v3.1/organizations/stripe',
  'yahoo-boss': 'https://yboss.yahooapis.com/ysearch/web?q=x',
  'alexa-awis': 'https://awis.us-west-1.amazonaws.com/api?Action=UrlInfo',
  'fullcontact-v2-company': 'https://api.fullcontact.com/v2/company/lookup.json?domain=stripe.com',
  'linkedin-open-apis': 'https://api.linkedin.com/v1/people/~',
  'pinterest-v3-v4': 'https://api.pinterest.com/v3/pins/123',
};
const LIVE = {
  'google-custom-search': 'https://www.googleapis.com/drive/v3/files',
  'google-plus-api': 'https://www.googleapis.com/calendar/v3/calendars',
  'x-v11-search': 'https://api.twitter.com/2/tweets/search/recent?query=x',
  'x-v11-statuses-filter': 'https://api.twitter.com/2/tweets/search/stream',
  'x-v11-legacy-dm': 'https://api.twitter.com/1.1/direct_messages/events/list.json',
  'x-v11-help-configuration': 'https://api.twitter.com/2/users/me',
  'instagram-legacy-api': 'https://graph.facebook.com/v19.0/me',
  'crunchbase-v3': 'https://api.crunchbase.com/api/v4/entities/organizations/stripe',
  'yahoo-boss': 'https://query1.finance.yahoo.com/v7/finance/quote',
  'alexa-awis': 'https://s3.amazonaws.com/bucket/key',
  'fullcontact-v2-company': 'https://api.fullcontact.com/v3/company.enrich',
  'linkedin-open-apis': 'https://api.linkedin.com/v2/userinfo',
  'pinterest-v3-v4': 'https://api.pinterest.com/v5/pins/123',
};
for (const e of E) {
  const ep = e.endpoints[0];
  const fx = {
    id: e.id,
    status: e.status,
    endpointId: ep.id,
    mapped: Boolean(ep.mapping),
    foxapis: ep.mapping ? ep.mapping.foxapis : null,
    sourceUrl: e.source.url,
    deadUrl: URLS[e.id],
    liveUrlNotFlagged: LIVE[e.id],
    note: 'deadUrl must be detected as this entry; liveUrlNotFlagged is a live call on the same host that must not be flagged.',
  };
  writeFileSync(join(dir, e.id + '.json'), JSON.stringify(fx, null, 2) + '\n');
}
console.log('added', E.length);
