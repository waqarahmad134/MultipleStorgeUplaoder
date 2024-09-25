import React, { useState } from "react"
import axios from "axios"
import { FaCheckCircle } from "react-icons/fa"
import { ImCancelCircle } from "react-icons/im"

export default function Home() {
  const [movieUrls, setMovieUrls] = useState("") // Movie URLs entered by the user
  const [uploadComplete, setUploadComplete] = useState([]) // For success messages
  const [loader, setLoader] = useState(false) // To show loading state
  const [errorData, setErrorData] = useState(null) // To capture and display errors

  const parseMovieUrls = (text) => {
    const regex = /<!--(.*?)-->\s*(https?:\/\/[^\s]+)/g
    let matches
    const result = []
    while ((matches = regex.exec(text)) !== null) {
      const title = matches[1].trim()
      const url = matches[2].trim()
      result.push({ title, url })
    }
    return result
  }
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoader(true)
    setErrorData(null)
    setUploadComplete([])
    try {
      const parsedMovies = parseMovieUrls(movieUrls)
      const response = await axios.post("/api/upload", { movies: parsedMovies })
      console.log("🚀 ~ handleSubmit ~ response:", response?.data)
      setUploadComplete(response.data)
      setLoader(false)
    } catch (error) {
      setErrorData(error.response?.data || "Something went wrong")
      setLoader(false)
    }
  }

  return (
    <div className="bg-slate-200 h-screen flex justify-center items-center">
      <form
        onSubmit={handleSubmit}
        className="p-6 bg-white shadow-md rounded-md w-full max-w-lg"
      >
        <h1 className="text-2xl font-semibold mb-4">Submit Movie URLs</h1>

        <div className="mb-4">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="movieUrls"
          >
            Movie URLs (in the format of a comment and URL):
          </label>
          <textarea
            id="movieUrls"
            rows="8"
            className="w-full p-2 border rounded"
            value={movieUrls}
            onChange={(e) => setMovieUrls(e.target.value)}
            placeholder="Paste movie titles as comments and URLs here..."
          />
        </div>

        {/* Submit button */}
        <div className="flex justify-between items-center">
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            disabled={loader}
          >
            {loader ? "Submitting..." : "Submit"}
          </button>

          {loader && <p>Loading...</p>}
        </div>

        {/* Success message */}
        {uploadComplete.length > 0 && (
          <div className="mt-4 p-4 bg-green-100 rounded-md">
            <h3 className="text-green-700 font-semibold mb-2">
              Submission Complete!
            </h3>
            {uploadComplete.map((item, index) => (
              <p
                key={index}
                className={
                  item?.status === 1 ? "text-red-500" : "text-green-600"
                }
              >
                {item?.status === 1 ? (
                  <ImCancelCircle className="inline-block mr-1" />
                ) : (
                  <FaCheckCircle className="inline-block mr-1" />
                )}
                {item.result?.message ||
                  `Movie Already Added : ${item?.data}` ||
                  "Success!"}
              </p>
            ))}
          </div>
        )}

        {/* Error message */}
        {errorData && (
          <div className="mt-4 p-4 bg-red-100 rounded-md">
            <h3 className="text-red-700 font-semibold mb-2">Error</h3>
            <p className="text-red-600">
              {typeof errorData === "object"
                ? JSON.stringify(errorData)
                : errorData}
            </p>
          </div>
        )}
      </form>
    </div>
  )
}
