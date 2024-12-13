import express from "express";
import mongoose from "mongoose";
import { Request, Response } from "express";
import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

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
  fileFilter: function (req: any, file: any, cb: any) {
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (validTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

const uploadFields = upload.fields([
  { name: "featuredImage", maxCount: 1 },
  { name: "title", maxCount: 1 },
  { name: "description", maxCount: 1 },
  { name: "tags", maxCount: 1 },
  { name: "author", maxCount: 1 },
  { name: "introduction", maxCount: 1 },
  { name: "conclusion", maxCount: 1 },
]);

interface BlogPost {
  title?: string;
  featuredImage?: string;
  description?: string;
  tags?: string[];
  author?: string;
  postContent?: string[];
  introduction?: string;
  conclusion?: string;
  CreatedAt?: Date;
}

const blogPostSchema = new mongoose.Schema<BlogPost>({
  title: { type: String },
  featuredImage: { type: String },
  description: { type: String },
  tags: { type: [String] },
  author: { type: String },
  postContent: [String],
  introduction: { type: String },
  conclusion: { type: String },
  CreatedAt: { type: Date, default: Date.now },
});

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
  uploadFields,

  async (req: any, res: Response) => {
    try {
      const { title, description, tags, author, introduction, conclusion } =
        req.body;
      const featuredImageUrl =
        req.files && req.files["featuredImage"]
          ? req.files["featuredImage"][0].location
          : null;
      const newPost = await BlogPostModel.create({
        title,
        description,
        featuredImage: featuredImageUrl,
        tags: tags ? tags.split(",").map((tag: string) => tag.trim()) : [],
        author,
        introduction,
        conclusion,
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

    res.status(200).json(post);
  } catch (error) {
    console.error("Error fetching blog post by ID:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

blogRoute.delete("/:id", async (req: any, res: any) => {
  const postId = req.params.id;

  try {
    const post = await BlogPostModel.findById(postId);

    if (!post) {
      return res.status(404).json({ error: "Blog post not found" });
    }

    if (post.featuredImage) {
      try {
        const imageKey = post.featuredImage
          ? decodeURIComponent(
              new URL(post.featuredImage).pathname.split("/").pop() || ""
            )
          : null;

        const deleteParams = {
          Bucket: bucketName,
          Key: imageKey,
        };

        await s3Client.send(new DeleteObjectCommand(deleteParams));
      } catch (s3Error) {
        console.error("Error deleting image from S3:", s3Error);
      }
    }

    await BlogPostModel.findByIdAndDelete(postId);

    res.status(204).end();
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

blogRoute.put(
  "/:id",
  upload.single("featuredImage"),
  async (req: any, res: Response) => {
    const postId = req.params.id;
    try {
      // Prepare update object
      const updateData: any = {
        title: req.body.title,
        description: req.body.description,
        tags: req.body.tags
          ? req.body.tags.split(",").map((tag: string) => tag.trim())
          : [],
        author: req.body.author,
      };

      // If a new image was uploaded, add its URL to the update
      if (req.file) {
        updateData.featuredImage = req.file.location;
      }

      // Find and update the blog post
      const updatedPost = await BlogPostModel.findByIdAndUpdate(
        postId,
        updateData,
        { new: true, runValidators: true }
      );

      if (!updatedPost) {
        return res.status(404).json({ error: "Blog post not found" });
      }

      res.status(200).json({
        message: "Blog post updated successfully!",
        post: updatedPost,
      });
    } catch (error) {
      console.error("Error updating blog post:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

module.exports = blogRoute;
