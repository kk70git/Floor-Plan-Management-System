import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // NEW: Password field
  role: { 
    type: String, 
    enum: ['admin', 'user', 'superadmin'], 
    default: 'user' 
  },
  bookingHistory: [{
    roomId: { type: String },
    count: { type: Number, default: 1 },
    lastBooked: { type: Date, default: Date.now }
  }]
});

export default mongoose.models.User || mongoose.model('User', UserSchema);