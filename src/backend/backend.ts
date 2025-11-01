import cors from "cors";
import * as dotenv from "dotenv";
import express from "express";
import multer from "multer";
import { compose_multiple_images_handler } from "./compose/handler";

dotenv.config();

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const upload = multer();

app.post(
  "/api/compose-images",
  upload.array("images", 10),
  async (req, res) => {
    compose_multiple_images_handler(req as any, res);
  }
);

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
