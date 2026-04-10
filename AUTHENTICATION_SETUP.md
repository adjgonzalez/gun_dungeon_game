# Gun Dungeon Game - Authentication Setup Guide

This guide will help you set up the authentication system with MongoDB for the Gun Dungeon Game.

## Prerequisites

- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **MongoDB** - Choose one:
  - **Local MongoDB**: [Download Community Edition](https://www.mongodb.com/try/download/community)
  - **MongoDB Atlas** (Cloud): [Free tier available](https://www.mongodb.com/cloud/atlas)

## Project Structure

```
gun_dungeon_game/
├── Gun Dungeon Game/          # Frontend (game client)
│   ├── index.html
│   ├── style.css
│   └── js/
│       ├── auth.js            # Authentication client (NEW)
│       ├── main.js            # Updated with auth integration
│       └── [other game files]
├── backend/                   # Backend server (NEW)
│   ├── server.js              # Express server
│   ├── package.json           # Dependencies
│   ├── .env.example           # Environment variables template
│   ├── models/
│   │   └── User.js            # MongoDB user schema
│   └── routes/
│       └── auth.js            # Authentication endpoints
└── README.md
```

## Setup Instructions

### Step 1: Install Node.js Dependencies

Navigate to the backend folder and install dependencies:

```bash
cd backend
npm install
```

### Step 2: Configure Environment Variables

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Edit `.env` and update the values:
```
MONGODB_URI=mongodb://localhost:27017/gun_dungeon_game
JWT_SECRET=your_secret_key_change_this_in_production
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5000
```

**Important Security Notes:**
- **Local MongoDB**: Make sure MongoDB service is running (see instructions below)
- **MongoDB Atlas**: Replace `MONGODB_URI` with your Atlas connection string
- **JWT_SECRET**: Use a strong random string in production
- **CORS_ORIGIN**: Update if hosting on a different domain

### Step 3: Set Up MongoDB

#### Option A: Local MongoDB (Windows)

1. Download and install [MongoDB Community Edition](https://www.mongodb.com/try/download/community)
2. During installation, check "Install MongoDB as a Service"
3. Start MongoDB:
   ```bash
   # Windows Command Prompt (Admin)
   net start MongoDB
   ```
4. Verify it's running on `mongodb://localhost:27017`

#### Option B: MongoDB Atlas (Cloud - Recommended)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account (M0 free tier)
3. Create a cluster and database user
4. Get your connection string (should look like):
   ```
   mongodb+srv://username:password@cluster.mongodb.net/gun_dungeon_game?retryWrites=true&w=majority
   ```
5. Update `MONGODB_URI` in `.env` with your connection string

### Step 4: Start the Backend Server

From the backend folder:

```bash
npm start
```

Or use nodemon for auto-reload during development:
```bash
npm run dev
```

You should see:
```
✓ MongoDB Connected
Server running on http://localhost:5000
```

### Step 5: Run the Frontend Game

1. Install a local web server (if you don't have one):
   - **Node.js http-server**:
     ```bash
     npm install -g http-server
     cd "Gun Dungeon Game"
     http-server
     ```
   - **Python**:
     ```bash
     cd "Gun Dungeon Game"
     python -m http.server 8000
     ```
   - **VS Code Live Server**: Install extension and right-click index.html → "Open with Live Server"

2. Open your browser and navigate to:
   - `http://localhost:5000` (if using Express static serving)
   - `http://localhost:8000` (if using another server)
   - `http://127.0.0.1:5500` (if using VS Code Live Server)

## API Endpoints

All endpoints use JSON and include CORS headers.

### Authentication Endpoints

#### Register
```
POST /api/auth/register
Content-Type: application/json

{
  "username": "player123",
  "email": "player@example.com",
  "password": "your_password",
  "passwordConfirm": "your_password"
}

Response (201):
{
  "success": true,
  "token": "eyJhbGc...",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "player123",
    "email": "player@example.com",
    "score": 0,
    "level": 1
  }
}
```

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "player@example.com",
  "password": "your_password"
}

Response (200): Same as register response
```

#### Get Current User
```
GET /api/auth/me
Authorization: Bearer <token>

Response (200):
{
  "success": true,
  "user": { ... }
}
```

#### Update Progress
```
PUT /api/auth/update-progress
Authorization: Bearer <token>
Content-Type: application/json

{
  "score": 1500,
  "level": 5
}

Response (200):
{
  "success": true,
  "user": { ... }
}
```

## Frontend Authentication System

The frontend (`js/auth.js`) handles:
- **Login/Register screens** - Initial authentication
- **Token storage** - Stores JWT in localStorage
- **Protected game** - Prevents game start without login
- **Progress sync** - Saves score and level to MongoDB
- **Logout** - Clears local data and returns to login

### Key Functions

```javascript
// Available to use in game code:
authToken           // JWT token (string)
currentUser         // User object { id, username, email, score, level }

// Functions:
updateUserProgress(score, level)  // Save game progress
showLoginScreen()                 // Show login screen
showRegisterScreen()              // Show register screen
showStartScreen()                 // Show start menu
handleLogout()                    // Handle logout
```

## Troubleshooting

### "Failed to fetch" or CORS errors
- Ensure backend server is running on `http://localhost:5000`
- Check `CORS_ORIGIN` in `.env` matches your frontend URL
- Try hard-refresh (Ctrl+Shift+R)

### "MongoDB Connection Error"
- **Local MongoDB**: Check if MongoDB service is running
- **Atlas**: Verify connection string and IP whitelist (Allow All)
- Check `.env` `MONGODB_URI` is correct

### "Invalid token" errors
- Clear localStorage: Open DevTools → Storage → localStorage → Delete all
- Log in again to get a fresh token

### Server crashes with "Port already in use"
- Change `PORT` in `.env` (e.g., 5001)
- Or kill existing process on port 5000

## Development Tips

### Testing Authentication

Use a tool like [Postman](https://www.postman.com/) or `curl` to test endpoints:

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"123456","passwordConfirm":"123456"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}'
```

### Monitor Database

Use MongoDB Compass to browse collections and documents:
- [Download MongoDB Compass](https://www.mongodb.com/products/compass)
- Connect to `mongodb://localhost:27017`
- Browse `gun_dungeon_game` database → `users` collection

### Debug Network Requests

1. Open DevTools (F12)
2. Go to **Network** tab
3. Play the game and filter for XHR requests
4. Check request/response bodies and status codes

## Security Checklist (Production)

- [ ] Change `JWT_SECRET` to a strong random string
- [ ] Use HTTPS (not HTTP) in production
- [ ] Enable MongoDB Atlas IP Whitelist (Allow production IPs only)
- [ ] Implement rate limiting on authentication endpoints
- [ ] Add password strength validation
- [ ] Store JWT in HTTP-only cookies (not localStorage)
- [ ] Implement refresh token rotation
- [ ] Add email verification

## Next Steps

1. **Leaderboard**: Create `/api/leaderboard` endpoint to show top scores
2. **Game Stats**: Store additional stats (kills, playtime, achievements)
3. **Multiplayer**: Add real-time features with Socket.io
4. **Mobile App**: Build React Native version with same backend
5. **Analytics**: Track player behavior and game metrics

## Support & Resources

- **Express.js**: https://expressjs.com/
- **Mongoose**: https://mongoosejs.com/
- **MongoDB**: https://docs.mongodb.com/
- **JWT**: https://jwt.io/
- **bcryptjs**: https://www.npmjs.com/package/bcryptjs

---

**Questions?** Check the `.env.example` file for all available configuration options.
