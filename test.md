[![Build Status](https://travis-ci.org/dncrews/simple-dash.js.png)](https://travis-ci.org/dncrews/simple-dash.js)


# Application Status Dashboard

## What IS the Status Dashboard?

There are 5 major parts of the status dashboard:
1. Current Status
2. Status History
3. Client-side Metrics
4. Change Log

### Current Status
This is the main page with the green/red/yellow buttons. It in turn has 3 portions:
1. __Upstream Data__. These are [fetched from Heroku](https://status.heroku.com/) and pushed from Splunk to attempt to determine the status of current upstreams. These are currently very manual and to add one here will probably require Dan Crews at this point (a feature request in JIRA).
2. __Application Data__. These are pushed from Splunk every 5 minutes. These are currently Heroku-only applications, but we can get others added to the backlog via feature requests in JIRA.
3. __Services (API) Data__. These are pushed from Splunk every 5 minutes. These are currently ONLY services used by Frontier applications and ONLY on the server side. Client-side calls are on our backlog, and we are open to more features (JIRA feature requests).

### Status History
If you click on any of the current status buttons, you should be taken to the 2-day history of the application's uptime-status.
- For applications, this includes:
  1. 2-days worth of throughput, response times, memory usage, error rates, status codes, and Heroku error codes. (hover / click on the colored squares).
  2. 2-day graphs of throughput, response times, error rates, and memory usage
  3. Current status buttons for the list of APIs used server-side in that application (via req.superagent).
  4. A 2-day history of events (see Change Log)
- For Upstreams and Services, this includes some (depending on the service / upstream) combination of the app's features.

### Client-Side Metrics (Applications Only)
From the application Status History pages, you can click on the "Performance" tab to view the client-side performance for each application. This is splunk-driven at a 4-hour interval.
- This includes:
  - a list of "page ready" on a page-by-page basis
  - a 4-hr roll-up of all requests
  - a 7-day history of the full "page-ready" calls for the application.

### Change Log
If you click on "Changes" at the top of the page, you will get a (currently very slow-to-load, sorry about that) 7-day list of all changes in all apps, as well as many Github changes for non-applications. This is filterable by Github Repo Name, Type (Github, Electric Commander, Jenkins, Marrow (immune system)) and Time Frame. Any Github repository can add themselves to this list.


## FAQs

### How are applications listed?

#### Quick Answer
These data are all push data sent via our Splunk Queries. The only exception is Heroku status, which we derive directly from their status dashboard's API.

#### Nitty-Gritty Answer
See [Nitty-Gritty](#nitty-gritty)

### Why is my Heroku app not listed here?

If you are a Frontier app, and you are not listed in the status dashboard, verify the following:
1. You are serving your data from app-name-prod in Heroku (preferably fs-repo-name-prod).
2. You have the following drain added to your Heroku Drains: `syslog://ec2-23-23-221-91.compute-1.amazonaws.com:10514`
  - This should be automated for everyone in Frontier, but if you're on an old version:
    1. Please upgrade to the current frontier-build-tools
    2. Do this manually:
      - Check to see if you have it already:
        - $ `heroku drains -a app-name-prod`
        - If you do not see the aforementioned drain, add it: `heroku drains:add syslog://ec2-23-23-221-91.compute-1.amazonaws.com:10514`
3. You have your application's drain and name listed in the [Lookup Table](https://github.com/fs-eng/splunk-alert-scripts/blob/master/apps/fs-frontier/lookups/heroku-host-github.csv)

### Why isn't my service listed in the Services?
Currently we are limited in the metrics that are driving this feature. We have server-side timing on all requests made using the `req.superagent` library we've added into the Frontier stack, and only calls made using this feature are measured in this data. We want to add more (including client-side), but we simply need a high-priorty to do so.

### Why isn't my Github repository listed in the Changes?
You will simply want to add our Github Webhook to your repository: `https://familysearch.org/status/change`. Every commit against the master branch after that should be added.


## Nitty-Gritty

There are multiple Splunk searches that define an __application__ status page:

2 searches for Application Status:

`status.dashboard.frontier.mem_response`, which uses two sets of logs from Heroku apps:

* Metric Logs - These are a feature that we opt into with Heroku (metric-logging):
> ```
> Jun  9 23:03:34 d.2b8a192d-93b7-402c-b5d4-adf72d8730aa heroku[web.1] - source=web.1 dyno=heroku.2432613.ec7b2f65-1ddc-4f82-9004-10e0c5d06d04 sample#memory_total=147.26MB sample#memory_rss=143.82MB sample#memory_cache=0.00MB sample#memory_swap=3.44MB sample#memory_pgpgin=916717pages sample#memory_pgpgout=879900pages
> ```
* Request Logs - These are logs of all requests made into the Heroku applications:
> ```
> Jun  9 23:27:08 d.12809f67-9b14-4d3d-8d36-b6c9f740a2bf heroku[router] - at=info method=GET path=/getCaptcha host=fs-registration-prod.herokuapp.com request_id=829c2daf-37af-4767-ad4b-14478f13f3e1 fwd="64.134.159.117, 204.9.225.7" dyno=web.1 connect=8ms service=123ms status=200 bytes=733
> Jun  9 23:27:08 d.d4e94b1e-271c-4c9b-b5cc-d1db676c3679 heroku[router] - at=info method=GET path=/familysearch/login?fhf=true host=fs-auth-prod.herokuapp.com request_id=e2dc20c2-b001-4b87-80d5-1e88eed5cd79 fwd="99.128.246.75, 204.9.225.7" dyno=web.2 connect=1ms service=1072ms status=302 bytes=916
> ```

Some points of interest in these logs:
* Date:
  - Example: `Jun  9 23:03:34`
  - This is obviously used only as a date
* Heroku Drain ID:
  - Example: `d.2b8a192d-93b7-402c-b5d4-adf72d8730aa`
  - This is paired up with the Heroku app-name via our [Lookup Table](https://github.com/fs-eng/splunk-alert-scripts/blob/master/apps/fs-frontier/lookups/heroku-host-github.csv)
  - The app-name in the table is then assigned to the `fs_host` key in Splunk when we make searches.
* The entity making the log:
  - Examples:
    - `heroku[web.1]` - A Heroku Dyno. The number after "web." will change based upon which dyno is making the request. i.e. an application with 7 dynos will log `web.1` through `web.7`.
    - `heroku[router]` - The Heroku router
* Samples:
  - Example: `sample#memory_total=147.26MB`
  - These are used to calculate the memory usage for each application. "min", "max", and "avg" are set with values from all dynos.
  - `memory_total` is the only data currently used from these logs.
  - Minimal Log:
    - Requries an fs_host of < something >-prod - For Heroku, this is created via the [Lookup Table](https://github.com/fs-eng/splunk-alert-scripts/blob/master/apps/fs-frontier/lookups/heroku-host-github.csv)
    - Requires a single memory_total in MB.
    - Example:  `fs_host=appName-prod sample#memory_total=1234MB`
* Response Data:
  - Example: `connect=8ms service=123ms status=200 bytes=733`
  - With these data, we calculate the total number of 2xx/3xx/4xx/5xx Status codes as well as server-level response times.
  - `status` and `service` are the only data currently used from these logs.
  - Minimal Log:
    - Requries an fs_host of < something >-prod - For Heroku, this is created via the [Lookup Table](https://github.com/fs-eng/splunk-alert-scripts/blob/master/apps/fs-frontier/lookups/heroku-host-github.csv)
    - Requires a `service` time in ms
    - Requires a `status` code
    - Example: `fs_host=appName-prod service=530ms status=418`





## Contributors
Ordered by date of first contribution. [Auto-generated](https://github.com/dtrejo/node-authors) on Fri, 03 Jan 2014 23:42:08 GMT.

- [Jamis Charles](https://github.com/jamischarles) aka `jamischarles`
- [Dan Crews](https://github.com/dncrews) aka `dncrews`
- [Nic Johnson](https://github.com/nicjohnson) aka `nicjohnson`
- [Aaron King](https://github.com/waaronking) aka `waaronking`
