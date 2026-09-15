import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { config } from "../config.js";

import os from "node:os";

export function getUploadDir() {
  const candidateDirs = [
    config.sharedUploadDir,
    path.resolve(config.projectRoot, "backend-storage", "uploads"),
    path.resolve(config.projectRoot, "uploads"),
    path.resolve(os.tmpdir(), "udai-uploads"),
  ];

  for (const dir of candidateDirs) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o775 });
      }
      fs.accessSync(dir, fs.constants.W_OK);
      return dir;
    } catch {
      // Try next directory
    }
  }

  return config.sharedUploadDir;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      const dest = getUploadDir();
      cb(null, dest);
    } catch (err) {
      cb(err, config.sharedUploadDir);
    }
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, (file.fieldname || "image") + "-" + uniqueSuffix + ext);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp|svg/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only images (jpeg, jpg, png, gif, webp, svg) are allowed!"));
    }
  },
});
