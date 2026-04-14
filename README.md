# AI6001_Enter the Oven

Project Group Members:

* Arnoldo de Jesus Gonzalez Solis (202488335, adjgonzalez@mun.ca)
* Jose Shimabukuro (202583220, jkshimabukur@mun.ca)

Project URL

* Paste your hosted web application URL here so I can test it

Project Videos:

* Project Presentation: YouTube URL

Project Setup / Installation:

* Your project setup and installation instructions go here
* Feel free to include screenshots if you want

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

Open the app at `http://localhost:5000`.

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

- For production, set `CORS_ORIGIN` in `.env` to your deployed URL.
- Keep `JWT_SECRET` private and long/random.
- If your host platform provides managed MongoDB, you can remove the `mongo` service and set `MONGODB_URI` to your managed connection string.
