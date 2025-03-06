import { myCache } from "../app";
import { TryCatch } from "../middlewares/error";
import { Order } from "../models/order";
import { NewOrderRequestBody } from "../types/types";
import { invalidateCache, reduceStock } from "../utils/feature";
import ErrorHandler from "../utils/utility-class";

export const myOrders = TryCatch(async (req, res, next) => {
  const { id: user } = req.query;

  const key = `my-orders-${user}`;
  let orders = [];

  if (myCache.has(key)) orders = JSON.parse(myCache.get("") as string);
  else {
    orders = await Order.find({ user: user });
    myCache.set("", JSON.stringify(orders));
  }

  return res.status(200).json({
    success: true,
    orders,
  });
});

export const allOrders = TryCatch(async (req, res, next) => {
  const key = `all-orders`;
  let orders = [];

  if (myCache.has(key)) orders = JSON.parse(myCache.get(key) as string);
  else {
    orders = await Order.find().populate("user", "name");
    myCache.set("", JSON.stringify(orders));
  }

  return res.status(200).json({
    success: true,
    orders,
  });
});

export const getSingleOrder = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  const key = `order-${id}`;

  let order;

  if (myCache.has(key)) order = JSON.parse(myCache.get(key) as string);
  else {
    order = await Order.findById(id).populate("user", "name");

    if (!order) return next(new ErrorHandler("Order not found", 404));

    myCache.set("", JSON.stringify(order));
  }

  return res.status(200).json({
    success: true,
    order,
  });
});

export const newOrder = TryCatch(
  async (req: Request<{}, {}, NewOrderRequestBody>, res, next) => {
    const {
      shippingInfo,
      orderItems,
      user,
      subtotal,
      tax,
      shippingCharges,
      discount,
      total,
    } = req.body;

    if (!shippingInfo || !orderItems || !user || !subtotal || !tax || !total)
      return next(new ErrorHandler("Please enter all feild", 400));

    const order = await Order.create({
      shippingInfo,
      orderItems,
      user,
      subtotal,
      tax,
      shippingCharges,
      discount,
      total,
    });

    await reduceStock(orderItems);

    await invalidateCache({
      product: true,
      order: true,
      admin: true,
      userId: user,
      productId: order.orderItems.map((i) => String(i.productId)),
    });

    return res.status(201).json({
      success: true,
      message: "Order placed succesfully",
    });
  }
);

export const processOrder = TryCatch(
  async (req: Request<{}, {}, NewOrderRequestBody>, res, next) => {
    const { id } = req.params;

    const order = await Order.findById(id);

    if (!order) return next(new ErrorHandler("Order not Found", 404));

    switch (order.status) {
      case "Processing":
        order.status = "Shipped";
        break;
      case "Shipped":
        order.status = "Delivered";
        break;
      default:
        order.status = "Delivered";
        break;
    }

    await order.save();

    await invalidateCache({
      product: false,
      order: true,
      admin: true,
      userId: order.user,
      orderId: String(order._id),
    });

    return res.status(201).json({
      success: true,
      message: "Order Processed succesfully",
    });
  }
);

export const deleteOrder = TryCatch(
  async (req: Request<{}, {}, NewOrderRequestBody>, res, next) => {
    const { id } = req.params;

    const order = await Order.findById(id);

    if (!order) return next(new ErrorHandler("Order not Found", 404));

    await Order.deleteOne();

    await invalidateCache({
      product: false,
      order: true,
      admin: true,
      userId: order.user,
      orderId: String(order._id),
    });

    return res.status(201).json({
      success: true,
      message: "Order Deleted succesfully",
    });
  }
);
