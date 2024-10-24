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

async function getVideoSrc(req, res) {
  const slug = req?.params?.slug;
  if (!slug) {
    return res.status(400).json({ message: 'Slug parameter is missing' });
  }
  try {
    const response = await axios.get(`https://backend.videosroom.com/public/api/movie/${slug}`);
    const videoData = response?.data?.data;
    if (!videoData) {
      return res.status(404).json({ message: 'Movie data not found' });
    }
    res.status(200).json({ videoSrc: videoData });
  } catch (error) {
    console.error('Error fetching video data:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
}


// Define the API route
app.get('/getVideoSrc/:slug', async (req, res) => {
  const slug = req.params.slug; // Extract slug from request parameters

  if (!slug) {
    return res.status(400).json({ message: 'Slug parameter is missing' });
  }

  try {
    // Fetch video data from the backend API
    const response = await axios.get(`https://backend.videosroom.com/public/api/movie/${slug}`);
    
    // Extract video source from the response data
    const updatedAt = response?.data?.data?.updated_at;

    if (!updatedAt) {
      return res.status(404).json({ message: 'Movie data not found' });
    }

    // Calculate the difference between current time and `updated_at`
    const currentTime = new Date();
    const updatedTime = new Date(updatedAt);
    
    // Calculate the difference in hours
    const timeDifference = Math.abs(currentTime - updatedTime) / 36e5; // 36e5 is the scientific notation for 60 * 60 * 1000 (milliseconds in an hour)

    // Check if the time difference is more than 6 hours
    if (timeDifference > 6) {
      return res.status(200).json({ message: "It's been more than 6 hours, you have to work more" });
    } else {
      return res.status(200).json({ message: "No need to work, less than 6 hours" });
    }
    
  } catch (error) {
    console.error('Error fetching video data:', error.message);
    res.status(500).json({ message: 'Internal server error' });
  }
});





  // const driver = await new Builder().forBrowser("chrome").build()

  // // Function to fetch video source from a link
  // async function fetchVideoSrc(link, isVeev = false) {
  //   if (!link) return null // Skip if the link is not available
  //   try {
  //     await driver.get(link)

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
