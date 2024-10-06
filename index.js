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

const doodliKey = "434272nxlae3r22329ia88"
const streamwishKey = "19211xt467prybty85xsy"


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
    const parts = time.split(':');
    if (parts.length === 2) {
      // If the format is MM:SS, convert it accordingly
      return (+parts[0]) * 60 + (+parts[1]);
    } else if (parts.length === 3) {
      // If the format is HH:MM:SS, convert it to seconds
      return (+parts[0]) * 3600 + (+parts[1]) * 60 + (+parts[2]);
    }
    return 0; // Default to 0 if format is unrecognized
  }

  function secondsToTime(seconds) {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  // Minimum and maximum durations in seconds
  const minDuration = timeToSeconds('01:10:00');
  const maxDuration = timeToSeconds('01:45:00');

  try {
    const searchResults = await ytsr(query, { safeSearch: true });
    const movie = searchResults.items[0];

    // Get movie duration in seconds, handling both MM:SS and HH:MM:SS formats
    const movieDuration = movie?.duration ? timeToSeconds(movie.duration) : 0;

    // Check if the movie's duration is smaller than 01:10:00
    if (!movie.duration || movieDuration < minDuration) {
      // Generate a random duration between 01:10:00 and 01:45:00
      const randomDuration = Math.floor(Math.random() * (maxDuration - minDuration + 1)) + minDuration;
      movie.duration = secondsToTime(randomDuration);
    } else {
      // If duration is valid and above 01:10:00, convert to HH:MM:SS if necessary
      movie.duration = movie.duration.length === 4 ? `00:${movie.duration}` : movie.duration;
    }

    console.log(movie?.duration, movie?.views);

    return {
      title: movie?.name || query,
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
    .trim()
}

const normalizeMixdropTitle = (title) => {
  return title
  .toLowerCase()
  .replace(/\.[a-z0-9]{2,4}$/i, "")
  .replace(/[^a-z0-9\s]/g, "")
  .trim();
}



const uploadToStreamwish = async (movie) => {
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

const uploadToDoodli = async (movie) => {
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
const remoteMixDrop = async (movie) => {
  try {
    const remoteMixDropUrl = `https://api.mixdrop.ag/remoteupload?email=videosroomofficial@gmail.com&key=I0nHwRrugSJwRUl6ScSe&url=${movie}`
    const remoteMixDropResponse = await axios.get(remoteMixDropUrl)
    return remoteMixDropResponse?.data
  } catch (Error) {
    console.error(`Mix drop upload error`,Error.message)
    throw new Error(`Mix Drop upload failed`)
  }
}

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
    console.log("🚀 ~ uploadToMixdrop ~ response.data:", response.data)
    return response.data
  } catch (error) {
    throw new Error(`Mixdrop upload failed: ${error.message}`)
  }
}

const mixdropFileDetails = async (fileref) => {
  try {
    const mixdropFile = `https://api.mixdrop.ag/fileinfo2?email=videosroomofficial@gmail.com&key=I0nHwRrugSJwRUl6ScSe&ref[]=${fileref}`
    const mixdropFileResponse = await axios.get(mixdropFile)
    return mixdropFileResponse?.data
  } catch (Error) {
    console.error(`mixdrop file error for: ${fileref}`, Error.message)
    throw new Error(`mixdrop file failed for: ${fileref}`)
  }
}

app.post("/api/remote", async (req, res) => {
  const data  = req.body
  const movies = data?.movies?.titled
  const remoteMovies = data?.movies?.plain

  if (remoteMovies?.length > 0) {
    const responses = [];
    const matchedMovies = [];
    try {
      for (const movie of remoteMovies) {
        try {
          let mixdropResponse = await remoteMixDrop(movie?.url);
          const fileref = mixdropResponse?.result?.fileref
          await new Promise((resolve) => setTimeout(resolve, 5000)); 
          let mixdropFinalResponse = await mixdropFileDetails(fileref);          
          responses.push({ service: "Mixdrop", result: mixdropResponse, movie: movie?.title });
          responses.push({ service: "MixdropFileDetails", result: mixdropFinalResponse, movie: movie?.title , fileref : fileref });
        } catch (error) {
          console.error(`Error uploading movie: ${movie?.title} to Mixdrop:`, error.message);
          responses.push({ service: "Mixdrop", error: error.message, movie: movie?.title });
        }
      }
    } catch (error) {
      console.error("Error uploading to Mixdrop:", error.message);
      responses.push({ service: "Mixdrop", error: error.message });
    }
    const fileref = responses.find(res =>res.service === "MixdropFileDetails")?.fileref
    const title =  responses.find(res =>res.service === "MixdropFileDetails")?.result?.result?.[fileref]?.title
    console.log("🚀 ~ app.post ~ title:", title)
    
    
    try {
      // Second block: Fetching all movies from backend and checking for duplicates
      const allMoviesResponse = await axios.get(
        "https://backend.videosroom.com/public/api/all-movies"
      );
      const allMovies = allMoviesResponse?.data?.data || [];
  
      for (const movie of remoteMovies) {
        const matchedMovie = allMovies.find((m) => {
          const titleA = normalizeTitle(m?.title);
          const titleB = normalizeTitle(title);
          return (
            titleA === titleB ||
            titleA.includes(titleB) ||
            titleB.includes(titleA)
          );
        });
  
        if (matchedMovie) {
          matchedMovies.push({
            status: 1,
            error: "Movie Already Uploaded on Server",
            message: "Match Found",
            data: movie?.title,
          });
          continue; // Skip to the next movie if a match is found
        }
      }
  
      // Add a response for the matched movies check
      responses.push({ service: "All Movies Check", result: matchedMovies });
    } catch (error) {
      console.error("Error fetching movies or checking for duplicates:", error.message);
      responses.push({ service: "All Movies Check", error: error.message });
    }
  
    // Return the responses as a JSON object
    return res.json({ responses });
  }

  __________
  
  // Movies with title 
  if (!movies || !Array.isArray(movies)) {
    return res.status(400).json({ error: "Invalid or missing movies array" })
  }

  try {
    const allMoviesResponse = await axios.get(
      "https://backend.videosroom.com/public/api/all-movies"
    )
    const allMovies = allMoviesResponse?.data?.data || []
    const responses = []
    const matchedMovies = []

    for (const movie of movies) {
      let streamWishData,
        doodliData,
        upStreamData,
        vidHideData,
        streamTapeData,
        youtubeData


      try {
        youtubeData = await searchYoutube(movie.title)
        console.log("🚀 ~ app.post ~ youtubeData:", youtubeData)
        responses.push({ service: "YouTube", result: youtubeData })
      } catch (error) {
        console.error("Error uploading to Youtube:", error.message)
      }


        const matchedMovie = allMovies.find((m) => {
        const titleA = normalizeTitle(m?.title)
        const titleB = normalizeTitle(youtubeData?.title)
        return (
          titleA === titleB ||
          titleA.includes(titleB) ||
          titleB.includes(titleA)
        )
      })

      console.log( "matchedMovie" , matchedMovie)

      if (matchedMovie) {
        matchedMovies.push({ status: 1, error: "Movie Already Uploaded on Server", message: "Match Found",          data: movie?.title, }); // Collect matched files
        continue; // Skip the rest of the code and move to the next file
      }


      try {
        streamWishData = await uploadToStreamwish(movie.url) // Assuming movie has a file property
        console.log("🚀 ~ app.post ~ streamWishData:", streamWishData)
        responses.push({ service: "StreamWish", result: streamWishData })
      } catch (error) {
        console.error("Error uploading to StreamWish:", error.message)
      }

      try {
        streamTapeData = await uploadStreamTape(movie.url) // Assuming movie has a file property
        console.log("🚀 ~ app.post ~ streamTapeData:", streamTapeData)
        responses.push({ service: "StreamTape", result: streamTapeData })
      } catch (error) {
        console.error("Error uploading to Stream Tape:", error.message)
      }

      // Upload to Doodli
      try {
        doodliData = await uploadToDoodli(movie.url)
        console.log("🚀 ~ app.post ~ doodliData:", doodliData)
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
        console.log("🚀 ~ app.post ~ vidHideData:", vidHideData)
        responses.push({ service: "Vidhide", result: vidHideData })
      } catch (error) {
        console.error("Error uploading to Vidhide:", error.message)
      }

      
      // Handle thumbnail
      const { title, description, duration, views, thumbnail } = youtubeData
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
      // formData.append("download_link3", download_link3)
      // formData.append("iframe_link3", iframe_link3)
      formData.append("download_link4", download_link4)
      formData.append("iframe_link4", iframe_link4)
      formData.append("download_link5", download_link5)
      formData.append("iframe_link5", iframe_link5)
      // formData.append("download_link6", download_link6)
      // formData.append("iframe_link6", iframe_link6)
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
    res.json({
      status: 1,
      message: "File processing completed",
      matchedMovies, // Movies that are already uploaded
      responses, 
    });
  } catch (error) {
    console.error("Error uploading files:", error.message)
    res
      .status(500)
      .json({ error: "Error uploading files", message: error.message })
  }
})

app.post("/api/upload", upload.array("files"), async (req, res) => {
  const files = req?.files?.length === 1 ? [req?.files[0]] : req.files;
  const responses = [];
  const matchedMovies = []; // To track movies already uploaded

  let allMovies = [];
  try {
    const allMoviesResponse = await axios.get("https://backend.videosroom.com/public/api/all-movies");
    allMovies = allMoviesResponse?.data?.data || [];
  } catch (error) {
    return res.status(500).json({ error: "Error fetching movies", message: error.message });
  }

  try {
    for (const file of files) {
      let mixdropResponse, mixdropFinalResponse, youtubeData;
      const fileNameWithoutExt = file.originalname.replace(/\.[^/.]+$/, "");
      youtubeData = await searchYoutube(fileNameWithoutExt);

      const matchedMovie = allMovies.find((m) => {
        const titleA = normalizeTitle(m?.title);
        const titleB = normalizeMixdropTitle(youtubeData?.title);
        return titleA === titleB || titleA.includes(titleB) || titleB.includes(titleA);
      });

      if (matchedMovie) {
        matchedMovies.push({ file: file.originalname, title: matchedMovie?.title }); // Collect matched files
        continue; // Skip the rest of the code and move to the next file
      }

      try {
        mixdropResponse = await uploadToMixdrop(file);
        // mixdropFinalResponse = await mixdropFileDetails(mixdropResponse?.result?.fileref);
        responses.push({ service: "Mixdrop", result: mixdropResponse });
        // responses.push({ service: "MixdropFileDetails", result: mixdropFinalResponse });
      } catch (error) {
        console.error("Error uploading to Mixdrop:", error.message);
        responses.push({ service: "Mixdrop", error: error.message });
        continue; 
      }

      try {
        streamWishData = await uploadToStreamwish(mixdropResponse?.result?.url)
        responses.push({ service: "StreamWish", result: streamWishData })
      } catch (error) {
        console.error("Error uploading to StreamWish:", error.message)
      }

      try {
        doodliData = await uploadToDoodli(mixdropResponse?.result?.url)
        responses.push({
          service: "Doodapi",
          result: doodliData,
          messgae: doodliData?.msg,
        })
      } catch (error) {
        console.error("Error uploading to Doodapi:", error.message)
      }

      try {
        vidHideData = await uploadToVidhide(mixdropResponse?.result?.url)
        responses.push({ service: "Vidhide", result: vidHideData })
      } catch (error) {
        console.error("Error uploading to Vidhide:", error.message)
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
      const download_link1 = mixdropResponse?.result?.url
      const iframe_link1 = mixdropResponse?.result?.embedurl
      const download_link2 = `https://dood.li/d/${doodliData?.result?.filecode}`
      const iframe_link2 = `https://dood.li/e/${doodliData?.result?.filecode}`
      const download_link3 = `https://vidhideplus.com/file/${vidHideData?.result?.filecode}`
      const iframe_link3 = `https://vidhideplus.com/embed/${vidHideData?.result?.filecode}`
      const download_link4 = `https://playerwish.com/f/${streamWishData?.result?.filecode}`
      const iframe_link4 = `https://playerwish.com/e/${streamWishData?.result?.filecode}`
      
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
      formData.append("thumbnail", fs.createReadStream(thumbnailPath))

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

    res.json({
      status: 1,
      message: "File processing completed",
      matchedMovies, // Movies that are already uploaded
      responses, // Mixdrop responses for uploaded files
    });
  } catch (error) {
    res.status(500).json({ error: "Error uploading files", message: error.message });
  } finally {
    // Clean up uploaded files after handling
    files.forEach((file) => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });
  }
});




// ytsr("Ram Pothineni's - SKANDA | New Released South Indian Hindi Dubbed Movie 2024 | Sreeleela", { safeSearch: true}).then(result => {
//     let movie = result.items[0];
//     console.log("🚀 ~ ytsr ~ movie:", movie?.name)
//     console.log("🚀 ~ ytsr ~ movie:", result)
    
// });

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
