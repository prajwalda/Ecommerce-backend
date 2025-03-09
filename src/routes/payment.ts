import express from "express";

import { adminOnly } from "../middlewares/auth.js";
import {
  allCoupons,
  applyDiscount,
  createPaymentIntent,
  deleteCoupon,
  newCoupon,
} from "../controllers/payment.js";

const app = express.Router();

// stripe payment
app.post("/create", createPaymentIntent);

app.post("/coupon/new", adminOnly, newCoupon);

app.get("/discount", applyDiscount);

app.get("/all", adminOnly, allCoupons);

app.delete("/delete/:id", adminOnly, deleteCoupon);

export default app;
