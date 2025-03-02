import express, { NextFunction, Request, Response } from "express";
import cors from "cors";

import { connectDB } from "./utils/feature.js";
import { errorMiddleware } from "./middlewares/error.js";
import NodeCache from "node-cache";

// importing routes
import userRoute from "./routes/user.js";
import productRoute from "./routes/products.js";

const app = express();
const port = 5000;

connectDB();

export const myCache = new NodeCache()

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("working.....");
});

app.use("/api/v1/user", userRoute);
app.use("/api/v1/product", productRoute);

app.use("/uploads", express.static("uploads"));

app.use(errorMiddleware);

app.listen(port, () => {
  console.log(`Express is working on ${port}`);
});
