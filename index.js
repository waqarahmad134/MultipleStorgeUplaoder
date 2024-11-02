const express = require("express")
const multer = require("multer")
const axios = require("axios")
const fs = require("fs")
const path = require("path")
const FormData = require("form-data")
const cors = require("cors")
const youtubesearchapi = require("youtube-search-api")
const ytSearch = require("yt-search")
const app = express()
app.use(cors())
app.use(express.json())
const { Builder, By, until } = require("selenium-webdriver")
const fetch = require("node-fetch")

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
    return Promise.resolve()
  }
}

const searchYoutubeNew = async (query) => {
  const searchOptions = {
    maxResults: 5,
  }
  try {
    const results = await youtubesearchapi.GetListByKeyword(
      query,
      searchOptions
    )
    const firstVideo = results?.items?.filter((data) => data?.type === "video")
    const firstVideoId = firstVideo?.[0]?.id
    let videoDetails = {}
    if (firstVideoId) {
      try {
        videoDetails = await new Promise((resolve, reject) => {
          ytSearch({ videoId: firstVideoId }, (err, result) => {
            if (err) {
              console.error("Error fetching video details:", err)
              resolve({
                description: "Default description",
                timestamp: "00:00",
                views: 0,
                uploadDate: "2024-01-01",
              })
            } else {
              resolve(result)
            }
          })
        })
      } catch (detailError) {
        videoDetails = {
          description: "Default description",
          timestamp: "00:00",
          views: 0,
          uploadDate: "2024-01-01",
        }
      }
    } else {
      videoDetails = {
        description: "No video found",
        timestamp: "00:00",
        views: 0,
        uploadDate: "2024-01-01",
      }
    }

    const videoData = {
      id: firstVideoId || "default-id",
      title: firstVideo?.title || videoDetails?.title,
      thumbnail:
        firstVideo?.thumbnail?.thumbnails?.[0]?.url || videoDetails?.thumbnail,
      description: videoDetails?.description || "Default description",
      timestamp: videoDetails?.timestamp || "00:00",
      views: videoDetails?.views || 0,
      uploadDate: videoDetails?.uploadDate || "2024-01-01",
    }

    return videoData
  } catch (err) {
    return {
      id: "default-id",
      title: "Default Title",
      thumbnail: "default-thumbnail-url",
      description: "Default description",
      timestamp: "00:00",
      views: 0,
      uploadDate: "2024-01-01",
    }
  }
}

const uploadToDoodli = async (movie, doodliKey) => {
  const updatedMovie = movie.replace(/\/\//g, "/")
  const movieId = updatedMovie.split("/").pop()
  try {
    const doodliUrl = `https://doodapi.com/api/file/clone?key=${doodliKey}&file_code=${movieId}`
    const doodliResponse = await axios.get(doodliUrl)
    return doodliResponse?.data
  } catch (Error) {
    console.error(`Doodli upload error for: ${movie?.title}`, Error.message)
    throw new Error(`Doodli upload failed for: ${movie?.title}`)
  }
}

const getDoodliFileDetail = async (movie, doodliKey) => {
  try {
    const doodliUrl = `https://doodapi.com/api/file/info?key=${doodliKey}&file_code=${movie}`
    const doodliResponse = await axios.get(doodliUrl)
    return doodliResponse?.data?.result
  } catch (Error) {
    console.error(`Doodli upload error for: ${movie?.title}`, Error.message)
    throw new Error(`Doodli upload failed for: ${movie?.title}`)
  }
}

const uploadStreamTape = async (movie, data) => {
  try {
    const movieId = movie.split("/").pop()
    let username = data?.username || "18363eb8d9f015d97121"
    let password = data?.password || "d3362LPrbVckYkd"
    const streamTapeUrl = `https://api.streamtape.com/remotedl/add?login=${username}&key=${password}&url=https://streamtape.com/v/${movieId}`
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

const uploadToVidhide = async (movie, data) => {
  try {
    const movieId = movie.split("/").pop()
    let vidHideKey = data?.vidhideKey || "31076w3lc27ihj621zyb7"
    const vidHideUrl = `https://vidhideapi.com/api/file/clone?key=${vidHideKey}&file_code=${movieId}`
    const vidHideResponse = await axios.get(vidHideUrl)
    return vidHideResponse?.data
  } catch (Error) {
    console.error(`Vidhide upload error for: ${movie?.title}`, Error.message)
    throw new Error(`Vidhide upload failed for: ${movie?.title}`)
  }
}

const uploadToStreamwish = async (movie, data) => {
  try {
    const movieId = movie.split("/").pop()
    let streamwishKey = data?.streamwishKey || "19211xt467prybty85xsy"
    const streamWishUrl = `https://api.streamwish.com/api/file/clone?key=${streamwishKey}&file_code=${movieId}`
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

app.get("/", (req, res) => {
  return res.send("Hello World");
});

app.post("/api/directUpload", async (req, res) => {
  const data = req.body;
  console.log("first", data?.selectedCategories)
  const accountData = JSON.parse(data.accountData);
  const responses = [];

  const movies = data.movies || [];
  const hasDoodli = movies.find((url) => url.includes("dood"));
  const hasStreamTape = movies.find((url) => url.includes("tape"));
  const hasVidHidePro = movies.find((url) => url.includes("vidhide"));
  const hasStreamWish = movies.find((url) =>
    url.includes("cdnplaypro") || url.includes("streamwish") || url.includes("hlswish")
  );

  let doodliData, fileTitle, fileSplashImg, streamTapeData, videHideData, streamWishData, youtubeData , streamWishFinalLink , videHideFinalLink;

  if (hasDoodli) {
    try {
      doodliData = await uploadToDoodli(hasDoodli, accountData.doodliKey);
      const fileDetail = await getDoodliFileDetail(doodliData.result.filecode, accountData.doodliKey);
      fileSplashImg = fileDetail[0]?.splash_img;
      fileTitle = fileDetail[0]?.title.replace(/&#40;/g, "(").replace(/&#41;/g, ")");
      responses.push({ service: "Doodapi", result: doodliData, message: doodliData.msg });
    } catch (error) {
      console.error("Error uploading to Doodapi:", error.message);
    }
  }

  if (hasStreamTape) {
    try {
      streamTapeData = await uploadStreamTape(hasStreamTape, accountData);
      responses.push({ service: "StreamTape", result: streamTapeData, message: streamTapeData.msg });
    } catch (error) {
      console.error("Error uploading to streamTape:", error.message);
    }
  }

  if (hasVidHidePro) {
    try {
      videHideData = await uploadToVidhide(hasVidHidePro, accountData);
      videHideFinalLink = `https://vidhidehub.com/file/${videHideData.result.filecode}`;
      responses.push({ service: "videHideData", result: videHideData, message: videHideData.msg });
    } catch (error) {
      console.error("Error uploading to videHide:", error.message);
    }
  }

  if (hasStreamWish) {
    try {
      streamWishData = await uploadToStreamwish(hasStreamWish, accountData);
      streamWishFinalLink = `https://hlswish.com/${streamWishData.result.filecode}`;
      responses.push({ service: "streamWishData", result: streamWishData, message: streamWishData.msg });
    } catch (error) {
      console.error("Error uploading to StreamWish:", error.message);
    }
  }

  if (fileTitle) {
    try {
      youtubeData = await searchYoutubeNew(fileTitle);
      responses.push({ service: "YouTube", result: youtubeData });
    } catch (error) {
      console.error("Error fetching YouTube data:", error.message);
    }
  }

  if (youtubeData) {
    const { title: ytTitle, description, views, thumbnail, timestamp, uploadDate } = youtubeData;
    const sanitizedTitle = (fileTitle || ytTitle).replace(/[^a-zA-Z0-9\s_-]/g, "").replace(/\s+/g, "_");
    const thumbnailDir = path.join(__dirname, "thumbnails");
    if (!fs.existsSync(thumbnailDir)) {
      fs.mkdirSync(thumbnailDir, { recursive: true });
    }
    const thumbnailPath = path.join(thumbnailDir, `${sanitizedTitle}.jpg`);
    await downloadImage(thumbnail, thumbnailPath);
    const formData = new FormData();
    formData.append("title", fileTitle || ytTitle);
    formData.append("meta_description", description?.substring(0, 100) || sanitizedTitle);
    formData.append("description", description?.substring(0, 300));
    formData.append("uploadBy", "admin");
    formData.append("duration", timestamp || "1:30:32");
    formData.append("year", uploadDate || "0");
    formData.append("views", views || "0");
    if (Array.isArray(data?.selectedCategories)) {
      data.selectedCategories.forEach((id) =>
        formData.append("category_ids[]", id)
      )
    } else {
      console.warn("No categories selected or invalid format.")
    }
    formData.append("thumbnail", fs.createReadStream(thumbnailPath));

    if (doodliData) {
      formData.append("download_link2", doodliData?.result?.download_url);
      formData.append("iframe_link2", doodliData?.result?.embed_url);
    }
    if (streamTapeData) {
      formData.append("download_link3", streamTapeData?.result?.link);
      formData.append("iframe_link3", `https://streamtape.com/e/${streamTapeData?.result?.linkid}`);
    }
    if (streamWishData) {
      formData.append("download_link4", streamWishFinalLink);
      formData.append("iframe_link4", `https://hlswish.com/e/${streamWishData.result.filecode}`);
    }
    if (videHideData) {
      formData.append("download_link5", videHideFinalLink);
      formData.append("iframe_link5", `https://vidhidehub.com/embed/${videHideData.result.filecode}`);
    }

    try {
      const response = await axios.post(`https://backend.videosroom.com/public/api/add-movie`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });
      responses.push({ service: "Backend", result: response.data });
    } catch (error) {
      console.error("Error saving video information to backend:", error.message);
    }
  }

  res.json({ responses });
});

app.post("/api/remoteStreamTape", async (req, res) => {
  const data = req.body;
  console.log("first", data?.selectedCategories)
  const accountData = JSON.parse(data.accountData);
  const responses = [];

  const movies = data.movies || [];
  const hasDoodli = movies.find((url) => url.includes("dood"));
  const hasStreamTape = movies.find((url) => url.includes("tape"));
  const hasVidHidePro = movies.find((url) => url.includes("vidhide"));
  const hasStreamWish = movies.find((url) =>
    url.includes("cdnplaypro") || url.includes("streamwish") || url.includes("hlswish")
  );

  let doodliData, fileTitle, fileSplashImg, streamTapeData, videHideData, streamWishData, youtubeData , streamWishFinalLink , videHideFinalLink;

  if (hasDoodli) {
    try {
      doodliData = await uploadToDoodli(hasDoodli, accountData.doodliKey);
      const fileDetail = await getDoodliFileDetail(doodliData.result.filecode, accountData.doodliKey);
      fileSplashImg = fileDetail[0]?.splash_img;
      fileTitle = fileDetail[0]?.title.replace(/&#40;/g, "(").replace(/&#41;/g, ")");
      responses.push({ service: "Doodapi", result: doodliData, message: doodliData.msg });
    } catch (error) {
      console.error("Error uploading to Doodapi:", error.message);
    }
  }

  if (hasStreamTape) {
    try {
      streamTapeData = await uploadStreamTape(hasStreamTape, accountData);
      responses.push({ service: "StreamTape", result: streamTapeData, message: streamTapeData.msg });
    } catch (error) {
      console.error("Error uploading to streamTape:", error.message);
    }
  }

  if (hasVidHidePro) {
    try {
      videHideData = await uploadToVidhide(hasVidHidePro, accountData);
      videHideFinalLink = `https://vidhidehub.com/file/${videHideData.result.filecode}`;
      responses.push({ service: "videHideData", result: videHideData, message: videHideData.msg });
    } catch (error) {
      console.error("Error uploading to videHide:", error.message);
    }
  }

  if (hasStreamWish) {
    try {
      streamWishData = await uploadToStreamwish(hasStreamWish, accountData);
      streamWishFinalLink = `https://hlswish.com/${streamWishData.result.filecode}`;
      responses.push({ service: "streamWishData", result: streamWishData, message: streamWishData.msg });
    } catch (error) {
      console.error("Error uploading to StreamWish:", error.message);
    }
  }

  if (fileTitle) {
    try {
      youtubeData = await searchYoutubeNew(fileTitle);
      responses.push({ service: "YouTube", result: youtubeData });
    } catch (error) {
      console.error("Error fetching YouTube data:", error.message);
    }
  }

  if (youtubeData) {
    const { title: ytTitle, description, views, thumbnail, timestamp, uploadDate } = youtubeData;
    const sanitizedTitle = (fileTitle || ytTitle).replace(/[^a-zA-Z0-9\s_-]/g, "").replace(/\s+/g, "_");
    const thumbnailDir = path.join(__dirname, "thumbnails");
    if (!fs.existsSync(thumbnailDir)) {
      fs.mkdirSync(thumbnailDir, { recursive: true });
    }
    const thumbnailPath = path.join(thumbnailDir, `${sanitizedTitle}.jpg`);
    await downloadImage(thumbnail, thumbnailPath);
    const formData = new FormData();
    formData.append("title", fileTitle || ytTitle);
    formData.append("meta_description", description?.substring(0, 100) || sanitizedTitle);
    formData.append("description", description?.substring(0, 300));
    formData.append("uploadBy", "admin");
    formData.append("duration", timestamp || "1:30:32");
    formData.append("year", uploadDate || "0");
    formData.append("views", views || "0");
    if (Array.isArray(data?.selectedCategories)) {
      data.selectedCategories.forEach((id) =>
        formData.append("category_ids[]", id)
      )
    } else {
      console.warn("No categories selected or invalid format.")
    }
    formData.append("thumbnail", fs.createReadStream(thumbnailPath));

    if (doodliData) {
      formData.append("download_link2", doodliData?.result?.download_url);
      formData.append("iframe_link2", doodliData?.result?.embed_url);
    }
    if (streamTapeData) {
      formData.append("download_link3", streamTapeData?.result?.link);
      formData.append("iframe_link3", `https://streamtape.com/e/${streamTapeData?.result?.linkid}`);
    }
    if (streamWishData) {
      formData.append("download_link4", streamWishFinalLink);
      formData.append("iframe_link4", `https://hlswish.com/e/${streamWishData.result.filecode}`);
    }
    if (videHideData) {
      formData.append("download_link5", videHideFinalLink);
      formData.append("iframe_link5", `https://vidhidehub.com/embed/${videHideData.result.filecode}`);
    }

    try {
      const response = await axios.post(`https://backend.videosroom.com/public/api/add-movie`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });
      responses.push({ service: "Backend", result: response.data });
    } catch (error) {
      console.error("Error saving video information to backend:", error.message);
    }
  }

  res.json({ responses });
});


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
    if (timeDifference < 6) {
      const doodliLink = data?.download_link2?.replace("/d/", "/e/")
      const streamTapeLink = data?.download_link3
      const veevLink = data?.download_link6

      driver = await new Builder().forBrowser("chrome").build()
      await driver.get(doodliLink)
      try {
        const videoElement = await driver.wait(
          until.elementLocated(By.css("video#video_player_html5_api")),
          10000 
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

          // Sending the POST request to update the movie
          const addMovieResponse = await axios.post(
            `https://backend.videosroom.com/public/api/update-movie/${data.id}`,
            formData,
            { headers: { ...formData.getHeaders() } }
          )

          setTimeout(async () => {
            try {
              driver = await new Builder().forBrowser("chrome").build()
              
              if (streamTapeLink) {
                await driver.get(streamTapeLink);
                const videoElement = await driver.wait(
                  until.elementLocated(By.css("video#mainvideo")),
                  10000 // 10 seconds max wait
                );
                const videoSrc = await videoElement.getAttribute("src");
                if (videoSrc) {
                  const formData = new FormData();
                  formData.append("title", data?.title || "");
                  formData.append("description", data?.description || "");
                  formData.append("iframe_link3", videoSrc);
                  formData.append("year", data?.year || "");
                  formData.append("uploadBy", "admin");
                  formData.append("views", data?.views || "0");
                  await axios.post(
                    `https://backend.videosroom.com/public/api/update-movie/${data.id}`,
                    formData,
                    { headers: { ...formData.getHeaders() } }
                  );
                }
              }
          
              // Now, handle veevLink
              if (veevLink) {
                await driver.get(veevLink);
                const videoElement = await driver.wait(
                  until.elementLocated(By.css("source")),
                  10000 // 10 seconds max wait
                );
                console.log("🚀 ~ setTimeout ~ videoElement:", videoElement)
                const videoSrc = await videoElement.getAttribute("src");
                // const videoSrc = await driver.executeScript(
                //   'return document.querySelector("video source")?.getAttribute("src");'
                // );
                if (videoSrc) {
                  const formData = new FormData();
                  formData.append("title", data?.title || "");
                  formData.append("description", data?.description || "");
                  formData.append("iframe_link6", videoSrc);
                  formData.append("year", data?.year || "");
                  formData.append("uploadBy", "admin");
                  formData.append("views", data?.views || "0");
                  await axios.post(
                    `https://backend.videosroom.com/public/api/update-movie/${data.id}`,
                    formData,
                    { headers: { ...formData.getHeaders() } }
                  );
                }
              }
              
            } catch (error) {
              console.error("Error in delayed second API call:", error.message);
            }
          }, 10000); 
               

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

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
