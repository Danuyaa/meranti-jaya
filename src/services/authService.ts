import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User";

interface RegisterInput {
  name: string;
  username: string;
  email: string;
  password: string;
  role?: "admin" | "cashier";
}

interface LoginInput {
  identifier: string; // username or email
  password: string;
}

interface AuthResult {
  user: {
    id: string;
    name: string;
    username: string;
    email: string;
    role: string;
  };
  token: string;
}

const generateToken = (userId: string, role: string): string => {
  const expiresIn = (process.env.JWT_EXPIRES_IN ||
    "7d") as jwt.SignOptions["expiresIn"];
  return jwt.sign({ id: userId, role }, process.env.JWT_SECRET as string, {
    expiresIn,
  });
};

export const registerUser = async (
  input: RegisterInput
): Promise<AuthResult> => {
  const { name, username, email, password, role } = input;

  // Check if email already exists
  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    throw new Error("Email sudah terdaftar");
  }

  // Check if username already exists
  const existingUsername = await User.findOne({ username });
  if (existingUsername) {
    throw new Error("Username sudah digunakan");
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create user
  const user = await User.create({
    name,
    username,
    email,
    password: hashedPassword,
    role: role || "cashier",
  });

  // Generate token
  const token = generateToken(String(user._id), user.role);

  return {
    user: {
      id: String(user._id),
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    token,
  };
};

export const loginUser = async (input: LoginInput): Promise<AuthResult> => {
  const { identifier, password } = input;

  // Find user by email or username
  const user = await User.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier.toLowerCase() },
    ],
  });
  if (!user) {
    throw new Error("Username/email atau password salah");
  }

  // Compare password
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new Error("Username/email atau password salah");
  }

  // Generate token
  const token = generateToken(String(user._id), user.role);

  return {
    user: {
      id: String(user._id),
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    token,
  };
};
