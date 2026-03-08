# WEB103 Project 1 - Village of Palm Springs Florida Community Events

Submitted by: Roel Crodua

About this web app: 

Develop a full-stack web application that presents compelling data in a list format, implementing both a complete backend server to deliver static HTML content and a streamlined frontend interface to display the information.

👋 Important: For this project, avoid using frontend frameworks such as React, Vue, or Angular. Instead, build your solution using plain HTML, CSS, and JavaScript (vanilla JS), and utilize Picocss for styling your application.

Time spent: 8 hours

## Required Features

### PART 1

The following **required** functionality is completed:

<!-- Make sure to check off completed functionality below -->
- [x] **The web app uses only HTML, CSS, and JavaScript without a frontend framework**
- [x] **The web app displays a title**
- [x] **The web app displays at least five unique list items, each with at least three displayed attributes (such as title, text, and image)**
- [x] **The user can click on each item in the list to see a detailed view of it, including all database fields**
  - [x] **Each detail view should be a unique endpoint, such as as `localhost:3000/bosses/crystalguardian` and `localhost:3000/mantislords`**
  - [x] *Note: When showing this feature in the video walkthrough, please show the unique URL for each detailed view. We will not be able to give points if we cannot see the implementation* 
- [x] **The web app serves an appropriate 404 page when no matching route is defined**
- [x] **The web app is styled using Picocss**

### PART 2

<!-- Make sure to check off completed functionality below -->
- [x] **The web app uses only HTML, CSS, and JavaScript without a frontend framework**
- [x] **The web app is connected to a PostgreSQL database, with an appropriately structured database table for the list items**
  - [x] **NOTE: Your walkthrough added to the README must include a view of your Render dashboard demonstrating that your Postgres database is available**
  - [x]  **NOTE: Your walkthrough added to the README must include a demonstration of your table contents. Use the psql command 'SELECT * FROM tablename;' to display your table contents.**


The following **optional** features are implemented:

- [x] The web app displays items in a unique format, such as cards rather than lists or animated list items

- [X] The user can search for items by a specific attribute

The following **additional** features are implemented:

- [X] Sort the list from the most recent data/events as default display.

## Video Walkthrough


Here's a walkthrough of implemented required features:

### PART 1

<img src='https://github.com/roeldcrodua/CommunityEvents/blob/main/assets/demo.gif' title='Video Walkthrough' width='' alt='Video Walkthrough' />


### PART 2

<img src='https://github.com/roeldcrodua/CommunityEvents/blob/main/assets/demo1.gif' title='Video Walkthrough' width='' alt='Video Walkthrough' />

#### PostgreSQL Evidence (PART 2)

- The PART 2 walkthrough includes a Render dashboard view showing the PostgreSQL instance is available.
- The PART 2 walkthrough includes a `psql` table content demonstration using:

```sql
SELECT * FROM events;
```
<img src='https://github.com/roeldcrodua/CommunityEvents/blob/main/assets/demo2.gif' title='Video Walkthrough' width='' alt='Video Walkthrough' />

<!-- Replace this with whatever GIF tool you used! -->
GIF created with Wondershare Uniconverter 17 Tool - GIF Maker
<!-- Recommended tools:
[Kap](https://getkap.co/) for macOS
[ScreenToGif](https://www.screentogif.com/) for Windows
[peek](https://github.com/phw/peek) for Linux. -->

## Notes

Describe any challenges encountered while building the app or any additional context you'd like to add.

## Render Deployment

This repo includes a Render Blueprint file at `render.yaml` for:

- `communityevents-web` (Node web service)
- `communityevents-scraper` (optional cron job running `npm run scrape` every 6 hours)

### Option A: Deploy with `render.yaml` (recommended)

1. Push this project to GitHub.
1. In Render, click **New +** → **Blueprint**.
1. Select your repo and keep `render.yaml`.
1. In Render environment variables, set `PGHOST`, `PGPORT` (default `5432`), `PGDATABASE`, `PGUSER`, and `PGPASSWORD`.
1. Deploy.

### Option B: Manual Web Service only

If you only want the web app without scheduled scraping:

- Runtime: Node
- Build Command: `npm install`
- Start Command: `npm start`
- Add the same PostgreSQL environment variables above.

After deploy, open your Render service URL to verify the app is live.

## Docker Deployment (Split Images)

This project includes two Dockerfiles so the web app image can stay lean while the scraper image includes Puppeteer.

### 1) Web App Image (No Puppeteer Runtime Needed)

Build:

```bash
docker build -f Dockerfile.web -t communityevents-web:latest .
```

Run:

```bash
docker run --rm -p 3000:3000 \
  -e PGHOST="<your-pg-host>" \
  -e PGPORT="5432" \
  -e PGDATABASE="communityevents" \
  -e PGUSER="<your-pg-user>" \
  -e PGPASSWORD="<your-pg-password>" \
  communityevents-web:latest
```

### 2) Scraper Image (Includes Puppeteer)

Build:

```bash
docker build -f Dockerfile.scraper -t communityevents-scraper:latest .
```

Run manually:

```bash
docker run --rm \
  -e PGHOST="<your-pg-host>" \
  -e PGPORT="5432" \
  -e PGDATABASE="communityevents" \
  -e PGUSER="<your-pg-user>" \
  -e PGPASSWORD="<your-pg-password>" \
  -e PUPPETEER_DISABLE_SANDBOX="true" \
  communityevents-scraper:latest
```

Deploy recommendation:

- Deploy `communityevents-web` as the always-on web service.
- Run `communityevents-scraper` as a scheduled/cron job.

### 3) Docker Compose (Web + On-Demand Scraper)

With environment variables set (`PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`):

Start web app:

```bash
docker compose up --build -d web
```

Run scraper on demand:

```bash
docker compose --profile scrape run --rm scraper
```

Stop web app:

```bash
docker compose down
```

### 4) Production Compose Override

Use the production override for stricter runtime defaults (for example, `restart: always` and healthcheck):

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d web
```

Run scraper on demand with the same production merge:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile scrape run --rm scraper
```

### 5) One-Command Workflow (PowerShell)

Use the helper script:

```powershell
./scripts/compose.ps1 up
./scripts/compose.ps1 status
./scripts/compose.ps1 scrape
./scripts/compose.ps1 logs
./scripts/compose.ps1 down
```

Or use npm shortcuts:

```bash
npm run compose:up
npm run compose:status
npm run compose:scrape
npm run compose:logs
npm run compose:down
```

## License

Copyright 2026 Roel Crodua

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

> http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.