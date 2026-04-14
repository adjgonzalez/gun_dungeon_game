import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';

// Load environment variables
dotenv.config();

const app = express();

if (!process.env.JWT_SECRET) {
  console.warn('JWT_SECRET is not set. Authentication token generation will fail.');
}

if (!process.env.MONGODB_URI) {
  console.warn('MONGODB_URI is not set. MongoDB will default to localhost, which may fail in deployment.');
}

const configuredOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

// Middleware
app.use(cors({
  origin(origin, callback) {
    // Allow non-browser clients and same-origin requests without an Origin header.
    if (!origin) {
      return callback(null, true);
    }

    if (configuredOrigins.length === 0 || configuredOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('CORS origin not allowed'));
  }
}));
app.use(express.json());
app.use(express.static('../Gun Dungeon Game'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gun_dungeon_game')
  .then(() => console.log('✓ MongoDB Connected'))
  .catch(err => console.log('✗ MongoDB Connection Error:', err));

// Routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
