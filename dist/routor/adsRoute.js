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
const client_s3_1 = require("@aws-sdk/client-s3");
const multer_1 = __importDefault(require("multer"));
const multer_s3_1 = __importDefault(require("multer-s3"));
const ads_model_1 = __importDefault(require("../model/ads.model"));
const adsRoute = express_1.default.Router();
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
// Handle the POST request for ads image upload
adsRoute.post("/upload", upload.single("image"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const file = req.file;
    const { url } = req.body;
    if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
    }
    // Extract the image URL from the uploaded file
    const imageUrl = file.location;
    const newAdImage = new ads_model_1.default({
        title: "Sample Ad",
        description: "This is a sample ad image.",
        imageUrl, // Use the URL of the uploaded image
        url,
    });
    try {
        yield newAdImage.save();
        res.status(201).json(newAdImage);
    }
    catch (error) {
        res.status(500).json({ error: "Error saving ad image" });
    }
}));
// Handle the GET request to fetch all ad images
adsRoute.get("/images", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const adImages = yield ads_model_1.default.find(); // Retrieve all ad images from the database
        res.status(200).json(adImages);
    }
    catch (error) {
        res.status(500).json({ error: "Error fetching ad images" });
    }
}));
// Handle the DELETE request for an ad image
adsRoute.delete("/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        // Find the ad image by ID
        const adImage = yield ads_model_1.default.findById(id);
        if (!adImage) {
            return res.status(404).json({ error: "Ad image not found" });
        }
        // Delete the ad image from the database
        yield ads_model_1.default.findByIdAndDelete(id);
        res.status(200).json({ message: "Ad image deleted successfully" });
    }
    catch (error) {
        res
            .status(500)
            .json({ error: "Error deleting ad image", details: error.message });
    }
}));
adsRoute.post("/banner/upload", upload.single("image"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const file = req.file;
    const { url } = req.body;
    if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
    }
    // Extract the image URL from the uploaded file
    const imageUrl = file.location;
    const newAdImage = new ads_model_1.default({
        title: "Sample Ad",
        description: "This is a sample ad image.",
        imageUrl, // Use the URL of the uploaded image
        url,
        type: "banner",
        active: true,
    });
    try {
        yield newAdImage.save();
        res.status(201).json(newAdImage);
    }
    catch (error) {
        res.status(500).json({ error: "Error saving ad image" });
    }
}));
// Handle the GET request to fetch all banner images
adsRoute.get("/banner/images", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const adImages = yield ads_model_1.default.find({ type: "banner" }); // Retrieve all banner images from the database
        res.status(200).json(adImages);
    }
    catch (error) {
        res.status(500).json({ error: "Error fetching banner images" });
    }
}));
// update the ad image with the new data
adsRoute.put("/banner/upload/:id", upload.single("image"), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { description, url } = req.body;
    const file = req.file;
    try {
        // Fetch the ad image by ID
        const adImage = yield ads_model_1.default.findById(id);
        const active = req.body.active;
        if (!adImage) {
            return res.status(404).json({ error: "Ad image not found" });
        }
        // Update ad image fields dynamically
        adImage.title = adImage.title || "Sample Ad"; // Add a default title if none exists
        adImage.description = description || adImage.description;
        adImage.imageUrl = (file === null || file === void 0 ? void 0 : file.location) || adImage.imageUrl; // Use file's path if available
        adImage.url = url || adImage.url;
        adImage.active = active;
        // Save the updated ad image
        yield adImage.save();
        res
            .status(200)
            .json({ message: "Ad image updated successfully", adImage });
    }
    catch (error) {
        res.status(500).json({
            error: "Error updating ad image",
            details: error.message,
        });
    }
}));
module.exports = adsRoute;
//# sourceMappingURL=adsRoute.js.map