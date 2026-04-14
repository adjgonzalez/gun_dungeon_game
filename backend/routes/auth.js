import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Helper function to create JWT token
const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('Server misconfigured: JWT_SECRET is missing');
  }

  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};

const ensureDatabaseConnected = () => {
  if (mongoose.connection.readyState !== 1) {
    throw new Error('Database is not connected');
  }
};

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    ensureDatabaseConnected();
    const { username, email, password, passwordConfirm } = req.body;

    // Validation
    if (!username || !email || !password || !passwordConfirm) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    if (password !== passwordConfirm) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    // Check if user already exists
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({ message: 'Email or username already in use' });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password
    });

    // Create token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        score: user.score,
        level: user.level,
        coins: user.coins,
        upgrades: user.upgrades
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: error.message || 'Error registering user'
    });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    ensureDatabaseConnected();
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Create token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        score: user.score,
        level: user.level,
        coins: user.coins,
        upgrades: user.upgrades
      }
    });
  } catch (error) {
    res.status(500).json({
      message: error.message || 'Error logging in'
    });
  }
});

// Get current user (protected route)
router.get('/me', async (req, res) => {
  try {
    ensureDatabaseConnected();
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        score: user.score,
        level: user.level,
        coins: user.coins,
        upgrades: user.upgrades
      }
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
});

// Update user score and level
router.put('/update-progress', async (req, res) => {
  try {
    ensureDatabaseConnected();
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { score, level } = req.body;

    const user = await User.findByIdAndUpdate(
      decoded.id,
      { score, level },
      { new: true }
    );

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        score: user.score,
        level: user.level,
        coins: user.coins,
        upgrades: user.upgrades
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error updating progress' });
  }
});

// GET /upgrades — load player's coins and upgrades
router.get('/upgrades', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    res.status(200).json({ success: true, coins: user.coins, upgrades: user.upgrades });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error fetching upgrades' });
  }
});

// PUT /upgrades — save player's coins and upgrades
router.put('/upgrades', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { coins, upgrades } = req.body;
    const user = await User.findByIdAndUpdate(
      decoded.id,
      { coins, upgrades },
      { new: true }
    );
    res.status(200).json({ success: true, coins: user.coins, upgrades: user.upgrades });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Error saving upgrades' });
  }
});

export default router;
