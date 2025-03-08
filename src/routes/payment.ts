import express from "express";

import { adminOnly } from "../middlewares/auth.js";
import {
  allCoupons,
  applyDiscount,
  deleteCoupon,
  newCoupon,
} from "../controllers/payment.js";

const app = express.Router();

app.post("/coupon/new", adminOnly, newCoupon);

app.get("/discount", applyDiscount);

app.get("/all", adminOnly, allCoupons);

app.delete("/delete/:id", adminOnly, deleteCoupon);

export default app;
