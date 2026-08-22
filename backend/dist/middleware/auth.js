import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { config } from "../config.js";
import { getMongoDb } from "../lib/mongodb.js";
import { HttpError } from "../utils/httpError.js";
function readBearerToken(req) {
    const header = req.headers.authorization ?? "";
    if (!header.startsWith("Bearer ")) {
        return "";
    }
    return header.slice("Bearer ".length).trim();
}
async function verifyUserFromToken(token) {
    const payload = jwt.verify(token, config.jwtSecret);
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
    };
}
export async function authenticateJwt(req, _res, next) {
    try {
        const token = readBearerToken(req);
        if (!token) {
            throw new HttpError(401, "Authentication required");
        }
        req.user = await verifyUserFromToken(token);
        next();
    }
    catch (error) {
        if (error instanceof HttpError) {
            next(error);
            return;
        }
        next(new HttpError(401, "Invalid or expired token"));
    }
}
export async function optionalJwt(req, _res, next) {
    try {
        const token = readBearerToken(req);
        if (token) {
            req.user = await verifyUserFromToken(token);
        }
        next();
    }
    catch {
        next();
    }
}
