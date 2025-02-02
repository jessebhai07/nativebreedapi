const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");

// Load environment variables
dotenv.config();

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Initialize Express App
const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// Define Mongoose Schema
const ImageSchema = new mongoose.Schema({
  artist_name: String,
  imageUrl: String,
  artist_lyrics: String,
  artist_song_thumb: String,
  event_images: String,
  blog_image: String,
  blog_description: String,
  blog_title: String,
  carousel: String,
});

const Image = mongoose.model("Image", ImageSchema);

// Multer for file uploads (stores files temporarily)
const upload = multer({ dest: "uploads/" });

// Function to upload file to Cloudinary
const uploadToCloudinary = async (filePath, folder) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, { folder });
    fs.unlinkSync(filePath); // Delete local file after upload
    return result.secure_url;
  } catch (error) {
    throw new Error(error.message);
  }
};

// API Route: Upload Image
app.post("/upload", upload.fields([
  { name: "image", maxCount: 1 },
  { name: "artist_song_thumb", maxCount: 1 },
  { name: "event_images", maxCount: 1 },
  { name: "blog_image", maxCount: 1 },
  { name: "carousel", maxCount: 1 }
]), async (req, res) => {
  try {
    const { artist_name, artist_lyrics, blog_description, blog_title } = req.body;
    const files = req.files;
    
    const uploadedUrls = {};
    
    if (files) {
      for (const key of Object.keys(files)) {
        uploadedUrls[key] = await uploadToCloudinary(files[key][0].path, "uploads");
      }
    }
    
    // Save to MongoDB
    const newImage = new Image({
      artist_name,
      imageUrl: uploadedUrls.image || "",
      artist_lyrics,
      artist_song_thumb: uploadedUrls.artist_song_thumb || "",
      event_images: uploadedUrls.event_images || "",
      blog_image: uploadedUrls.blog_image || "",
      blog_description,
      blog_title,
      carousel: uploadedUrls.carousel || "",
    });
    
    await newImage.save();

    res.json({ message: "Upload successful", data: newImage });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API Route: Get All Images
app.get("/get-api", async (req, res) => {
  try {
    const images = await Image.find();
    res.json(images);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
