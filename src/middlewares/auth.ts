import { User } from "../models/user";
import ErrorHandler from "../utils/utility-class";
import { TryCatch } from "./error";

// middleware to make sure only only  admin allowed
export const adminOnly = TryCatch(async (req, res, next) => {
  const { id } = req.query;

  if (!id) return next(new ErrorHandler("Saale Login kar pahle", 401));

  const user = await User.findById(id);
  if (!user) return next(new ErrorHandler("Saale Fake Id deta hai", 401));
  if (user.role !== "admin")
    return next(new ErrorHandler("Saale aukat nhi hai teri", 401));

  next();
});
