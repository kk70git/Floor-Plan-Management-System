import dbConnect from '../../../lib/db';
import User from '../../../models/User';
import bcrypt from 'bcryptjs';
import { z } from 'zod'; 

const signupSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
  name: z.string().min(1, { message: "Name is required" }),
  role: z.string().optional(),
  secretKey: z.string().optional(), // Accept secret key
});

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'POST') {
    try {
      const validation = signupSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({ 
            success: false, 
            message: validation.error.issues[0].message 
        });
      }

      const { name, email, password, role, secretKey } = validation.data;

      // --- SECURITY CHECK: Validate Role Keys ---
      const targetRole = role || 'user';

      if (targetRole === 'admin') {
          if (secretKey !== process.env.ADMIN_SECRET) {
              return res.status(403).json({ success: false, message: "⛔ Invalid Admin Secret Key." });
          }
      }

      if (targetRole === 'superadmin') {
          if (secretKey !== process.env.SUPERADMIN_SECRET) {
              return res.status(403).json({ success: false, message: "⛔ Invalid Super Admin Secret Key." });
          }
      }
      // -------------------------------------------

      const userExists = await User.findOne({ email });
      if (userExists) {
        return res.status(400).json({ success: false, message: "User already exists" });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        role: targetRole,
        bookingHistory: []
      });

      return res.status(201).json({ 
        success: true, 
        message: "User registered successfully!",
        userId: user._id 
      });

    } catch (error) {
      return res.status(500).json({ success: false, message: error.message });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}