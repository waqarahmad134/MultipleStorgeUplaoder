const { Builder, By, until } = require("selenium-webdriver");
const express = require("express");
const app = express();

app.get("/imdb", async (req, res) => {
  const imdbQuery = "Where Hope Grows (2014) imdb";
  let driver;
  try {
    // Initialize the driver
    driver = await new Builder().forBrowser("chrome").build();
    
    // Perform a search on Google for the IMDb link
    await driver.get(`https://www.google.com/search?q=${encodeURIComponent(imdbQuery)}`);
    
    // Wait for the first search result element with class "yuRUbf"
    const videoElements = await driver.wait(
      until.elementsLocated(By.className("yuRUbf")), // Locate all elements with the class
      10000
    );
    
    // Get the href attribute from the first "yuRUbf" element
    const firstElement = videoElements[0];
    const linksrc = await firstElement.findElement(By.css("a")).getAttribute("href");
    
    // Open the extracted IMDb link
    await driver.get(linksrc);
    
    // Wait for the page to load completely (for demonstration, we'll just wait a bit)
    await driver.sleep(5000);  // You can adjust the sleep duration based on your needs

    // Locate the description element using the class "ipc-html-content-inner-div"
    const descriptionElement = await driver.findElement(By.css('div.ipc-html-content-inner-div'));
    
    // Get the text of the description
    const descriptionText = await descriptionElement.getText();

    // Locate all <span> elements inside <a> tags with class "ipc-chip__text"
    const chipElements = await driver.findElements(By.css('a.ipc-chip.ipc-chip--on-baseAlt span.ipc-chip__text'));
    
    // Extract the text from all the found genre elements
    const chipTexts = [];
    for (const chipElement of chipElements) {
      const chipText = await chipElement.getText();
      chipTexts.push(chipText);
    }

    // Locate the duration element specifically using the class "ipc-metadata-list-item__content-container"
    const durationElement = await driver.findElement(By.css('li[data-testid="title-techspec_runtime"] div.ipc-metadata-list-item__content-container'));
    
    // Get the text of the duration (e.g., "1 hour 35 minutes")
    const durationText = await durationElement.getText();

    // Return the extracted chip texts, description, and duration in the response
    return res.status(200).json({
      chipTexts: chipTexts,
      description: descriptionText,
      duration: durationText
    });
  } catch (error) {
    console.error("Error:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    if (driver) {
      try {
        await driver.quit();
      } catch (quitError) {
        console.error("Error quitting the driver:", quitError.message);
      }
    }
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});



// Use later on 
// app.post("/api/allRemote", async (req, res) => {
//   const data = req.body
//   const remoteMovies = data?.movies
//   const responses = []
//   const matchedMovies = []

//   try {
//     const allMoviesResponse = await axios.get(
//       "https://backend.videosroom.com/public/api/all-movies"
//     )
//     const allMovies = allMoviesResponse?.data?.data || []
//     for (const movie of remoteMovies) {
//       const fileTitle = movie?.title?.replace(/\.[^/.]+$/, "")
//       const matchedMovie = allMovies.find((m) => {
//         const titleA = normalizeTitle(m?.title)
//         const titleB = normalizeTitle(fileTitle)
//         return (
//           titleA === titleB ||
//           titleA.includes(titleB) ||
//           titleB.includes(titleA)
//         )
//       })

//       if (matchedMovie) {
//         matchedMovies.push({
//           status: 1,
//           error: "Movie Already Uploaded on Server",
//           message: "Match Found",
//           data: movie?.title,
//         })
//         continue
//       }

//       let youtubeData
//       try {
//         youtubeData = await searchYoutubeNew(fileTitle)
//         responses.push({ service: "YouTube", result: youtubeData })
//       } catch (error) {
//         console.error("Error fetching YouTube data:", error.message)
//       }

//       if (youtubeData) {
        
       

//         const formData = new FormData()
//         formData.append("title", fileTitle || ytTitle)
//         formData.append(
//           "meta_description",
//           description?.substring(0, 100) || sanitizedTitle
//         )
//         formData.append("description", description?.substring(0, 300))
//         formData.append("uploadBy", "admin")
//         formData.append("duration", timestamp || "1:30:32")
//         formData.append("year", uploadDate || "0")
//         formData.append("views", views || "0")

//         // Attach categories if available
//         if (Array.isArray(data?.selectedCategories)) {
//           data.selectedCategories.forEach((id) =>
//             formData.append("category_ids[]", id)
//           )
//         } else {
//           console.warn("No categories selected or invalid format.")
//         }

//         // Attach download links and iframes
//         formData.append("thumbnail", fs.createReadStream(thumbnailPath))
//         formData.append("download_link6", movie?.url)
//         formData.append("iframe_link6", movie?.embedLink)
//         // Save to backend
//         try {
//           const response = await axios.post(
//             `https://backend.videosroom.com/public/api/add-movie`,
//             formData,
//             {
//               headers: { ...formData.getHeaders() },
//             }
//           )
//           responses.push({ service: "Backend", result: response.data })
//         } catch (error) {
//           console.error(
//             "Error saving video information to backend:",
//             error.message
//           )
//         }
//       }
//     }

//     // Return results
//     responses.push({ service: "All Movies Check", result: matchedMovies })
//     res.json({
//       status: 1,
//       message: "File processing completed",
//       matchedMovies,
//       responses,
//     })
//   } catch (error) {
//     console.error(
//       "Error fetching movies or checking for duplicates:",
//       error.message
//     )
//     responses.push({ service: "All Movies Check", error: error.message })
//     if (!res.headersSent) {
//       res.json({ status: 0, message: "Error processing files", responses })
//     }
//   }
// })
