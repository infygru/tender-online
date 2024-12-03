"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const multer_1 = __importDefault(require("multer"));
const multer_s3_1 = __importDefault(require("multer-s3"));
const client_s3_1 = require("@aws-sdk/client-s3");
const blogRoute = express_1.default.Router();
require("dotenv").config();
const bucketName = process.env.AWS_BUCKET_NAME;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.AWS_REGION;
const s3Client = new client_s3_1.S3Client({
    region,
    credentials: {
        accessKeyId,
        secretAccessKey,
    },
});
const upload = (0, multer_1.default)({
    storage: (0, multer_s3_1.default)({
        s3: s3Client,
        bucket: bucketName,
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            cb(null, Date.now().toString() + "-" + file.originalname);
        },
    }),
});
// Define a Mongoose schema for the blog post
const blogPostSchema = new mongoose_1.default.Schema({
    title: { type: String },
    featureImg1: { type: String, default: "" },
    featureImg2: { type: String, default: "" },
    description: { type: String },
    tags: { type: [String] },
    author: { type: String },
    postContent: [String],
    introduction: { type: String },
    conclusion: { type: String },
    CreatedAt: { type: Date, default: Date.now },
});
// Create a Mongoose model based on the schema
const BlogPostModel = mongoose_1.default.model("BlogPost", blogPostSchema);
blogRoute.post("/:blogId", upload.single("img"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log(req.file, "demo");
}));
blogRoute.post("/", upload.array("files", 3), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { title, description, tags, author, introduction, conclusion, postContent, } = req.body;
    const files = req.files;
    console.log(files);
    // if (!title || !description || !tags || !author) {
    //   return res.status(400).json({ error: "All fields are required." });
    // }
    try {
        // Create a new blog post using the Mongoose model
        const newPost = yield BlogPostModel.create({
            title,
            featureImg1: ((_a = files[0]) === null || _a === void 0 ? void 0 : _a.location) || "demo",
            featureImg2: ((_b = files[1]) === null || _b === void 0 ? void 0 : _b.location) || "demo",
            description,
            tags,
            author,
            introduction,
            conclusion,
            postContent,
        });
        res.status(201).json({
            message: "Blog post added successfully!",
            post: newPost,
            code: 201,
        });
    }
    catch (error) {
        console.error("Error saving blog post:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}));
// Get all blog posts
blogRoute.get("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const allPosts = yield BlogPostModel.find();
        res.status(200).json(allPosts);
    }
    catch (error) {
        console.error("Error fetching all blog posts:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}));
// Get blog post by ID
blogRoute.get("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const postId = req.params.id;
    try {
        const post = yield BlogPostModel.findById(postId);
        if (!post) {
            return res.status(404).json({ error: "Blog post not found" });
        }
        const JSONPosrContent = JSON.parse(post === null || post === void 0 ? void 0 : post.postContent.join(" "));
        console.log(JSONPosrContent, "JSONPosrContent");
        res.json([post, JSONPosrContent]);
    }
    catch (error) {
        console.error("Error fetching blog post by ID:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}));
blogRoute.delete("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const postId = req.params.id;
    try {
        const post = yield BlogPostModel.findByIdAndDelete(postId);
        if (!post) {
            return res.status(404).json({ error: "Blog post not found" });
        }
        res.status(204).end(); // 204 No Content (successful deletion)
    }
    catch (error) {
        console.error("Error deleting blog post by ID:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}));
// Search for blog posts based on a query
blogRoute.get("/search", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ error: "Search query is required" });
    }
    try {
        const searchResults = yield BlogPostModel.find({
            $text: { $search: query },
        });
        res.status(200).json(searchResults);
    }
    catch (error) {
        console.error("Error searching for blog posts:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}));
module.exports = blogRoute;
//# sourceMappingURL=blogRoute.js.map