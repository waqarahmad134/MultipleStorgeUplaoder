const express = require("express")
const multer = require("multer")
const axios = require("axios")
const fs = require("fs")
const path = require("path")
const FormData = require("form-data")
const ytsr = require("@distube/ytsr")
const cheerio = require("cheerio")

const app = express()
app.use(express.json()) // To parse JSON bodies
const upload = multer({ dest: "uploads/" })

const downloadImage = async (url, dest) => {
  const writer = fs.createWriteStream(dest)
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  })

  response.data.pipe(writer)

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve)
    writer.on("error", reject)
  })
}

const searchYoutube = async (query) => {
  try {
    const searchResults = await ytsr(query, { safeSearch: true })
    const movie = searchResults.items[0]
    return {
      title: movie?.name || "No title found",
      thumbnail: movie?.thumbnail || "No thumbnail available",
      description: movie?.description || "No description available",
      duration: movie?.duration || "No duration available",
      views: movie?.views || "No duration available",
    }
  } catch (error) {
    console.error(`YouTube search failed: ${error.message}`)
    return { error: `YouTube search failed: ${error.message}` }
  }
}

// Utility function to extract the title from the URL
const extractTitleFromUrl = (url) => {
  console.log(url , "waqar")
  const match = url?.title
  return match
    ? match[1].replace(/\.(mp4|avi|mkv|mov|flv|wmv|webm)$/, "").trim()
    : "Untitled"
}

app.post("/api/upload", async (req, res) => {
  const {movies}  = req.body; // Expecting movieUrls array from the frontend
  if (!movies || !Array.isArray(movies)) {
    return res.status(400).json({ error: "Invalid or missing movieUrls array" });
  }

  // Extract titles from the provided URLs
  // const movieTitles = movies.map((url) => extractTitleFromUrl(url));
  // console.log("🚀 ~ app.post ~ movieTitles:", movieTitles);

  try {
    // Fetch all movies from the backend
    const allMoviesResponse = await axios.get(
      "https://backend.videosroom.com/public/api/all-movies"
    );
    const allMovies = allMoviesResponse?.data?.data;
    const responses = [];

    // Process each movie title in parallel
    await Promise.all(
      movies.map(async (movieTitle) => {
        // Match the title with backend movies data
        const matchedMovie = allMovies.find(
          (movie) => movie.title === movieTitle?.title
        );

        if (!matchedMovie) {
          console.log(`No match found for: ${movies}`);
          return;
        }

        const youtubeData = await searchYoutube(movies?.title);
        if (!youtubeData) {
          console.log(`No YouTube data found for: ${movieTitle}`);
          return;
        }

        const { title, description, duration, views, thumbnail } = youtubeData;
        const splash_img = matchedMovie?.splash_img; // Assuming splash_img comes from matched movie

        // Define paths for saving the images locally
        const thumbnailPath = path.join(
          __dirname,
          "uploads",
          `${movieTitle?.replace(/\s/g, "_")}_thumbnail.jpg`
        );
        const splashImgPath = path.join(
          __dirname,
          "uploads",
          `${movieTitle.replace(/\s/g, "_")}_splash.jpg`
        );

        // Download images (thumbnail and splash)
        await Promise.all([
          downloadImage(thumbnail, thumbnailPath),
          downloadImage(splash_img, splashImgPath),
        ]);

        // Prepare form data to send to the backend API
        const formData = new FormData();
        formData.append("title", title || "Untitled Movie");
        formData.append("description", description);
        formData.append("uploadBy", "admin");
        formData.append("duration", duration);
        formData.append("views", views);
        formData.append("thumbnail", fs.createReadStream(thumbnailPath));
        formData.append("images[]", fs.createReadStream(splashImgPath));

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

        // Clean up uploaded files
        fs.unlinkSync(thumbnailPath);
        fs.unlinkSync(splashImgPath);
      })
    );

    // Send response after all processing
    res.json(responses);
  } catch (error) {
    console.error("Error uploading files:", error.message);
    res.status(500).json({ error: "Error uploading files", message: error.message });
  }
});



const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
