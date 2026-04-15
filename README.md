# AI6001_Enter the Oven

Project Group Members:

* Arnoldo de Jesus Gonzalez Solis (202488335, adjgonzalez@mun.ca)
* Jose Shimabukuro (202583220, jkshimabukur@mun.ca)

Project URL

* https://groupd.stu.researchatmun.ca

Project Videos:

* Project Presentation: YouTube URL

Project Setup / Installation:

## Setup and Installation

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 18+ | Run the backend server |
| npm | 9+ | Install backend dependencies |
| MongoDB | 6+ | Database (or use Docker to skip this) |
| Docker + Docker Compose | any recent | Easiest way to run everything together |

---

Docker (recommended)

No need to install MongoDB separately. One command starts both the server and the database.

**1. Clone the repository**
```bash
git clone https://github.com/adjgonzalez/gun_dungeon_game.git
cd gun_dungeon_game
```

**2. Set required environment variables**

The only variable you _must_ set before running is `JWT_SECRET`. The rest have working defaults.

```bash
# Windows (Command Prompt)
set JWT_SECRET=pick_any_long_random_string

# Windows (PowerShell)
$env:JWT_SECRET="pick_any_long_random_string"

# macOS / Linux
export JWT_SECRET=pick_any_long_random_string
```

Or create a `.env` file in the repo root:
```
JWT_SECRET=pick_any_long_random_string
CORS_ORIGIN=http://localhost:3000
```

**3. Build and start**
```bash
docker compose up --build
```

**4. Open the game**

Navigate to `http://localhost:3000` in your browser.

To stop:
```bash
docker compose down
```

To stop and delete the database volume:
```bash
docker compose down -v
```

---

## Docker Deployment (Recommended)

This project can run as deployable containers using Docker Compose:

- `app` container: Node.js backend + static frontend hosting
- `mongo` container: MongoDB database with persistent volume

### 1. Prerequisites

- Install Docker Desktop
- Ensure Docker is running

### 2. Configure environment variables

From the project root:

```powershell
Copy-Item .env.docker.example .env
```

Then edit `.env` and set a strong `JWT_SECRET`.

### 3. Build and run

```powershell
docker compose up --build -d
```

Open the app at `http://localhost:3000`.

### 4. Useful commands

```powershell
# View logs
docker compose logs -f app

# Stop containers
docker compose down

# Stop containers and remove DB data volume
docker compose down -v
```

### 5. Deploy notes

- For production, set `CORS_ORIGIN` in `.env` to your deployed URL, for example `https://groupd.stu.researchatmun.ca`.
- If you also want local development on the same backend container, use a comma-separated list such as `http://localhost:3000,https://groupd.stu.researchatmun.ca`.
- If your deployment environment does not let you edit runtime env files, this project defaults `CORS_ORIGIN` to empty in Compose, which allows origins by default so authentication is not blocked by CORS.
- Keep `JWT_SECRET` private and long/random.
- If your host platform provides managed MongoDB, you can remove the `mongo` service and set `MONGODB_URI` to your managed connection string.
