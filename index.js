const express = require("express")
const axios = require("axios")
const FormData = require("form-data")
const cors = require("cors")
const { Builder, By, until } = require("selenium-webdriver")
const fetch = require("node-fetch")
const app = express()
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
)
app.use(express.json())

app.get("/getVideoSrc/:slug", async (req, res) => {
  const slug = req.params.slug
  if (!slug) {
    return res.status(400).json({ message: "Slug parameter is missing" })
  }
  let driver
  try {
    const response = await axios.get(
      `https://backend.videosroom.com/public/api/movie/${slug}`
    )
    const updatedAt = response?.data?.data?.updated_at
    const data = response?.data?.data
    if (!updatedAt) {
      return res.status(404).json({ message: "Movie data not found" })
    }
    const currentTime = new Date()
    const updatedTime = new Date(updatedAt)
    const timeDifference =
      Math.abs(currentTime - updatedTime) / (1000 * 60 * 60)
    if (timeDifference > 6) {
      const doodliLink = data?.download_link2?.replace("/d/", "/e/")

      driver = await new Builder().forBrowser("chrome").build()
      await driver.get(doodliLink)
      try {
        const videoElement = await driver.wait(
          until.elementLocated(By.css("video#video_player_html5_api")),
          10000 // 10 seconds max wait
        )

        const videoSrc = await videoElement.getAttribute("src")

        if (videoSrc) {
          const formData = new FormData()
          formData.append("title", data?.title || "") // Ensure no undefined values
          formData.append("description", data?.description || "")
          formData.append("iframe_link2", videoSrc)
          formData.append("year", data?.year || "") // Default to empty if not provided
          formData.append("uploadBy", "admin")
          formData.append("views", data?.views || "0")

          // Optional: Log the form data for debugging (consider removing this in production)
          console.log("🚀 ~ FormData being sent:", {
            title: data?.title,
            description: data?.description,
            iframe_link2: videoSrc,
            year: data?.year,
            uploadBy: "admin",
            views: data?.views || "0",
          })

          // Sending the POST request to update the movie
          const addMovieResponse = await axios.post(
            `https://backend.videosroom.com/public/api/update-movie/${data.id}`,
            formData,
            { headers: { ...formData.getHeaders() } }
          )

          console.log("🚀 ~ addMovieResponse:", addMovieResponse.data) // Log the response data
          return res
            .status(200)
            .json({ addMovieResponse: addMovieResponse.data, videoSrc })
        } else {
          return res.status(404).json({ message: "Video source not found" })
        }
      } catch (error) {
        console.error(
          "Error processing video source or sending data:",
          error.message
        )
        return res
          .status(500)
          .json({ message: "Error processing video source or sending data" })
      }
    } else {
      return res
        .status(200)
        .json({ message: "No need to work, less than 6 hours" })
    }
  } catch (error) {
    console.error("Error fetching movie data:", error.message)
    return res.status(500).json({ message: "Internal server error" })
  } finally {
    // Ensure the driver is quit in case of errors or if it was initialized
    if (driver) {
      try {
        await driver.quit()
      } catch (quitError) {
        console.error("Error quitting the driver:", quitError.message)
      }
    }
  }
})

// // Function to fetch video source from a link
// async function fetchVideoSrc(link, isVeev = false) {
//   if (!link) return null // Skip if the link is not available
//   try {

//     let videoSrc = null
//     const maxAttempts = 2 // Set a max number of attempts to check for video src
//     let attempts = 0

//     // First, attempt to find a generic <video> tag
//     while (attempts < maxAttempts) {
//       try {
//         // If it's a veevLink, check for <source> tag inside <video>
//         if (isVeev) {
//           const sourceElement = await driver.findElement(
//             By.css("video > source")
//           )
//           videoSrc = await sourceElement.getAttribute("src")
//           if (videoSrc) {
//             console.log(
//               `🚀 Found video source (inside <source> tag): ${videoSrc}`
//             )
//             return videoSrc
//           }
//         } else {
//           // For other links, check directly for <video> tag
//           const videoElement = await driver.findElement(By.css("video"))
//           videoSrc = await videoElement.getAttribute("src")
//           if (videoSrc) {
//             console.log(
//               `🚀 Found video source (generic <video>): ${videoSrc}`
//             )
//             return videoSrc
//           }
//         }
//       } catch (err) {
//         // Element not found, keep checking until maxAttempts
//       }

//       // Wait for 200ms before trying again
//       await new Promise((resolve) => setTimeout(resolve, 200))
//       attempts++
//     }

//     // If not found, try specifically with #video_player_html5_api (if not veevLink)
//     if (!isVeev) {
//       console.log(
//         "Generic <video> not found, trying with #video_player_html5_api..."
//       )
//       try {
//     await driver.get(link)
//         const videoElement = await driver.wait(
//           until.elementLocated(By.css("video#video_player_html5_api")),
//           10000 // 10 seconds max wait
//         )
//         videoSrc = await videoElement.getAttribute("src")
//         if (videoSrc) {
//           console.log(
//             `🚀 Found video source (#video_player_html5_api): ${videoSrc}`
//           )
//           return videoSrc
//         }
//       } catch (error) {
//         console.log(
//           `No <video> or #video_player_html5_api found for link: ${link}`
//         )
//       }
//     }

//     return null
//   } catch (error) {
//     console.error(`Error fetching video source for link: ${link}`, error)
//     return null
//   }
// }

// Iterate over each movie and collect all video sources

//     const formData = new FormData()
//     const fieldsAdded = {} // Track which fields are added

//     formData.append("title", movie?.title)
//     formData.append("description", movie?.description)

//     const doodliSrc = await fetchVideoSrc(movie?.doodliLink)

//     if (doodliSrc) {
//       formData.append("iframe_link2", doodliSrc)
//       fieldsAdded["iframe_link2"] = true
//     }

//       try {
//         const addMovieResponse = await axios.post(
//           `https://backend.videosroom.com/public/api/update-movie/${movie.id}`,
//           formData,
//           { headers: { ...formData.getHeaders() } }
//         )
//         console.log(
//           `🚀 Successfully submitted all links for movie: ${movie.title}`,
//           addMovieResponse.data
//         )
//       } catch (addMovieError) {
//         console.error(
//           `Error submitting all links for ${movie.title}:`,
//           addMovieError.message
//         )
//       }

//   }

//   await driver.quit()
// }

// cron.schedule('0 */4 * * *', () => {
//   console.log('Running cron job to fetch video src...');
//   getVideoSrc();
// });

// getVideoSrc()

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
