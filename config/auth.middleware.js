import jwt from "jsonwebtoken";
import dotenv from 'dotenv';

dotenv.config();

const auth = (req, res, next) => {
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    return res.status(401).json({ message: "Access Denied: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access Denied: Invalid token format" });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    if (!verified || typeof verified !== 'object' || !verified.companyId || !verified.id) {
      return res.status(401).json({ message: 'Invalid staff token' });
    }
    req.user = verified;
    next();
  } catch (error) {
    console.error("JWT Verification Error:", error.message);
    res.status(401).json({ message: "Invalid Token" });
  }
};

export default auth;

