import dbConnect from '../../../lib/db';
import User from '../../../models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod'; 

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  // UPDATED: min(8)
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
});

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'POST') {
    try {
      const validation = loginSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({ 
            success: false, 
            message: validation.error.issues[0].message 
        });
      }

      const { email, password } = validation.data;

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ success: false, message: "Invalid email or password" });
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(400).json({ success: false, message: "Invalid email or password" });
      }

      const token = jwt.sign(
        { id: user._id, role: user.role }, 
        process.env.JWT_SECRET,
        { expiresIn: '3d' }
      );

      return res.status(200).json({ 
        success: true, 
        token: token, 
        message: "Login successful" 
      });

    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}