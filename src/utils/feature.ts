import mongoose from "mongoose";
import { InvalidateCacheProps, orderItemType } from "../types/types";
import { myCache } from "../app";
import { Product } from "../models/product";
import { Order } from "../models/order";

export const connectDB = async (uri: string) => {
  try {
    const connection = await mongoose.connect(uri, {
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
  userId,
  orderId,
  productId,
}: InvalidateCacheProps) => {
  if (product) {
    const productKeys: string[] = [
      "latest-products",
      "categories",
      "all-products",
    ];
    if (typeof productId === "string") productKeys.push(`product-${productId}`);

    if (typeof productId == "object")
      productId.forEach((i) => productKeys.push(`product-${i}`));

    myCache.del(productKeys);
  }
  if (order) {
    const orderKeys: string[] = [
      "all-orders",
      `my-orders-${userId}`,
      `order-${orderId}`,
    ];
    // new approch better
    // const order = await Order.find({}).select("_id");

    // order.forEach((i) => {
    //   orderKeys.push(`order-${i._id}`);
    // });

    myCache.del(orderKeys);
  }
  if (admin) {
  }
};

export const reduceStock = async (orderItems: orderItemType[]) => {
  for (let i = 0; i < orderItems.length; i++) {
    const order = orderItems[i];
    const product = await Product.findById(order.productId);
    if (!product) throw new Error("Product not found");
    product.stock -= order.quantity;
    await product.save();
  }
};

export const calculatePercentage = (thisMonth: number, lastMonth: number) => {
  if (lastMonth === 0) return thisMonth * 100;
  const percent = ((thisMonth - lastMonth) / lastMonth) * 100;
  return Number(percent.toFixed(0));
};
