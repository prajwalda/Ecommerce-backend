import express, { NextFunction, Request, Response } from "express";
import cors from "cors";

import { connectDB } from "./utils/feature.js";
import { errorMiddleware } from "./middlewares/error.js";
import NodeCache from "node-cache";
import { config } from "dotenv";
import morgan from "morgan";

// importing routes
import userRoute from "./routes/user.js";
import productRoute from "./routes/products.js";
import orderRoute from "./routes/order.js";
import paymnetRoute from "./routes/payment.js";

config({
  path: "./.env",
});

const app = express();
const port = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || "";

connectDB(MONGO_URI);

export const myCache = new NodeCache();

app.use(express.json());
app.use(cors());
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.send("working.....");
});

app.use("/api/v1/user", userRoute);
app.use("/api/v1/product", productRoute);
app.use("/api/v1/order", orderRoute);
app.use("/api/v1/payment", paymnetRoute);

app.use("/uploads", express.static("uploads"));

app.use(errorMiddleware);

app.listen(port, () => {
  console.log(`Express is working on ${port}`);
});
