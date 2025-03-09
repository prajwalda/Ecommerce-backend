import mongoose from "mongoose";
import { InvalidateCacheProps, orderItemType } from "../types/types";
import { myCache } from "../app";
import { Product } from "../models/product";
import { Order } from "../models/order";
import { Document } from "mongoose";

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

export const invalidateCache = ({
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
    myCache.del([
      "admin-stats",
      "admin-pie-charts",
      "admin-bar-charts",
      "admin-line-charts",
    ]);
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
  const percent = (thisMonth / lastMonth) * 100;
  return Number(percent.toFixed(0));
};

export const getInvetories = async ({
  categories,
  productsCount,
}: {
  categories: string[];
  productsCount: number;
}) => {
  const categoriesCountPromise = categories.map((category) =>
    Product.countDocuments({ category })
  );

  const categoriesCount = await Promise.all(categoriesCountPromise);

  const categoryCount: Record<string, number>[] = [];

  categories.forEach((item, idx) => {
    return categoryCount.push({
      [item]: Math.round((categoriesCount[idx] / productsCount) * 100),
    });
  });

  return categoryCount;
};

interface myDocument extends Document {
  createdAt: Date;
  discount?: number;
  total?: number;
}

type funcProps = {
  length: number;
  docArr: myDocument[];
  property?: "total" | "discount";
};

export const getChartData = ({ length, docArr, property }: funcProps) => {
  const today = new Date();

  const data: number[] = new Array(length).fill(0);

  docArr.forEach((order) => {
    const creationDate = order.createdAt;
    const monthDiff = (today.getMonth() - creationDate.getMonth() + 12) % 12;

    if (monthDiff < length) {
      if (property) {
        data[length - monthDiff - 1] += order[property]!;
      } else {
        data[length - monthDiff - 1] += 1;
      }
    }
  });
  return data;
};
