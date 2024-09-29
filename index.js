const express = require("express")
const multer = require("multer")
const axios = require("axios")
const fs = require("fs")
const path = require("path")
const FormData = require("form-data")
const ytsr = require("@distube/ytsr")
const cheerio = require("cheerio")
const cors = require("cors")
const Youtube = require("youtubei.js") // Correct way to import

const app = express()
app.use(
  cors({
    origin: "http://localhost:5173", // Frontend's origin
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
)

app.use(express.json()) // To parse JSON bodies
process.env.YTSR_NO_UPDATE = "true"
const defaultThumbnailUrl =
  "https://n-lightenment.com/wp-content/uploads/2015/10/movie-night11.jpg" // Replace with your actual default image path

const upload = multer({ dest: "uploads/" })

const downloadImage = async (url, dest) => {
  const writer = fs.createWriteStream(dest)
  try {
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
  } catch (error) {
    console.error(`Error downloading image: ${error.message}`)
    // Default handling: If downloading the image fails, resolve anyway.
    return Promise.resolve()
  }
}

const searchYoutube = async (query) => {
  try {
    const searchResults = await ytsr(query, { safeSearch: true })
    const movie = searchResults.items[0]
    return {
      title: movie?.name || "No title found",
      thumbnail: movie?.thumbnail || null,
      description: movie?.description,
      duration: movie?.duration || "01:32:00",
      views: movie?.views || "0",
    }
  } catch (error) {
    console.error(`YouTube search failed: ${error.message}`)
    return { error: `YouTube search failed: ${error.message}` }
  }
}

const normalizeTitle = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
}

const uploadToStreamwish = async (movie) => {
  try {
    const streamWishUrl = `https://api.streamwish.com/api/upload/url?key=20445huibnrwap8ww1pp4&url=${movie}`
    const streamWishResponse = await axios.get(streamWishUrl)
    return streamWishResponse?.data
  } catch (streamWishError) {
    console.error(
      `StreamWish upload error for: ${movie?.title}`,
      streamWishError.message
    )
    throw new Error(`StreamWish upload failed for: ${movie?.title}`)
  }
}

const uploadToDoodli = async (movie) => {
  try {
    const doodliUrl = `https://doodapi.com/api/upload/url?key=455613j9vxgg2me3lk6wt7&url=${movie}`
    const doodliResponse = await axios.get(doodliUrl)
    return doodliResponse?.data
  } catch (Error) {
    console.error(`Doodli upload error for: ${movie?.title}`, Error.message)
    throw new Error(`Doodli upload failed for: ${movie?.title}`)
  }
}

// const uploadToUpstream = async (movie) => {
//   try {
//     const upstreamUrl = `https://upstream.to/api/upload/url?key=64637qwgzhzja5yhol5xk&url=${movie}`
//     const upstreamResponse = await axios.get(upstreamUrl)
//     return upstreamResponse?.data
//   } catch (Error) {
//     console.error(`Vidhide upload error for: ${movie?.title}`, Error.message)
//     throw new Error(`Vidhide upload failed for: ${movie?.title}`)
//   }
// }

const uploadToVidhide = async (movie) => {
  try {
    const vidHideUrl = `https://vidhideapi.com/api/upload/url?key=31076w3lc27ihj621zyb7&url=${movie}`
    const vidHideResponse = await axios.get(vidHideUrl)
    return vidHideResponse?.data
  } catch (Error) {
    console.error(`Vidhide upload error for: ${movie?.title}`, Error.message)
    throw new Error(`Vidhide upload failed for: ${movie?.title}`)
  }
}

// const uploadStreamTape = async (movie) => {
//   try {
//     const streamTapeUrl = `https://api.streamtape.com/remotedl/add?login=18363eb8d9f015d97121&key=d3362LPrbVckYkd&url=${movie}`
//     const streamTapeResponse = await axios.get(streamTapeUrl)
//     console.log("🚀 ~ uploadStreamTape ~ streamTapeResponse:", streamTapeResponse)
//     return streamTapeResponse?.data
//   } catch (Error) {
//     console.error(
//       `Stream Tape upload error for: ${movie?.title}`,
//       Error.message
//     )
//     throw new Error(`Stream Tape upload failed for: ${movie?.title}`)
//   }
// }

// Function to handle Mixdrop API upload
const uploadToMixdrop = async (file) => {
  try {
    const formData = new FormData()
    formData.append("email", "videosroomofficial@gmail.com")
    formData.append("key", "I0nHwRrugSJwRUl6ScSe")
    formData.append("file", fs.createReadStream(file.path), file.originalname)

    const response = await axios.post("https://ul.mixdrop.ag/api", formData, {
      headers: {
        ...formData.getHeaders(),
      },
    })
    return response.data
  } catch (error) {
    throw new Error(`Mixdrop upload failed: ${error.message}`)
  }
}

app.post("/api/remote", async (req, res) => {
  const { movies } = req.body
  if (!movies || !Array.isArray(movies)) {
    return res.status(400).json({ error: "Invalid or missing movies array" })
  }

  try {
    const allMoviesResponse = await axios.get(
      "https://backend.videosroom.com/public/api/all-movies"
    )
    const allMovies = allMoviesResponse?.data?.data || []
    const responses = []

    for (const movie of movies) {
      // Check if movie is already uploaded
      const matchedMovie = allMovies.find((m) => {
        const titleA = normalizeTitle(m?.title)
        const titleB = normalizeTitle(movie?.title)
        return (
          titleA === titleB ||
          titleA.includes(titleB) ||
          titleB.includes(titleA)
        )
      })

      if (matchedMovie) {
        return res.status(200).json({
          status: 1,
          error: "Movie Already Uploaded on Server",
          message: "Match Found",
          data: movie?.title,
        })
      }

      let streamWishData,
        doodliData,
        upStreamData,
        vidHideData,
        streamTapeData,
        youtubeData

      try {
        streamWishData = await uploadToStreamwish(movie.url) // Assuming movie has a file property
        responses.push({ service: "StreamWish", result: streamWishData })
      } catch (error) {
        console.error("Error uploading to StreamWish:", error.message)
      }

      // try {
      //   streamTapeData = await uploadStreamTape(movie.url) // Assuming movie has a file property
      //   responses.push({ service: "StreamTape", result: streamTapeData })
      // } catch (error) {
      //   console.error("Error uploading to Stream Tape:", error.message)
      // }

      // Upload to Doodli
      try {
        doodliData = await uploadToDoodli(movie.url)
        responses.push({
          service: "Doodapi",
          result: doodliData,
          messgae: doodliData?.msg,
        })
      } catch (error) {
        console.error("Error uploading to Doodapi:", error.message)
      }

      // try {
      //   upStreamData = await uploadToUpstream(movie.url)
      //   responses.push({ service: "Upstream", result: upStreamData })
      // } catch (error) {
      //   console.error("Error uploading to Upstream:", error.message)
      // }

      try {
        vidHideData = await uploadToVidhide(movie.url)
        responses.push({ service: "Vidhide", result: vidHideData })
      } catch (error) {
        console.error("Error uploading to Vidhide:", error.message)
      }
      try {
        youtubeData = await searchYoutube(movie.title)
        responses.push({ service: "YouTube", result: youtubeData })
      } catch (error) {
        console.error("Error uploading to Youtube:", error.message)
      }

      // Handle thumbnail
      const { title, description, duration, views, thumbnail } =
        youtubeData || {}
      const thumbnailUrl = thumbnail || defaultThumbnailUrl
      const thumbnailDir = path.join(__dirname, "thumbnails")

      // Ensure the directory exists before attempting to save the file
      if (!fs.existsSync(thumbnailDir)) {
        try {
          fs.mkdirSync(thumbnailDir, { recursive: true })
          console.log("Thumbnail directory created:", thumbnailDir)
        } catch (dirError) {
          console.error("Error creating thumbnail directory:", dirError.message)
          return res
            .status(500)
            .json({ error: "Failed to create thumbnail directory" })
        }
      }

      const sanitizedTitle = (title || "Untitled_Movie")
        .replace(/[^a-zA-Z0-9\s_-]/g, "") // Sanitize the title to remove special characters
        .replace(/\s+/g, "_") // Replace spaces with underscores

      const thumbnailPath = path.join(thumbnailDir, `${sanitizedTitle}.jpg`)

      try {
        await downloadImage(thumbnailUrl, thumbnailPath)
      } catch (downloadError) {
        console.error(
          `Error downloading thumbnail for: ${movie.title}. Using default thumbnail.`,
          downloadError.message
        )
      }

      // Prepare download and iframe links
      const download_link1 = movie?.url
      const iframe_link1 = movie?.url
      const download_link2 = `https://dood.li/d/${doodliData?.result?.filecode}`
      const iframe_link2 = `https://dood.li/e/${doodliData?.result?.filecode}`
      const download_link3 = `https://upstream.to/${upStreamData?.result?.filecode}`
      const iframe_link3 = `https://upstream.to/embed-${upStreamData?.result?.filecode}.html`
      const download_link4 = `https://vidhideplus.com/file/${vidHideData?.result?.filecode}`
      const iframe_link4 = `https://vidhideplus.com/embed/${vidHideData?.result?.filecode}`
      const download_link5 = `https://playerwish.com/f/${streamWishData?.result?.filecode}`
      const iframe_link5 = `https://playerwish.com/e/${streamWishData?.result?.filecode}`
      const download_link6 = `https://streamtape.com/v/${streamTapeData?.result?.id}`
      const iframe_link6 = `https://streamtape.com/e/${streamTapeData?.result?.id}`

      // Prepare form data for backend API
      const formData = new FormData()
      formData.append("title", title || "Untitled Movie")
      formData.append("description", description || title)
      formData.append("uploadBy", "admin")
      formData.append("duration", duration || "0")
      formData.append("views", views || "0")
      formData.append("download_link1", download_link1)
      formData.append("iframe_link1", iframe_link1)
      formData.append("download_link2", download_link2)
      formData.append("iframe_link2", iframe_link2)
      formData.append("download_link3", download_link3)
      formData.append("iframe_link3", iframe_link3)
      formData.append("download_link4", download_link4)
      formData.append("iframe_link4", iframe_link4)
      formData.append("download_link5", download_link5)
      formData.append("iframe_link5", iframe_link5)
      formData.append("download_link6", download_link6)
      formData.append("iframe_link6", iframe_link6)
      formData.append("thumbnail", fs.createReadStream(thumbnailPath)) // Send the downloaded thumbnail

      // Send movie data to backend API
      try {
        const addMovieResponse = await axios.post(
          "https://backend.videosroom.com/public/api/add-movie",
          formData,
          { headers: { ...formData.getHeaders() } }
        )

        responses.push({
          service: "Backend API",
          result: addMovieResponse.data,
        })
      } catch (addMovieError) {
        console.error("Error uploading to backend:", addMovieError.message)
      }
    }

    // Send all responses at once after processing all movies
    res.status(200).json(responses)
  } catch (error) {
    console.error("Error uploading files:", error.message)
    res
      .status(500)
      .json({ error: "Error uploading files", message: error.message })
  }
})

app.post("/api/upload", upload.array("files"), async (req, res) => {
  const files = req.files.length === 1 ? [req.files[0]] : req.files // Ensure files is always an array
  const responses = []

  try {
    for (const file of files) {
      const fileNameWithoutExt = file.originalname.replace(/\.[^/.]+$/, "") // Remove the extension
      console.log("🚀 ~ app.post ~ fileNameWithoutExt:", fileNameWithoutExt)
      try {
        const mixdropResponse = await uploadToMixdrop(file)
        responses.push({ service: "Mixdrop", result: mixdropResponse })
      } catch (error) {
        console.error("Error uploading to Mixdrop:", error.message)
        responses.push({ service: "Mixdrop", error: error.message })
      }

      // You can add more services or logic to handle other things here
    }
console.log(responses)
    // res.json(responses)
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error uploading files", message: error.message })
  } finally {
    // Clean up uploaded files after handling
    files.forEach((file) => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path)
      }
    })
  }
})
// ytsr('Binny and Family (2024) Hindi 360p', { safeSearch: true}).then(result => {
//     let movie = result.items[0];
//     console.log("🚀 ~ ytsr ~ movie:", movie)
//     console.log("🚀 ~ /ytsr ~ movie:", movie?.author?.name === "Spike Tv")
//     console.log("🚀 ~ /ytsr ~ movie:", movie?.author?.channelID === "UCsZdkgstWhCgJ6u9YOWZdbQ")
// });

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
