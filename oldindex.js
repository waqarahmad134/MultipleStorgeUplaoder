const express = require("express")
const multer = require("multer")
const axios = require("axios")
const fs = require("fs")
const path = require('path');
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

const uploadToDoodapi = async (files) => {
  try {
    // Step 1: Get the server URL
    const serverResponse = await axios.get(
      "https://doodapi.com/api/upload/server?key=434272nxlae3r22329ia88"
    )
    const uploadUrl = serverResponse.data.result
    // Step 2: Create form data
    const formData = new FormData()
    formData.append("api_key", "434272nxlae3r22329ia88") // Include the API key

    if (Array.isArray(files)) {
      // If multiple files, append each one
      files.forEach((file) => {
        formData.append(
          "file",
          fs.createReadStream(file.path),
          file.originalname
        )
      })
    } else {
      // If single file, append it
      formData.append(
        "file",
        fs.createReadStream(files.path),
        files.originalname
      )
    }

    // Step 3: Upload the file(s) to the received URL
    const response = await axios.post(
      `${uploadUrl}?api_key=434272nxlae3r22329ia88`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
      }
    )
    return response.data
  } catch (error) {
    console.error(
      `Error: Doodapi upload failed: ${error.response ? error.response.data : error.message}`
    )
    throw new Error(`Doodapi upload failed: ${error.message}`)
  }
}

const uploadToUpstream = async (files) => {
  try {
    const serverResponse = await axios.get(
      "https://upstream.to/api/upload/server?key=64637qwgzhzja5yhol5xk"
    );
    const uploadUrl = serverResponse.data.result;
    // Step 2: Create form data
    const formData = new FormData();
    formData.append("key", "64637qwgzhzja5yhol5xk"); // Include the API key

    if (Array.isArray(files)) {
      // If multiple files, append each one
      files.forEach((file) => {
        formData.append(
          "file",
          fs.createReadStream(file.path),
          file.originalname
        );
      });
    } else {
      // If single file, append it
      formData.append(
        "file",
        fs.createReadStream(files.path),
        files.originalname
      );
    }

    // Step 3: Upload the file(s) to the received URL
    const response = await axios.post(
      `${uploadUrl}?api_key=64637qwgzhzja5yhol5xk`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
      }
    );
    return response.data; 
  } catch (error) {
    console.error(
      `Error: Upstream upload failed: ${
        error.response ? error.response.data : error.message
      }`
    );
    throw new Error(`Upstream upload failed: ${error.message}`);
  }
};

const uploadToVidhide = async (files) => {
  try {
    // Step 1: Get the server URL from Vidhide API
    const serverResponse = await axios.get(
      "https://vidhideapi.com/api/upload/server?key=31076w3lc27ihj621zyb7"
    );
    const uploadUrl = serverResponse.data.result; 
    // Step 2: Create form data
    const formData = new FormData();
    formData.append("key", "31076w3lc27ihj621zyb7"); 

    if (Array.isArray(files)) {
      // If multiple files, append each one
      files.forEach((file) => {
        formData.append(
          "file",
          fs.createReadStream(file.path),
          file.originalname
        );
      });
    } else {
      // If single file, append it
      formData.append("file", fs.createReadStream(files.path), files.originalname);
    }

    // Step 3: Upload the file(s) to the received URL
    const response = await axios.post(uploadUrl, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    return response.data; // Return the response data
  } catch (error) {
    console.error(
      `Error: Vidhide upload failed: ${
        error.response ? error.response.data : error.message
      }`
    );
    throw new Error(`Vidhide upload failed: ${error.message}`);
  }
};

const uploadToStreamwish = async (files) => {
  try {
    // Step 1: Get the server URL from Streamwish API
    const serverResponse = await axios.get(
      "https://api.streamwish.com/api/upload/server?key=20445huibnrwap8ww1pp4"
    );
    const uploadUrl = serverResponse.data.result; // The actual URL to upload files

    // Step 2: Create form data
    const formData = new FormData();
    formData.append("key", "20445huibnrwap8ww1pp4"); // Append 'key' for Streamwish API

    if (Array.isArray(files)) {
      // If multiple files, append each one
      files.forEach((file) => {
        formData.append(
          "file",
          fs.createReadStream(file.path),
          file.originalname
        );
      });
    } else {
      // If single file, append it
      formData.append("file", fs.createReadStream(files.path), files.originalname);
    }

    // Step 3: Upload the file(s) to the received URL
    const response = await axios.post(uploadUrl, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    return response.data; // Return the response data
  } catch (error) {
    console.error(
      `Error: Streamwish upload failed: ${
        error.response ? error.response.data : error.message
      }`
    );
    throw new Error(`Streamwish upload failed: ${error.message}`);
  }
};


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

app.post("/api/upload", upload.array("files"), async (req, res) => {
  const files = req.files.length === 1 ? req.files[0] : req.files;
  const responses = [];
  try {
    for (const file of files) {
      try {
        const mixdropResponse = await uploadToMixdrop(file);
        responses.push({ service: "Mixdrop", result: mixdropResponse });
      } catch (error) {
        console.error("Error uploading to Mixdrop:", error.message);
      }

      try {
        const doodapiResponse = await uploadToDoodapi(file);
        responses.push({ service: "Doodapi", result: doodapiResponse });
      } catch (error) {
        console.error("Error uploading to Doodapi:", error.message);
      }

      try {
        const upStreamResponse = await uploadToUpstream(file);
        responses.push({ service: "Upstream", result: upStreamResponse });
      } catch (error) {
        console.error("Error uploading to Upstream:", error.message);
      }

      try {
        const vidHideResponse = await uploadToVidhide(file);
        responses.push({ service: "Vidhide", result: vidHideResponse });
      } catch (error) {
        console.error("Error uploading to Vidhide:", error.message);
      }

      try {
        const streamWishResponse = await uploadToStreamwish(file);
        responses.push({ service: "StreamWish", result: streamWishResponse });
      } catch (error) {
        console.error("Error uploading to StreamWish:", error.message);
      }

      const fileNameWithoutExt = file.originalname.replace(/\.[^/.]+$/, ""); // Remove the extension

      try {
        const youtubeData = await searchYoutube(fileNameWithoutExt);
        responses.push({ service: "YouTube", result: youtubeData });

        // Prepare data to add to your backend API
        const download_link1 = mixdropResponse?.result?.url;
        const iframe_link1 = mixdropResponse?.result?.embedurl;
        const download_link2 = doodapiResponse?.result?.[0]?.download_url;
        const iframe_link2 = doodapiResponse?.result?.[0]?.protected_embed;
        const download_link3 = `https://upstream.to/${upStreamResponse?.files?.[0]?.filecode}`;
        const iframe_link3 = `https://upstream.to/${upStreamResponse?.files?.[0]?.filecode}`;
        const download_link4 = `https://vidhideplus.com/download/${vidHideResponse?.files?.[0]?.filecode}`;
        const iframe_link4 = `https://vidhideplus.com/embed/${vidHideResponse?.files?.[0]?.filecode}`;
        const download_link5 = `https://playerwish.com/f/${streamWishResponse?.files?.[0]?.filecode}`;
        const iframe_link5 = `https://playerwish.com/e/${streamWishResponse?.files?.[0]?.filecode}`;
        const splash_img = doodapiResponse?.result?.[0]?.splash_img;

        const title = youtubeData.title || "Untitled Movie";
        const description = youtubeData.description;
        const duration = youtubeData.duration;
        const views = youtubeData.views;
        const thumbnailUrl = youtubeData.thumbnail;

        // Download the thumbnail image from YouTube
        const thumbnailPath = path.join(
          __dirname,
          "uploads",
          `${fileNameWithoutExt}_thumbnail.jpg`
        );
        await downloadImage(thumbnailUrl, thumbnailPath);

        // Download the splash image from the provided URL
        const splashImgPath = path.join(
          __dirname,
          "uploads",
          `${fileNameWithoutExt}_splash.jpg`
        );
        await downloadImage(splash_img, splashImgPath);

        // Send the movie data to your backend API
        const formData = new FormData();
        formData.append("title", title);
        formData.append("description", description);
        formData.append("uploadBy", "admin");
        formData.append("duration", duration);
        formData.append("views", views);
        formData.append("thumbnail", fs.createReadStream(thumbnailPath)); // Send the image file
        formData.append("images[]", fs.createReadStream(splashImgPath)); // Send the splash image
        formData.append("download_link1", download_link1);
        formData.append("iframe_link1", iframe_link1);
        formData.append("download_link2", download_link2);
         formData.append("iframe_link2", iframe_link2);
        formData.append("download_link3", download_link3);
        formData.append("iframe_link3", iframe_link3);
        formData.append("download_link4", download_link4);
        formData.append("iframe_link4", iframe_link4);
        formData.append("download_link5", download_link5);
        formData.append("iframe_link5", iframe_link5);

        const addMovieResponse = await axios.post(
          "https://backend.videosroom.com/public/api/add-movie",
          formData,
          {
            headers: {
              ...formData.getHeaders(),
            },
          }

        );
        responses.push({ service: "Backend API", result: addMovieResponse.data });
        fs.unlinkSync(thumbnailPath);
      } catch (error) {
        console.error("Error processing YouTube data or Backend API:", error.message);
      }
    }

    res.json(responses);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error uploading files", message: error.message });
  } finally {
    files.forEach((file) => fs.unlinkSync(file.path));

}
});

// ytsr('Sikandar New 2024 Released Full Action Movie | Allu Arjun,Rashmika Mandanna,Sathyaraj #hindidubbed', { safeSearch: true}).then(result => {
//   let movie = result.items[0];
//   console.log('Name: ' + movie.name);
//   console.log('Duration: ' + movie.thumbnail);
// });


-\

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
