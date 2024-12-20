import express from "express";
import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import multer from "multer";
import multerS3 from "multer-s3";
import { IAdImage } from "../model/ads.model";
import AdImage from "../model/ads.model";

const adsRoute = express.Router();
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

// Handle the POST request for ads image upload
adsRoute.post("/upload", upload.single("image"), async (req: any, res) => {
  const file = req.file;
  const { url } = req.body;

  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  // Extract the image URL from the uploaded file
  const imageUrl = file.location;

  const newAdImage: IAdImage = new AdImage({
    title: "Sample Ad",
    description: "This is a sample ad image.",
    imageUrl, // Use the URL of the uploaded image
    url,
  });

  try {
    await newAdImage.save();
    res.status(201).json(newAdImage);
  } catch (error) {
    res.status(500).json({ error: "Error saving ad image" });
  }
});

// Handle the GET request to fetch all ad images
adsRoute.get("/images", async (req, res) => {
  try {
    const adImages = await AdImage.find(); // Retrieve all ad images from the database
    res.status(200).json(adImages);
  } catch (error) {
    res.status(500).json({ error: "Error fetching ad images" });
  }
});
// Handle the DELETE request for an ad image
adsRoute.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Find the ad image by ID
    const adImage = await AdImage.findById(id);

    if (!adImage) {
      return res.status(404).json({ error: "Ad image not found" });
    }

    // Delete the ad image from the database
    await AdImage.findByIdAndDelete(id);

    res.status(200).json({ message: "Ad image deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error deleting ad image", details: error.message });
  }
});

adsRoute.post(
  "/banner/upload",
  upload.single("image"),
  async (req: any, res) => {
    const file = req.file;
    const { url } = req.body;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Extract the image URL from the uploaded file
    const imageUrl = file.location;

    const newAdImage: IAdImage = new AdImage({
      title: "Sample Ad",
      description: "This is a sample ad image.",
      imageUrl, // Use the URL of the uploaded image
      url,
      type: "banner",
      active: true,
    });

    try {
      await newAdImage.save();
      res.status(201).json(newAdImage);
    } catch (error) {
      res.status(500).json({ error: "Error saving ad image" });
    }
  }
);

// Handle the GET request to fetch all banner images

adsRoute.get("/banner/images", async (req, res) => {
  try {
    const adImages = await AdImage.find({ type: "banner" }); // Retrieve all banner images from the database
    res.status(200).json(adImages);
  } catch (error) {
    res.status(500).json({ error: "Error fetching banner images" });
  }
});

// update the ad image with the new data
adsRoute.put(
  "/banner/upload/:id",
  upload.single("image"),
  async (req: any, res: any) => {
    const { id } = req.params;
    const { description, url } = req.body;
    const file = req.file;

    try {
      // Fetch the ad image by ID
      const adImage = await AdImage.findById(id);
      const active = req.body.active;
      if (!adImage) {
        return res.status(404).json({ error: "Ad image not found" });
      }

      // Update ad image fields dynamically
      adImage.title = adImage.title || "Sample Ad"; // Add a default title if none exists
      adImage.description = description || adImage.description;
      adImage.imageUrl = file?.location || adImage.imageUrl; // Use file's path if available
      adImage.url = url || adImage.url;
      adImage.active = active;

      // Save the updated ad image
      await adImage.save();

      res
        .status(200)
        .json({ message: "Ad image updated successfully", adImage });
    } catch (error) {
      res.status(500).json({
        error: "Error updating ad image",
        details: (error as Error).message,
      });
    }
  }
);

module.exports = adsRoute;
