const express = require("express")
const multer = require("multer")
const axios = require("axios")
const fs = require("fs")
const path = require("path")
const FormData = require("form-data")
const ytsr = require("@distube/ytsr")
const cheerio = require("cheerio")

const app = express()
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

app.post("/api/upload", async (req, res) => {

  const allMoviesResponse = await axios.get('https://backend.videosroom.com/public/api/all-movies');
  console.log("🚀 ~ app.post ~ allMoviesResponse:", allMoviesResponse)
  const responses = []

  try {
    await Promise.all(
      files.map(async (file) => {
        const fileNameWithoutExt = file.originalname.replace(/\.[^/.]+$/, "")
        try {
          const [ youtubeData] = await Promise.all([
            searchYoutube(fileNameWithoutExt),
          ])
          responses.push(
            { service: "YouTube", result: youtubeData }
          )
          
          const splash_img = doodapiResponse?.result?.[0]?.splash_img

          const title = youtubeData.title || "Untitled Movie"
          const description = youtubeData.description
          const duration = youtubeData.duration
          const views = youtubeData.views
          const thumbnailUrl = youtubeData.thumbnail

          // Download images
          const thumbnailPath = path.join(
            __dirname,
            "uploads",
            `${fileNameWithoutExt}_thumbnail.jpg`
          )
          const splashImgPath = path.join(
            __dirname,
            "uploads",
            `${fileNameWithoutExt}_splash.jpg`
          )

          await Promise.all([
            downloadImage(thumbnailUrl, thumbnailPath),
            downloadImage(splash_img, splashImgPath),
          ])

          // Send movie data to backend API
          const formData = new FormData()
          formData.append("title", title)
          formData.append("description", description)
          formData.append("uploadBy", "admin")
          formData.append("duration", duration)
          formData.append("views", views)
          formData.append("thumbnail", fs.createReadStream(thumbnailPath))
          formData.append("images[]", fs.createReadStream(splashImgPath))

          
          
          const addMovieResponse = await axios.post(
            "https://backend.videosroom.com/public/api/add-movie",
            formData,
            { headers: { ...formData.getHeaders() } }
          )

          responses.push({
            service: "Backend API",
            result: addMovieResponse.data,
          })
          fs.unlinkSync(thumbnailPath)
          fs.unlinkSync(splashImgPath)
        } catch (error) {
          console.error("Error processing file:", error.message)
        }
      })
    )

    res.json(responses)
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error uploading files", message: error.message })
  } finally {
    files.forEach((file) => fs.unlinkSync(file.path))
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
