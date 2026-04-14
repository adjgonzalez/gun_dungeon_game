import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please provide a username'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  score: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 1
  },
  coins: { type: Number, default: 0 },
  upgrades: {
    hp:         { type: Number, default: 0 },
    speed:      { type: Number, default: 0 },
    dodge:      { type: Number, default: 0 },
    luck:       { type: Number, default: 0 },
    shieldCd:   { type: Number, default: 0 },
    shieldHp:   { type: Number, default: 0 },
    critChance: { type: Number, default: 0 },
    critDamage: { type: Number, default: 0 },
    xpGain:     { type: Number, default: 0 },
    wpnHandgun: { type: Number, default: 0 },
    wpnShotgun: { type: Number, default: 0 },
    wpnRocket:  { type: Number, default: 0 },
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare passwords
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);
