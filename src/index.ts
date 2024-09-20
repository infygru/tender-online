import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import bodyParser from "body-parser";
// import routor from "./routor/route";
const routor = require("./routor/route");
const MONGODB_URI =
  "mongodb+srv://gokul:UPw3fCb6kDmF5CsE@cluster0.klfb9oe.mongodb.net/tender?retryWrites=true&w=majority";
mongoose.connect(MONGODB_URI, {
  // useNewUrlParser: true,
  // useUnifiedTopology: true,
});

dotenv.config();
const connectToMongoDB = mongoose.connection;

connectToMongoDB.on(
  "error",
  console.error.bind(console, "MongoDB connection error:")
);
connectToMongoDB.once("open", () => {
  console.log("Connected to MongoDB");
});

const app: Express = express();
const port = process.env.PORT || 8080;
app.use(
  cors({
    origin: [
      "http://localhost:3002",
      "http://localhost:3001",
      "https://tender-online-web.vercel.app",
      "https://tender-online-admin-ibob.vercel.app",
      "https://tender-online-web-l5ws.vercel.app",
      "https://tenderonline.in/",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.get("/", (req: Request, res: Response) => {
  res.send("Express + TypeScript Server");
});

app.use(express.json());
app.use(bodyParser.json({ limit: "500mb" }));
app.use(bodyParser.urlencoded({ limit: "500mb", extended: true }));
app.use(express.static("public"));
app.use("/api", routor);

app.listen(port, () => {
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
