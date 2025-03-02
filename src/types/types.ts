import { NextFunction, Request, Response } from "express";

export interface NewUserRequestBody {
  name: string;
  email: string;
  photo: string;
  gender: string;
  _id: string;
  dob: Date;
}

export interface NewProductReqBody {
  name: string;
  price: Number;
  stock: Number;
  category: string;
}

export type ControllerType = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void | Response<any, Record<string, any>>>;


export type searchRequestQuery{
  search? : string;
  price?: string;
  category?: string;
  sort?: string;
  page?: string;
}

export interface baseQueryType {
  name? :{
    $regex: string;
    $options:string;
  };
  price?: {$lte: number };
  category?: string;
  
}