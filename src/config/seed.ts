import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User";

dotenv.config();

const seedAdmin = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI as string;
    await mongoose.connect(mongoURI);
    console.log("✅ MongoDB connected");

    const name = process.env.ADMIN_NAME;
    const username = process.env.ADMIN_USERNAME;
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!name || !username || !email || !password) {
      throw new Error(
        "ADMIN_NAME, ADMIN_USERNAME, ADMIN_EMAIL, dan ADMIN_PASSWORD harus diisi di .env"
      );
    }

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      console.log("⚠️  Admin sudah ada, skip seeding.");
      await mongoose.disconnect();
      process.exit(0);
    }

    // Hash password & create admin
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await User.create({
      name,
      username,
      email,
      password: hashedPassword,
      role: "admin",
    });

    console.log("✅ Admin berhasil dibuat:");
    console.log(`   Name     : ${name}`);
    console.log(`   Username : ${username}`);
    console.log(`   Email    : ${email}`);
    console.log(`   Role     : admin`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed gagal:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
};

seedAdmin();
