import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { config } from "../config.js";
import { getMongoDb } from "../lib/mongodb.js";
import { HttpError } from "../utils/httpError.js";

export interface AuthUser {
  id: string;
  email: string;
  role: "user" | "admin";
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

type TokenPayload = {
  sub: string;
  email: string;
  role: "user" | "admin";
};

function readBearerToken(req: Request) {
  const header = req.headers.authorization ?? "";
  if (!header.startsWith("Bearer ")) {
    return "";
  }

  return header.slice("Bearer ".length).trim();
}

async function verifyUserFromToken(token: string) {
  const payload = jwt.verify(token, config.jwtSecret) as TokenPayload;
  const user = await getMongoDb()
    .collection("users")
    .findOne({ _id: new ObjectId(payload.sub) });

  if (!user) {
    throw new HttpError(401, "User no longer exists");
  }

  return {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
  } satisfies AuthUser;
}

export async function authenticateJwt(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = readBearerToken(req);
    if (!token) {
      throw new HttpError(401, "Authentication required");
    }

    (req as AuthenticatedRequest).user = await verifyUserFromToken(token);
    next();
  } catch (error) {
    if (error instanceof HttpError) {
      next(error);
      return;
    }

    next(new HttpError(401, "Invalid or expired token"));
  }
}

export async function optionalJwt(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = readBearerToken(req);
    if (token) {
      (req as AuthenticatedRequest).user = await verifyUserFromToken(token);
    }
    next();
  } catch {
    next();
  }
}
