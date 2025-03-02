import mongoose from "mongoose";
import { InvalidateCacheProps } from "../types/types";
import { myCache } from "../app";
import { Product } from "../models/product";

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

export const invalidateCache = async ({
  product,
  order,
  admin,
}: InvalidateCacheProps) => {
  if (product) {
    const productKeys: string[] = [
      "latest-products",
      "categories",
      "all-products",
    ];

    const products = await Product.find({}).select("_id");

    products.forEach((item) => {
      productKeys.push(`product-${item._id}`);
    });

    myCache.del(productKeys);
  }
  if (order) {
  }
  if (admin) {
  }
};
