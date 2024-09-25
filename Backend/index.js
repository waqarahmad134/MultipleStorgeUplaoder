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
      description: movie?.description,
      duration: movie?.duration || "01:32:00",
      views: movie?.views || "0",
    }
  } catch (error) {
    console.error(`YouTube search failed: ${error.message}`)
    return { error: `YouTube search failed: ${error.message}` }
  }
}

// Utility function to extract the title from the URL
const extractTitleFromUrl = (url) => {
  console.log(url, "waqar")
  const match = url?.title
  return match
    ? match[1].replace(/\.(mp4|avi|mkv|mov|flv|wmv|webm)$/, "").trim()
    : "Untitled"
}

app.post("/api/upload", async (req, res) => {
  const { movies } = req.body
  if (!movies || !Array.isArray(movies)) {
    return res.status(400).json({ error: "Invalid or missing movieUrls array" })
  }
  try {
    const allMoviesResponse = await axios.get(
      "https://backend.videosroom.com/public/api/all-movies"
    )
    const allMovies = allMoviesResponse?.data?.data || []
    const responses = []
    await Promise.all(
      movies.map(async (movie) => {
        const matchedMovie = allMovies.find((m) => m.title === movie.title)
        console.log("🚀 ~ movies.map ~ matchedMovie:", matchedMovie)

        if (!matchedMovie) {
          console.log(`No match found for: ${movie.title}`)
          
        }

        const youtubeData = await searchYoutube(movie.title)
        if (!youtubeData) {
          console.log(`No YouTube data found for: ${movie.title}`)
        }

        const { title, description, duration, views, thumbnail } = youtubeData
        const formData = new FormData()
        formData.append("title", title || "Untitled Movie")
        formData.append("description", description || title)
        formData.append("uploadBy", "admin")
        formData.append("duration", duration)
        formData.append("views", views || "0")

        // Send movie data to backend API
        const addMovieResponse = await axios.post(
          "https://backend.videosroom.com/public/api/add-movie",
          formData,
          { headers: { ...formData.getHeaders() } }
        )

        responses.push({
          service: "Backend API",
          result: addMovieResponse.data,
        })
      })
    )
    res.json(responses)
  } catch (error) {
    console.error("Error uploading files:", error.message)
    res
      .status(500)
      .json({ error: "Error uploading files", message: error.message })
  }
})

const searchResults = await ytsr("Pushpa and his way of working _ Pushpa_ The rise _ AlluArjun's best dialogue _ Amazon Prime Video (1080p, h264)", { safeSearch: true })
const movie = searchResults
console.log("🚀 ~ movie:", movie)

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
