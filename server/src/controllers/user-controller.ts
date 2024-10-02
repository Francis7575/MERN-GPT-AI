import { NextFunction, Request, Response } from "express";
import User from "../models/User";
import { compare, hash } from "bcrypt";
import { createToken } from "../utils/token-manager";
import { COOKIE_NAME } from "../utils/constants";

const isProduction = process.env.NODE_ENV === "production";

export const getAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    //get all users
    const users = await User.find();
    res.status(200).json({ message: "OK", users });
  } catch (error: unknown) {
    console.log(error);
    res.status(500).json({ message: "Error getting all users" });
  }
};

export const userSignup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    //user signup
    const { fullName, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(401).send("User already registered");
      return;
    }
    const hashedPassword = await hash(password, 10);
    const user = new User({ fullName, email, password: hashedPassword });
    await user.save();

    // create token and store cookie
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      sameSite: isProduction ? "none" : "strict",
      secure: isProduction ? true : false,
      signed: true,
    });

    const token = createToken(user._id.toString(), user.email, "7d");
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: isProduction ? "none" : "strict",
      secure: isProduction ? true : false,
      signed: true,
      expires
    });

    res
      .status(201)
      .json({ message: "User has being created", id: user._id.toString() });
  } catch (error: unknown) {
    console.log(error);
    res.status(500).json({ message: "Unable to create the user" });
  }
};

export const userLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    //user login
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).send("User not registered");
      return;
    }
    const isPasswordCorrect = await compare(password, user.password);
    if (!isPasswordCorrect) {
      res.status(403).send("Incorrect Password");
    }

    // create token and store cookie
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      sameSite: isProduction ? "none" : "strict",
      secure: isProduction ? true : false,
      signed: true,
    });

    const token = createToken(user._id.toString(), user.email, "7d");
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: isProduction ? "none" : "strict",
      secure: isProduction ? true : false,
      signed: true,
      expires
    });

    res.status(200).json({
      message: "Succesfully Login!",
      fullName: user.fullName,
      email: user.email,
    });
  } catch (error: unknown) {
    console.log(error);
    res.status(500).json({ message: "Unable to login" });
  }
};

export const verifyUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    //user token check
    const user = await User.findById(res.locals.jwtData.id);
    if (!user) {
      res.status(401).send("User not registered OR Token malfunctioned");
    }
    if (user!._id.toString() !== res.locals.jwtData.id) {
      res.status(401).send("Permissions didn't match");
    }
    res
      .status(200)
      .json({ message: "OK", fullName: user!.fullName, email: user!.email });
  } catch (error) {
    console.log(error);
    res.status(200).json({ message: "Error verifying user" });
  }
};

export const userLogout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    //user token check
    const user = await User.findById(res.locals.jwtData.id);
    if (!user) {
      res.status(401).send("User not registered OR Token malfunctioned");
      return;
    }
    if (user._id.toString() !== res.locals.jwtData.id) {
      res.status(401).send("Permissions didn't match");
      return;
    }

    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      sameSite: isProduction ? "none" : "strict",
      secure: isProduction ? true : false,
      signed: true
    });

    res
      .status(200)
      .json({ message: "OK", fullName: user.fullName, email: user.email });
  } catch (error: any) {
    res.status(200).json({ message: "ERROR", cause: error.message });
    console.log(error);
  }
};
