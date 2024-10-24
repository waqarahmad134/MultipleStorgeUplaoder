const express = require("express")
const multer = require("multer")
const axios = require("axios")
const fs = require("fs")
const path = require("path")
const FormData = require("form-data")
const ytsr = require("@distube/ytsr")
const cheerio = require("cheerio")
const cors = require("cors")
const { YouTube } = require("youtube-sr")
// const ImageSearch = require('image-search');
const youtubesearchapi = require("youtube-search-api")
const ytSearch = require("yt-search")
const Fuse = require("fuse.js")
const levenshtein = require("fast-levenshtein")
const puppeteer = require('puppeteer');
const playwright = require('playwright');
const { Builder, By, until } = require('selenium-webdriver');

const cron = require('node-cron');  // Import node-cron



const fetch = require("node-fetch")

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
  // Helper functions to convert between time string and seconds
  function timeToSeconds(time) {
    const parts = time.split(":")
    if (parts.length === 2) {
      // If the format is MM:SS, convert it accordingly
      return +parts[0] * 60 + +parts[1]
    } else if (parts.length === 3) {
      // If the format is HH:MM:SS, convert it to seconds
      return +parts[0] * 3600 + +parts[1] * 60 + +parts[2]
    }
    return 0 // Default to 0 if format is unrecognized
  }

  function secondsToTime(seconds) {
    const h = Math.floor(seconds / 3600)
      .toString()
      .padStart(2, "0")
    const m = Math.floor((seconds % 3600) / 60)
      .toString()
      .padStart(2, "0")
    const s = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0")
    return `${h}:${m}:${s}`
  }

  // Minimum and maximum durations in seconds
  const minDuration = timeToSeconds("01:30:00")
  const maxDuration = timeToSeconds("02:15:00")

  try {
    const searchResults = await ytsr(query, { safeSearch: true })
    const movie = searchResults.items[0]

    // Get movie duration in seconds, handling both MM:SS and HH:MM:SS formats
    const movieDuration = movie?.duration ? timeToSeconds(movie.duration) : 0

    // Check if the movie's duration is smaller than 01:10:00
    if (!movie.duration || movieDuration < minDuration) {
      // Generate a random duration between 01:10:00 and 01:45:00
      const randomDuration =
        Math.floor(Math.random() * (maxDuration - minDuration + 1)) +
        minDuration
      movie.duration = secondsToTime(randomDuration)
    } else {
      // If duration is valid and above 01:10:00, convert to HH:MM:SS if necessary
      movie.duration =
        movie.duration.length === 4 ? `00:${movie.duration}` : movie.duration
    }

    return {
      title: movie?.name || query,
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

const searchYoutubeNew = async (query) => {
  const searchOptions = {
    maxResults: 5,
  };

  try {
    const results = await youtubesearchapi.GetListByKeyword(query, searchOptions);
    const firstVideo = results?.items?.filter(data => data?.type === "video")
    const firstVideoId = firstVideo?.id;
    let videoDetails = {};
    if (firstVideoId) {
      try {
        videoDetails = await new Promise((resolve, reject) => {
          ytSearch({ videoId: firstVideoId }, (err, result) => {
            if (err) {
              console.error("Error fetching video details:", err);
              resolve({
                description: "Default description",
                timestamp: "00:00",
                views: 0,
                uploadDate: "2024-01-01",
              });
            } else {
              console.log("Video details result:", result);
              resolve(result);
            }
          });
        });
      } catch (detailError) {
        console.error("Error fetching video details:", detailError);
        videoDetails = {
          description: "Default description",
          timestamp: "00:00",
          views: 0,
          uploadDate: "2024-01-01",
        };
      }
    } else {
      // If no video found, set hardcoded default values
      videoDetails = {
        description: "No video found",
        timestamp: "00:00",
        views: 0,
        uploadDate: "2024-01-01",
      };
    }

    const videoData = {
      id: firstVideoId || "default-id",
      title: firstVideo?.title || "Default Title",
      thumbnail: firstVideo?.thumbnail?.thumbnails?.[0]?.url || "default-thumbnail-url",
      thumbnail1: firstVideo?.thumbnail?.thumbnails?.[1]?.url || "default-thumbnail-url-1",
      description: videoDetails?.description || "Default description",
      timestamp: videoDetails?.timestamp || "00:00",
      views: videoDetails?.views || 0,
      uploadDate: videoDetails?.uploadDate || "2024-01-01",
    };

    return videoData;
  } catch (err) {
    console.error("Error during YouTube search:", err);
    // Return hardcoded values when an error occurs
    return {
      id: "default-id",
      title: "Default Title",
      thumbnail: "default-thumbnail-url",
      thumbnail1: "default-thumbnail-url-1",
      description: "Default description",
      timestamp: "00:00",
      views: 0,
      uploadDate: "2024-01-01",
    };
  }
};

const normalizeTitle = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
}

const normalizeMixdropTitle = (title) => {
  return title
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,4}$/i, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
}

const uploadToStreamwish = async (movie, streamwishKey) => {
  try {
    const streamWishUrl = `https://api.streamwish.com/api/upload/url?key=${streamwishKey}&url=${movie}`
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

const uploadToDoodli = async (movie, doodliKey) => {
  try {
    const doodliUrl = `https://doodapi.com/api/upload/url?key=${doodliKey}&url=${movie}`
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

const uploadToVidhide = async (movie, vidhideKey) => {
  try {
    const vidHideUrl = `https://vidhideapi.com/api/upload/url?key=${vidhideKey}&url=${movie}`
    const vidHideResponse = await axios.get(vidHideUrl)
    return vidHideResponse?.data
  } catch (Error) {
    console.error(`Vidhide upload error for: ${movie?.title}`, Error.message)
    throw new Error(`Vidhide upload failed for: ${movie?.title}`)
  }
}

const uploadStreamTape = async (movie) => {
  try {
    const streamTapeUrl = `https://api.streamtape.com/remotedl/add?login=18363eb8d9f015d97121&key=d3362LPrbVckYkd&url=${movie}`
    const streamTapeResponse = await axios.get(streamTapeUrl)
    return streamTapeResponse?.data
  } catch (Error) {
    console.error(
      `Stream Tape upload error for: ${movie?.title}`,
      Error.message
    )
    throw new Error(`Stream Tape upload failed for: ${movie?.title}`)
  }
}

// Remote mixdrop
const remoteMixDrop = async (movie, mixEmail, mixKey) => {
  try {
    const remoteMixDropUrl = `https://api.mixdrop.ag/remoteupload?email=${mixEmail}&key=${mixKey}&url=${movie}`
    const remoteMixDropResponse = await axios.get(remoteMixDropUrl)
    return remoteMixDropResponse?.data
  } catch (Error) {
    console.error(`Mix drop upload error`, Error.message)
    throw new Error(`Mix Drop upload failed`)
  }
}

// Function to handle Mixdrop API upload
const uploadToMixdrop = async (file, mixEmail, mixKey) => {
  try {
    const formData = new FormData()
    formData.append("email", mixEmail)
    formData.append("key", mixKey)
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

const mixdropFileDetails = async (fileref, mixEmail, mixKey) => {
  try {
    const mixdropFile = `https://api.mixdrop.ag/fileinfo2?email=${mixEmail}&key=${mixKey}&ref[]=${fileref}`
    const mixdropFileResponse = await axios.get(mixdropFile)
    return mixdropFileResponse?.data
  } catch (Error) {
    console.error(`mixdrop file error for: ${fileref}`, Error.message)
    throw new Error(`mixdrop file failed for: ${fileref}`)
  }
}

app.post("/api/remoteMixdrop", async (req, res) => {
  const data = req.body
  let accountData
  if (typeof data?.accountData === "string") {
    try {
      accountData = JSON.parse(data?.accountData)
    } catch (error) {
      console.error("🚀 ~ JSON parse error:", error.message)
      return res.status(400).json({ message: "Invalid account data format" })
    }
  } else {
    accountData = data?.accountData
  }
  const mixEmail = accountData?.mixEmail
  const mixKey = accountData?.mixKey
  const doodliEmail = accountData?.doodliEmail
  const doodliKey = accountData?.doodliKey
  const vidhideEmail = accountData?.vidhideEmail
  const vidhideKey = accountData?.vidhideKey
  const streamwishEmail = accountData?.streamwishEmail
  const streamwishKey = accountData?.streamwishKey

  const remoteMovies = data?.movies?.plain
  const responses = []
  const matchedMovies = []
  try {
    for (const movie of remoteMovies) {
      try {
        let mixdropResponse = await remoteMixDrop(movie?.url, mixEmail, mixKey)
        if (mixdropResponse?.result?.msg === "Invalid login") {
          res.json({
            status: 1,
            message: "Invalid login",
          })
        }
        const fileref = mixdropResponse?.result?.fileref
        await new Promise((resolve) => setTimeout(resolve, 10000))
        let mixdropFinalResponse = await mixdropFileDetails(
          fileref,
          mixEmail,
          mixKey
        )
        const title = mixdropFinalResponse?.result?.[fileref]?.title
        responses.push({
          service: "Mixdrop",
          result: mixdropResponse,
          movie: movie?.title,
        })
        responses.push({
          service: "MixdropFileDetails",
          result: mixdropFinalResponse,
          movie: movie?.title,
          fileref: fileref,
          title: title,
        })
      } catch (error) {
        console.error(
          `Error uploading movie: ${movie?.title} to Mixdrop:`,
          error.message
        )
        responses.push({
          service: "Mixdrop",
          error: error.message,
          movie: movie?.title,
        })
      }
    }
  } catch (error) {
    console.error("Error uploading to Mixdrop:", error.message)
    responses.push({ service: "Mixdrop", error: error.message })
  }
  try {
    const allMoviesResponse = await axios.get(
      "https://backend.videosroom.com/public/api/all-movies"
    )
    const allMovies = allMoviesResponse?.data?.data || []
    for (const movie of remoteMovies) {
      let youtubeData
      const fileref = responses.find(
        (res) =>
          res.movie === movie?.title && res.service === "MixdropFileDetails"
      )?.fileref
      const title = responses.find(
        (res) =>
          res.movie === movie?.title && res.service === "MixdropFileDetails"
      )?.title
      const fileNameWithoutExt = title?.replace(/\.[^/.]+$/, "")
      if (fileNameWithoutExt) {
        try {
          youtubeData = await searchYoutubeNew(fileNameWithoutExt)
          responses.push({ service: "YouTube", result: youtubeData })
        } catch (error) {
          console.error("Error uploading to YouTube:", error.message)
        }
      } else {
        console.warn(
          `YouTube search failed for movie: ${movie?.title}. Title is undefined.`
        )
        continue
      }

      const matchedMovie = allMovies.find((m) => {
        const titleA = normalizeTitle(m?.title)
        const titleB = normalizeTitle(fileNameWithoutExt)
        return (
          titleA === titleB ||
          titleA.includes(titleB) ||
          titleB.includes(titleA)
        )
      })

      if (matchedMovie) {
        matchedMovies.push({
          status: 1,
          error: "Movie Already Uploaded on Server",
          message: "Match Found",
          data: movie?.title,
        })
        continue
      }

      const {
        title: ytTitle,
        description,
        duration,
        views,
        thumbnail,
        timestamp,
        uploadDate,
      } = youtubeData

      const thumbnailUrl = thumbnail || defaultThumbnailUrl
      const thumbnailDir = path.join(__dirname, "thumbnails")

      if (!fs.existsSync(thumbnailDir)) {
        try {
          fs.mkdirSync(thumbnailDir, { recursive: true })
        } catch (dirError) {
          console.error("Error creating thumbnail directory:", dirError.message)
          return res
            .status(500)
            .json({ error: "Failed to create thumbnail directory" })
        }
      }

      const sanitizedTitle = (title || ytTitle)
        .replace(/[^a-zA-Z0-9\s_-]/g, "") // Sanitize the title to remove special characters
        .replace(/\s+/g, "_") // Replace spaces with underscores

      const thumbnailPath = path.join(thumbnailDir, `${title}.jpg`)

      try {
        await downloadImage(thumbnailUrl, thumbnailPath)
      } catch (downloadError) {
        console.error(
          `Error downloading thumbnail for: ${title}. Using default thumbnail.`,
          downloadError.message
        )
      }

      const formData = new FormData()
      formData.append("title", fileNameWithoutExt || ytTitle)
      formData.append(
        "meta_description",
        description?.substring(0, 100) || fileNameWithoutExt || ytTitle
      )
      formData.append(
        "description",
        description || fileNameWithoutExt || ytTitle
      )
      formData.append("uploadBy", "admin")
      formData.append("duration", timestamp || "1:30:32")
      formData.append("year", uploadDate || "0")
      formData.append("views", views || "0")
      formData.append("download_link1", movie?.url)
      formData.append("iframe_link1", movie?.url)
      formData.append("thumbnail", fs.createReadStream(thumbnailPath))
      data?.selectedCategories.forEach((id) =>
        formData.append("category_ids[]", id)
      )

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

    responses.push({ service: "All Movies Check", result: matchedMovies })
    res.json({
      status: 1,
      message: "File processing completed",
      matchedMovies,
      responses,
    })
  } catch (error) {
    console.error(
      "Error fetching movies or checking for duplicates:",
      error.message
    )
    responses.push({ service: "All Movies Check", error: error.message })
    if (!res.headersSent) {
      res.json({ status: 0, message: "Error processing files", responses })
    }
  }
})


// first simple atempt 
// async function getVideoSrc() {
//   // Fetch the list of all movies from the API
//   const allMoviesResponse = await axios.get("https://backend.videosroom.com/public/api/all-movies");
//   const allMovies = allMoviesResponse?.data?.data;
//   const movies = [
//     {
//       id: allMovies?.[0]?.id,
//       title: allMovies?.[0]?.title,
//       description: allMovies?.[0]?.description,
//       year: allMovies?.[0]?.year,
//       doodliLink: allMovies?.[0]?.download_link2?.replace('/d/', '/e/'),
//       streamTapeLink: allMovies?.[0]?.download_link3?.replace('/v/', '/e/'),
//       poopupLink: allMovies?.[0]?.download_link4?.replace('/d/', '/e/'),
//       veevLink: allMovies?.[0]?.download_link5?.replace('/d/', '/e/'),
//     }
//   ];
//   const driver = await new Builder().forBrowser('chrome').build();
//   for (const movie of movies) {
//     const formData = new FormData();
//     try {
//       await driver.get(movie.doodliLink);
//       await driver.wait(until.elementLocated(By.css('video#video_player_html5_api')), 10000);
//       const videoElement = await driver.findElement(By.css('video#video_player_html5_api'));
//       const videoSrc = await videoElement.getAttribute('src');
//       console.log("🚀 ~ getVideoSrc ~ videoSrc:", typeof videoSrc)
//       if (videoSrc) {
//         formData.append("title", movie?.title);
//         formData.append("description", movie?.description);
//         formData.append("iframe_link2", videoSrc);
//         try {
//           const addMovieResponse = await axios.post(
//             `https://backend.videosroom.com/public/api/update-movie/${movie.id}`,
//             formData,
//             { headers: { ...formData.getHeaders() } }
//           );
//           console.log("🚀 ~ getVideoSrc ~ addMovieResponse:", addMovieResponse)
//         } catch (addMovieError) {
//           console.error("Error uploading to backend:", addMovieError.message);
//         }
//       } else {
//         console.log('No <video> tag found on the page.');
//       }
//     } catch (error) {
//       console.error('Error:', error);
//     }
//   }
//   await driver.quit();
// }




// async function getVideoSrc() {
//   // Fetch the list of all movies from the API
//   const allMoviesResponse = await axios.get("https://backend.videosroom.com/public/api/all-movies");
//   const allMovies = allMoviesResponse?.data?.data;

//   const movies = allMovies?.map(movie => ({
//     id: movie?.id,
//     title: movie?.title,
//     description: movie?.description,
//     year: movie?.year,
//     doodliLink: movie?.download_link2?.replace('/d/', '/e/'),
//     streamTapeLink: movie?.download_link3?.replace('/v/', '/e/'),
//     poopupLink: "https://poophd.com/view/edbp8o5233z4",
//     // veevLink: movie?.download_link5?.replace('/d/', '/e/')
//   }));

//   // Initialize the Chrome driver
//   const driver = await new Builder().forBrowser('chrome').build();

//   // Function to fetch video source from a link
//   async function fetchVideoSrc(link) {
//     if (!link) return null; // Skip if the link is not available
//     try {
//       await driver.get(link);

//       let videoSrc = null;
//       const maxAttempts = 50;  // Set a max number of attempts to check for video src
//       let attempts = 0;

//       // Wait dynamically until the video source is found or maxAttempts reached
//       while (attempts < maxAttempts) {
//         try {
//           // Find the <video> tag on the page (without specific ID)
//           const videoElement = await driver.findElement(By.css('video'));
//           videoSrc = await videoElement.getAttribute('src');
//           if (videoSrc) {
//             console.log(`🚀 Found video source: ${videoSrc}`);
//             return videoSrc;
//           }
//         }catch (err) {
//           // Element not found, keep checking until maxAttempts
//         }

//         // Wait for 200ms before trying again
//         await new Promise(resolve => setTimeout(resolve, 200));
//         attempts++;
//       }

//       console.log(`No <video> tag found or no src for link: ${link}`);
//       return null;
//     } catch (error) {
//       console.error(`Error fetching video source for link: ${link}`, error);
//       return null;
//     }
//   }

//   // Iterate over each movie and collect all video sources
//   for (const movie of movies) {
//     const formData = new FormData();
//     const fieldsAdded = {};  // Track which fields are added

//     formData.append("title", movie?.title);
//     formData.append("description", movie?.description);

//     const doodliSrc = await fetchVideoSrc(movie?.doodliLink);
//     const streamTapeSrc = await fetchVideoSrc(movie?.streamTapeLink);
//     const poopupSrc = await fetchVideoSrc(movie?.poopupLink);
//     // const veevSrc = await fetchVideoSrc(movie?.veevLink);

//     if (doodliSrc) {
//       formData.append("iframe_link2", doodliSrc);
//       fieldsAdded['iframe_link2'] = true;
//     }
//     if (streamTapeSrc) {
//       formData.append("iframe_link3", streamTapeSrc);
//       fieldsAdded['iframe_link3'] = true;
//     }
//     if (poopupSrc) {
//       formData.append("iframe_link4", poopupSrc);
//       fieldsAdded['iframe_link4'] = true;
//     }
//     // if (veevSrc) {
//     //   formData.append("iframe_link5", veevSrc);
//     //   fieldsAdded['iframe_link5'] = true;
//     // }

//     // Only hit the API after gathering all the links
//     if (Object.keys(fieldsAdded).length > 0) {
//       try {
//         const addMovieResponse = await axios.post(
//           `https://backend.videosroom.com/public/api/update-movie/${movie.id}`,
//           formData,
//           { headers: { ...formData.getHeaders() } }
//         );
//         console.log(`🚀 Successfully submitted all links for movie: ${movie.title}`, addMovieResponse.data);
//       } catch (addMovieError) {
//         console.error(`Error submitting all links for ${movie.title}:`, addMovieError.message);
//       }
//     } else {
//       console.log(`No video sources found for movie: ${movie.title}`);
//     }
//   }

//   await driver.quit();
// }

async function getVideoSrc() {
  // Fetch the list of all movies from the API
  const allMoviesResponse = await axios.get("https://backend.videosroom.com/public/api/all-movies");
  const allMovies = allMoviesResponse?.data?.data;

  const movies = allMovies?.map(movie => ({
    id: movie?.id,
    title: movie?.title,
    description: movie?.description,
    year: movie?.year,
    doodliLink: movie?.download_link2?.replace('/d/', '/e/'),
    streamTapeLink: movie?.download_link3?.replace('/v/', '/e/'),
    poopupLink: "https://poophd.com/view/edbp8o5233z4",
    veevLink: movie?.download_link5?.replace('/d/', '/e/')
  }));

  // Initialize the Chrome driver
  const driver = await new Builder().forBrowser('chrome').build();

  // Function to fetch video source from a link
  async function fetchVideoSrc(link, isVeev = false) {
    if (!link) return null; // Skip if the link is not available
    try {
      await driver.get(link);

      let videoSrc = null;
      const maxAttempts = 2;  // Set a max number of attempts to check for video src
      let attempts = 0;

      // First, attempt to find a generic <video> tag
      while (attempts < maxAttempts) {
        try {
          // If it's a veevLink, check for <source> tag inside <video>
          if (isVeev) {
            const sourceElement = await driver.findElement(By.css('video > source'));
            videoSrc = await sourceElement.getAttribute('src');
            if (videoSrc) {
              console.log(`🚀 Found video source (inside <source> tag): ${videoSrc}`);
              return videoSrc;
            }
          } else {
            // For other links, check directly for <video> tag
            const videoElement = await driver.findElement(By.css('video'));
            videoSrc = await videoElement.getAttribute('src');
            if (videoSrc) {
              console.log(`🚀 Found video source (generic <video>): ${videoSrc}`);
              return videoSrc;
            }
          }
        } catch (err) {
          // Element not found, keep checking until maxAttempts
        }

        // Wait for 200ms before trying again
        await new Promise(resolve => setTimeout(resolve, 200));
        attempts++;
      }

      // If not found, try specifically with #video_player_html5_api (if not veevLink)
      if (!isVeev) {
        console.log('Generic <video> not found, trying with #video_player_html5_api...');
        try {
          const videoElement = await driver.wait(
            until.elementLocated(By.css('video#video_player_html5_api')),
            10000 // 10 seconds max wait
          );
          videoSrc = await videoElement.getAttribute('src');
          if (videoSrc) {
            console.log(`🚀 Found video source (#video_player_html5_api): ${videoSrc}`);
            return videoSrc;
          }
        } catch (error) {
          console.log(`No <video> or #video_player_html5_api found for link: ${link}`);
        }
      }

      return null;
    } catch (error) {
      console.error(`Error fetching video source for link: ${link}`, error);
      return null;
    }
  }

  // Iterate over each movie and collect all video sources
  for (const movie of movies) {
    const formData = new FormData();
    const fieldsAdded = {};  // Track which fields are added

    formData.append("title", movie?.title);
    formData.append("description", movie?.description);

    const doodliSrc = await fetchVideoSrc(movie?.doodliLink);
    const streamTapeSrc = await fetchVideoSrc(movie?.streamTapeLink);
    const poopupSrc = await fetchVideoSrc(movie?.poopupLink);
    const veevSrc = await fetchVideoSrc(movie?.veevLink, true);  // Pass 'true' to handle <source> tag

    if (doodliSrc) {
      formData.append("iframe_link2", doodliSrc);
      fieldsAdded['iframe_link2'] = true;
    }
    if (streamTapeSrc) {
      formData.append("iframe_link3", streamTapeSrc);
      fieldsAdded['iframe_link3'] = true;
    }
    if (poopupSrc) {
      formData.append("iframe_link4", poopupSrc);
      fieldsAdded['iframe_link4'] = true;
    }
    if (veevSrc) {
      formData.append("iframe_link5", veevSrc);
      fieldsAdded['iframe_link5'] = true;
    }

    // Only hit the API after gathering all the links
    if (Object.keys(fieldsAdded).length > 0) {
      try {
        const addMovieResponse = await axios.post(
          `https://backend.videosroom.com/public/api/update-movie/${movie.id}`,
          formData,
          { headers: { ...formData.getHeaders() } }
        );
        console.log(`🚀 Successfully submitted all links for movie: ${movie.title}`, addMovieResponse.data);
      } catch (addMovieError) {
        console.error(`Error submitting all links for ${movie.title}:`, addMovieError.message);
      }
    } else {
      console.log(`No video sources found for movie: ${movie.title}`);
    }
  }

  await driver.quit();
}



// cron.schedule('0 */4 * * *', () => {
//   console.log('Running cron job to fetch video src...');
//   getVideoSrc();
// });

getVideoSrc();

// cron.schedule('*/30 * * * * *', () => {
//   console.log('Running cron job to fetch video src...');
//   getVideoSrc('https://dood.li/e/jyhuq2t7rrhw');  // Provide the URL here
// });


const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
