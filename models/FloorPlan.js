import mongoose from 'mongoose';

const SeatSchema = new mongoose.Schema({
  seatId: { type: String, required: true }, // e.g., "D-101"
  coordinates: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 }
  },
  // Removed 'isOccupied' boolean in favor of a booking schedule
  bookings: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    timestamp: { type: Date, default: Date.now } 
  }]
});

const MeetingRoomSchema = new mongoose.Schema({
  roomId: { type: String, required: true },
  name: { type: String, required: true },
  capacity: { type: Number, required: true },
  // NEW: Coordinates for proximity checks
  coordinates: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 }
  },
  bookings: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    timestamp: { type: Date, default: Date.now } 
  }]
});

const FloorPlanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  floorNumber: { type: Number, required: true },
  version: { type: Number, default: 1.0 },
  seats: [SeatSchema],
  meetingRooms: [MeetingRoomSchema],
  lastUpdated: { type: Date, default: Date.now }
});

export default mongoose.models.FloorPlan || mongoose.model('FloorPlan', FloorPlanSchema);