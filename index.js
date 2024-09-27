const express = require("express");
const multer = require("multer");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const FormData = require("form-data");
const ytsr = require("@distube/ytsr");
const cheerio = require("cheerio");
const cors = require("cors");

const app = express();
app.use(
  cors({
    origin: "http://localhost:5173", // Frontend's origin
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json()); // To parse JSON bodies
process.env.YTSR_NO_UPDATE = "true";
const defaultThumbnailUrl =
  "https://n-lightenment.com/wp-content/uploads/2015/10/movie-night11.jpg"; // Replace with your actual default image path

const upload = multer({ dest: "uploads/" });

const downloadImage = async (url, dest) => {
  const writer = fs.createWriteStream(dest);
  try {
    const response = await axios({
      url,
      method: "GET",
      responseType: "stream",
    });
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on("finish", resolve);
      writer.on("error", reject);
    });
  } catch (error) {
    console.error(`Error downloading image: ${error.message}`);
    // Default handling: If downloading the image fails, resolve anyway.
    return Promise.resolve();
  }
};

const searchYoutube = async (query) => {
  try {
    const searchResults = await ytsr(query, { safeSearch: true });
    const movie = searchResults.items[0];
    return {
      title: movie?.name || "No title found",
      thumbnail: movie?.thumbnail || null,
      description: movie?.description,
      duration: movie?.duration || "01:32:00",
      views: movie?.views || "0",
    };
  } catch (error) {
    console.error(`YouTube search failed: ${error.message}`);
    return { error: `YouTube search failed: ${error.message}` };
  }
};


const normalizeTitle = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
};

app.post("/api/upload", async (req, res) => {
  const { movies } = req.body;
  if (!movies || !Array.isArray(movies)) {
    return res.status(400).json({ error: "Invalid or missing movieUrls array" });
  }

  try {
    const allMoviesResponse = await axios.get(
      "https://backend.videosroom.com/public/api/all-movies"
    );
    const allMovies = allMoviesResponse?.data?.data || [];
    const responses = [];

    await Promise.all(
      movies.map(async (movie) => {
        const streamWishUrl = `https://api.streamwish.com/api/upload/url?key=20445huibnrwap8ww1pp4&url=${movie?.url}`;
        try {
          const streamWishResponse = await axios.get(streamWishUrl);
          responses.push({
            status: streamWishResponse?.data?.status,
            error: streamWishResponse?.data?.msg,
            data: streamWishResponse?.data?.result?.filecode,
          });
        } catch (streamWishError) {
          console.error(
            `StreamWish upload error for: ${movie?.title}`,
            streamWishError.message
          );
          responses.push({
            status: "error",
            error: `StreamWish upload failed for: ${movie?.title}`,
          });
        }

        const matchedMovie = allMovies.find((m) => {
          const titleA = normalizeTitle(m?.title);
          const titleB = normalizeTitle(movie?.title);
          return (
            titleA === titleB ||
            titleA.includes(titleB) ||
            titleB.includes(titleA)
          );
        });

        if (matchedMovie) {
          console.log(`Found for: ${movie?.title}`);
          responses.push({
            status: 1,
            error: "Movie Already Uploaded on Server",
            message: "Match Found",
            data: movie?.title,
          });
        }

        const youtubeData = await searchYoutube(movie.title);
        if (!youtubeData) {
          console.log(`No YouTube data found for: ${movie.title}`);
          responses.push({
            status: 0,
            error: "No YouTube data found",
            data: movie.title,
          });
          return; // Return early if no YouTube data found
        }

        const { title, description, duration, views, thumbnail } = youtubeData;

        // Set thumbnail to default if it's not valid
        const thumbnailUrl = thumbnail || defaultThumbnailUrl;

        const thumbnailDir = path.join(__dirname, "thumbnails");

        
        // Ensure the directory exists before attempting to save the file
        if (!fs.existsSync(thumbnailDir)) {
          try {
            fs.mkdirSync(thumbnailDir, { recursive: true });
            console.log("Thumbnail directory created:", thumbnailDir);
          } catch (dirError) {
            console.error("Error creating thumbnail directory:", dirError.message);
            return res
              .status(500)
              .json({ error: "Failed to create thumbnail directory" });
          }
        }

        const sanitizedTitle = title
          .replace(/[^a-zA-Z0-9\s_-]/g, "") // Sanitize the title to remove special characters
          .replace(/\s+/g, "_"); // Replace spaces with underscores

        const thumbnailPath = path.join(thumbnailDir, `${sanitizedTitle}.jpg`);

        // Attempt to download the thumbnail
        try {
          await downloadImage(thumbnailUrl, thumbnailPath);
        } catch (downloadError) {
          console.error(
            `Error downloading thumbnail for: ${movie.title}. Using default thumbnail.`,
            downloadError.message
          );
        }

        const download_link1 = movie?.url;
        const iframe_link1 = movie?.url;

        const download_link5 = `https://playerwish.com/f/${streamWishResponse?.data?.result?.filecode}`;
        const iframe_link5 = `https://playerwish.com/e/${streamWishResponse?.data?.result?.filecode}`;

        const formData = new FormData();
        formData.append("title", title || "Untitled Movie");
        formData.append("description", description || title);
        formData.append("uploadBy", "admin");
        formData.append("duration", duration);
        formData.append("views", views || "0");
        formData.append("download_link1", download_link1);
        formData.append("iframe_link1", iframe_link1);
        
        formData.append("download_link5", download_link5);
        formData.append("iframe_link5", iframe_link5);

        // Append the thumbnail to form data
        formData.append("thumbnail", fs.createReadStream(thumbnailPath)); // Send the downloaded thumbnail

        // Send movie data to backend API
        const addMovieResponse = await axios.post(
          "https://backend.videosroom.com/public/api/add-movie",
          formData,
          { headers: { ...formData.getHeaders() } }
        );

        responses.push({
          service: "Backend API",
          result: addMovieResponse.data,
        });
      })
    );

    // Send all responses at once after processing all movies
    res.status(200).json(responses);
  } catch (error) {
    console.error("Error uploading files:", error.message);
    res.status(500).json({ error: "Error uploading files", message: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
