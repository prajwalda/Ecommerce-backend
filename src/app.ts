import express, { NextFunction, Request, Response } from "express";
import userRoute from "./routes/user.js";

import { connectDB } from "./utils/feature.js";
import { errorMiddleware } from "./middlewares/error.js";

const app = express();
const port = 6000;

connectDB();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("working.....");
});

app.use("/api/v1/user", userRoute);

app.use(errorMiddleware);

app.listen(port, () => {
  console.log(`Express is working on ${port}`);
});
