"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const routor = require("./routor/route");
dotenv_1.default.config();
const MONGODB_URI = 
// "mongodb+srv://gokul:UPw3fCb6kDmF5CsE@cluster0.klfb9oe.mongodb.net/tender?retryWrites=true&w=majority";  //original URL
"mongodb+srv://fact-check-central:mqWCg161HpnDfWbT@cluster0.l1kcoiw.mongodb.net/tender";
mongoose_1.default.connect(MONGODB_URI, {});
const connectToMongoDB = mongoose_1.default.connection;
connectToMongoDB.on("error", console.error.bind(console, "MongoDB connection error:"));
connectToMongoDB.once("open", () => {
    console.log("Connected to MongoDB");
});
const app = (0, express_1.default)();
const port = process.env.PORT || 8080;
app.use((0, cors_1.default)());
// app.use(
//   cors({
//     origin: [
//       "http://localhost:3002",
//       "http://localhost:3001",
//       "https://tender-online-web.vercel.app",
//       "https://tender-online-admin-ibob.vercel.app",
//       "https://tender-online-web-l5ws.vercel.app",
//       "https://tenderonline.in/",
//       "https://demo.tenderonline.in",
//       "https://demo.tenderonline.in/",
//       "https://admin.tenderonline.co.in",
//       "https://tender-online.vercel.app",
//       "https://www.tenderonline.in",
//       "https://tenderonline.in/",
//       "https://www.tenderonline.co.in",
//       "https://tenderonline.co.in",
//       "https://tender-online.vercel.app",
//       "http://localhost:3000",
//       "http://localhost:3002",
//     ],
//     methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
//     allowedHeaders: ["Content-Type", "Authorization"],
//   })
// );
// Middleware to parse JSON and URL-encoded data
app.use(body_parser_1.default.json({ limit: "500mb" }));
app.use(body_parser_1.default.urlencoded({ limit: "500mb", extended: true }));
app.use(express_1.default.static("public"));
// Apply the authenticateUser middleware to all routes starting with '/api'
app.use("/api", routor);
// Health check route
app.get("/", (req, res) => {
    res.send("Express + TypeScript Server");
});
// Start the server
app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});
//# sourceMappingURL=index.js.map