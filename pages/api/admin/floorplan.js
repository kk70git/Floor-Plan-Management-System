import dbConnect from '../../../lib/db';
import FloorPlan from '../../../models/FloorPlan';
import User from '../../../models/User';
import Notification from '../../../models/Notification';
import withMonitor from '../../../utils/withMonitor';
import authMiddleware from '../../../utils/authMiddleware'; 
import { z } from 'zod'; // 1. Import Zod

// 2. Define Backend Schema
const floorPlanSchema = z.object({
    _id: z.string().optional(),
    name: z.string().min(1),
    // Rule: floorNumber >= 0
    floorNumber: z.coerce.number().min(0),
    version: z.number().optional(),
    seats: z.array(z.any()).optional(), // You can strict check seats if you want
    meetingRooms: z.array(z.object({
        // Rule: roomId > 0 (coerce ensures we treat strings like "101" as numbers)
        roomId: z.coerce.number().gt(0),
        name: z.string().min(1),
        capacity: z.coerce.number().min(1),
        coordinates: z.object({ x: z.number(), y: z.number() }).optional()
    })).optional()
});

async function handler(req, res) {
  await dbConnect();

  // --- GET: Fetch all plans ---
  if (req.method === 'GET') {
    try {
      const plans = await FloorPlan.find({}).sort({ floorNumber: 1 });
      return res.status(200).json({ success: true, data: plans });
    } catch (error) {
      return res.status(400).json({ success: false, error: error.message });
    }
  }

  // --- DELETE: Remove a floor plan ---
  if (req.method === 'DELETE') {
    // ... (Keep your existing DELETE logic exactly as is) ...
     try {
        const { id } = req.query; 
        const userRole = req.user.role;
        if (userRole !== 'admin' && userRole !== 'superadmin') {
            return res.status(403).json({ success: false, message: "Not authorized" });
        }
        const targetPlan = await FloorPlan.findById(id);
        if (!targetPlan) {
            return res.status(404).json({ success: false, message: "Floor plan not found" });
        }
        const now = new Date();
        let notifications = [];
        if (targetPlan.meetingRooms) {
            targetPlan.meetingRooms.forEach(room => {
                if (room.bookings) {
                    room.bookings.forEach(booking => {
                        if (new Date(booking.endTime) > now) {
                            notifications.push({
                                userId: booking.user,
                                message: `⚠️ Urgent: Your booking for Room ${room.name} (Floor ${targetPlan.floorNumber}) has been cancelled because the entire floor was removed.`,
                                reason: "Floor Plan Deleted by Admin",
                                timestamp: new Date()
                            });
                        }
                    });
                }
            });
        }
        if (targetPlan.seats) {
            targetPlan.seats.forEach(seat => {
                if (seat.bookings) {
                    seat.bookings.forEach(booking => {
                        if (new Date(booking.endTime) > now) {
                            notifications.push({
                                userId: booking.user,
                                message: `⚠️ Urgent: Your booking for Seat ${seat.seatId} (Floor ${targetPlan.floorNumber}) has been cancelled because the entire floor was removed.`,
                                reason: "Floor Plan Deleted by Admin",
                                timestamp: new Date()
                            });
                        }
                    });
                }
            });
        }
        let uniqueUserCount = 0;
        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
            const uniqueUsers = new Set(notifications.map(n => n.userId.toString()));
            uniqueUserCount = uniqueUsers.size;
        }
        await FloorPlan.findByIdAndDelete(id);
        return res.status(200).json({ 
            success: true, 
            message: notifications.length > 0 
                ? `Floor deleted. ${uniqueUserCount} users were notified of cancellations.` 
                : "Floor plan deleted successfully" 
        });
    } catch (error) {
        return res.status(400).json({ success: false, error: error.message });
    }
  }

  // --- POST: Create or Update ---
  if (req.method === 'POST') {
    try {
      // 3. Validate Body with Zod
      // Note: .partial() allows omitting some fields, but we check the core ones
      const validation = floorPlanSchema.safeParse(req.body);
      
      if (!validation.success) {
         return res.status(400).json({ 
            success: false, 
            message: `Validation Error: ${validation.error.issues[0].path.join('.')} ${validation.error.issues[0].message}`
         });
      }

      // Use valid data
      const { _id, name, floorNumber, meetingRooms, seats, version } = req.body;
      const userRole = req.user.role; 

      // Uniqueness Normalization
      const normalize = (str) => str.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      const incomingNormalizedName = normalize(name);

      // Fetch plans for uniqueness check
      const allPlans = await FloorPlan.find({}, 'name floorNumber _id');
      let errorMessages = [];

      for (const plan of allPlans) {
        if (_id && plan._id.toString() === _id) continue;

        if (normalize(plan.name) === incomingNormalizedName) {
            errorMessages.push(`Floor Name '${name}' is too similar to existing '${plan.name}'.`);
        }
        if (plan.floorNumber === Number(floorNumber)) {
             errorMessages.push(`Floor Number '${floorNumber}' is already taken.`);
        }
      }

      if (errorMessages.length > 0) {
        const uniqueErrors = [...new Set(errorMessages)];
        return res.status(400).json({ 
            success: false, 
            message: `Error: ${uniqueErrors.join(" ")}` 
        });
      }

      // Duplicate Room Name Check
      const seenNames = new Set();
      if (meetingRooms) {
        for (const room of meetingRooms) {
            const normalizedRoomName = normalize(room.name);
            if (seenNames.has(normalizedRoomName)) {
            return res.status(400).json({
                success: false,
                message: `Error: Duplicate Room Name '${room.name}' found on this floor.`
            });
            }
            seenNames.add(normalizedRoomName);
        }
      }

      // Duplicate Seat ID Check
      const seenSeatIds = new Set();
      if (seats && seats.length > 0) {
        for (const seat of seats) {
            const normalizedSeatId = normalize(seat.seatId);
            if (seenSeatIds.has(normalizedSeatId)) {
               return res.status(400).json({
                 success: false,
                 message: `Error: Duplicate Seat ID '${seat.seatId}' found on this floor.`
               });
            }
            seenSeatIds.add(normalizedSeatId);
        }
      }

      // Global Room ID Check
      if (meetingRooms) {
        for (const room of meetingRooms) {
            const existingRoom = await FloorPlan.findOne({
                "meetingRooms.roomId": room.roomId,
                _id: { $ne: _id } 
            });
            if (existingRoom) {
                return res.status(400).json({
                    success: false,
                    message: `Error: Room ID '${room.roomId}' is already used on floor '${existingRoom.name}'`
                });
            }
        }
      }

      let targetPlan;
      if (_id) {
        targetPlan = await FloorPlan.findById(_id);
      }

      if (targetPlan) {
        // ... (Update logic with notifications - same as before) ...
        const now = new Date();
        let notifications = [];

        const newRoomIds = new Set(meetingRooms.map(r => r.roomId));
        const deletedRooms = targetPlan.meetingRooms.filter(r => !newRoomIds.has(r.roomId));

        deletedRooms.forEach(room => {
            if (room.bookings) {
                room.bookings.forEach(booking => {
                    if (new Date(booking.endTime) > now) {
                        notifications.push({
                            userId: booking.user,
                            message: `⚠️ Urgent: Your booking for Room ${room.name} has been cancelled because the room was removed.`,
                            reason: "Room Deleted by Admin",
                            timestamp: new Date()
                        });
                    }
                });
            }
        });

        const newSeatIds = new Set(seats.map(s => s.seatId));
        const deletedSeats = targetPlan.seats.filter(s => !newSeatIds.has(s.seatId));

        deletedSeats.forEach(seat => {
            if (seat.bookings) {
                seat.bookings.forEach(booking => {
                    if (new Date(booking.endTime) > now) {
                        notifications.push({
                            userId: booking.user,
                            message: `⚠️ Urgent: Your booking for Seat ${seat.seatId} has been cancelled because the seat was removed.`,
                            reason: "Seat Removed by Admin",
                            timestamp: new Date()
                        });
                    }
                });
            }
        });

        let uniqueUserCount = 0;
        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
            const uniqueUsers = new Set(notifications.map(n => n.userId.toString()));
            uniqueUserCount = uniqueUsers.size;
        }

        if (version < targetPlan.version) {
            if (userRole === 'superadmin') {
            } else {
                return res.status(409).json({ success: false, message: "Conflict detected." });
            }
        }

        await FloorPlan.findByIdAndUpdate(targetPlan._id, {
            $set: {
                name, floorNumber, meetingRooms, seats,
                version: targetPlan.version + 1, lastUpdated: Date.now()
            }
        });
        

        return res.status(200).json({ 
            success: true, 
            message: notifications.length > 0 
                ? `Floor Updated. ${uniqueUserCount} users were notified of cancellations.` 
                : "Floor Updated Successfully" 
        });

      } else {
        const newPlan = await FloorPlan.create({
          name,
          floorNumber,
          meetingRooms,
          seats,
          version: 1
        });
        return res.status(201).json({ success: true, message: "New Floor Created", data: newPlan });
      }

    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  }
}

export default withMonitor(authMiddleware(handler));