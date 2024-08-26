"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
// import routor from "./routor/route";
const routor = require("./routor/route");
const MONGODB_URI = "mongodb+srv://gokul:UPw3fCb6kDmF5CsE@cluster0.klfb9oe.mongodb.net/?retryWrites=true&w=majority";
mongoose_1.default.connect(MONGODB_URI, {
// useNewUrlParser: true,
// useUnifiedTopology: true,
});
dotenv_1.default.config();
const connectToMongoDB = mongoose_1.default.connection;
connectToMongoDB.on("error", console.error.bind(console, "MongoDB connection error:"));
connectToMongoDB.once("open", () => {
    console.log("Connected to MongoDB");
});
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use((0, cors_1.default)());
app.get("/", (req, res) => {
    res.send("Express + TypeScript Server");
});
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use(express_1.default.static("public"));
app.use("/api", routor);
app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});
//# sourceMappingURL=index.js.map