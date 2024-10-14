import express from "express";
import mongoose from "mongoose";
import { Request, Response } from "express";
import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";

const blogRoute = express.Router();
require("dotenv").config();

const bucketName = process.env.AWS_BUCKET_NAME;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.AWS_REGION;

const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: bucketName,
    metadata: function (req: any, file: any, cb: any) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req: any, file: any, cb: any) {
      cb(null, Date.now().toString() + "-" + file.originalname);
    },
  }),
});
interface BlogPost {
  title?: string;
  featureImg1?: string;
  featureImg2?: string;
  description?: string;
  tags?: string[];
  author?: string;
  postContent?: string[];
  introduction?: string;
  conclusion?: string;
  CreatedAt?: Date;
}

// Define a Mongoose schema for the blog post
const blogPostSchema = new mongoose.Schema<BlogPost>({
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
const BlogPostModel = mongoose.model<BlogPost>("BlogPost", blogPostSchema);
blogRoute.post(
  "/:blogId",
  upload.single("img"),
  async (req: any, res: Response) => {
    console.log(req.file, "demo");
  }
);
blogRoute.post(
  "/",
  upload.array("files", 3),
  async (req: any, res: Response) => {
    const {
      title,
      description,
      tags,
      author,
      introduction,
      conclusion,
      postContent,
    } = req.body;
    const files = req.files;
    console.log(files);

    // if (!title || !description || !tags || !author) {
    //   return res.status(400).json({ error: "All fields are required." });
    // }

    try {
      // Create a new blog post using the Mongoose model
      const newPost = await BlogPostModel.create({
        title,
        featureImg1: files[0]?.location || "demo",
        featureImg2: files[1]?.location || "demo",
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
    } catch (error) {
      console.error("Error saving blog post:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// Get all blog posts
blogRoute.get("/", async (req: Request, res: Response) => {
  try {
    const allPosts = await BlogPostModel.find();
    res.status(200).json(allPosts);
  } catch (error) {
    console.error("Error fetching all blog posts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get blog post by ID
blogRoute.get("/:id", async (req: Request, res: Response) => {
  const postId = req.params.id;

  try {
    const post = await BlogPostModel.findById(postId);

    if (!post) {
      return res.status(404).json({ error: "Blog post not found" });
    }
    const JSONPosrContent = JSON.parse(post?.postContent.join(" "));
    console.log(JSONPosrContent, "JSONPosrContent");

    res.json([post, JSONPosrContent]);
  } catch (error) {
    console.error("Error fetching blog post by ID:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

blogRoute.delete("/:id", async (req: any, res: any) => {
  const postId = req.params.id;

  try {
    const post = await BlogPostModel.findByIdAndDelete(postId);

    if (!post) {
      return res.status(404).json({ error: "Blog post not found" });
    }

    res.status(204).end(); // 204 No Content (successful deletion)
  } catch (error) {
    console.error("Error deleting blog post by ID:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Search for blog posts based on a query
blogRoute.get("/search", async (req: Request, res: Response) => {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: "Search query is required" });
  }

  try {
    const searchResults = await BlogPostModel.find({
      $text: { $search: query as string },
    });

    res.status(200).json(searchResults);
  } catch (error) {
    console.error("Error searching for blog posts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = blogRoute;
