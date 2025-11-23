import mongoose from 'mongoose';

const SystemLogSchema = new mongoose.Schema({
  path: { type: String, required: true },      // e.g., /api/booking/book
  method: { type: String, required: true },    // GET, POST
  status: { type: Number, required: true },    // 200, 400, 500
  duration: { type: Number, required: true },  // Execution time in ms
  timestamp: { type: Date, default: Date.now }
});

// Use a TTL (Time To Live) index to auto-delete logs older than 7 days to save space
// (Optional "Plus Point" for space complexity optimization)
SystemLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 604800 });

export default mongoose.models.SystemLog || mongoose.model('SystemLog', SystemLogSchema);