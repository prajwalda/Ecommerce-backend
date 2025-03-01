import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const connection = await mongoose.connect("mongodb://127.0.0.1:27017", {
      dbName: "Ecommerce24",
    });

    console.log(`DB connected to ${connection.connection.host}`);
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
};
