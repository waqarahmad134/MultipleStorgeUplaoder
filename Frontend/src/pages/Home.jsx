import React, { useState } from "react"
import axios from "axios"
import { FaCheckCircle } from "react-icons/fa"

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState(null)
  const [uploadComplete, setUploadComplete] = useState([])
  const [loader, setLoader] = useState(false)

  const handleFileChange = (e) => {
    setSelectedFiles(e.target.files)
    setUploadComplete([])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (selectedFiles === null) {
      alert("First Add Movie")
    } else {
      setLoader(true)
      const formData = new FormData()
      // Append each selected file to the FormData object
      Array.from(selectedFiles).forEach((file) => {
        formData.append("files", file)
      })

      try {
        const response = await axios.post("/api/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        })

        setUploadComplete(Array.from(selectedFiles).map((file) => file.name))
        setLoader(false)
        console.log("Upload success:", response.data)
      } catch (error) {
        console.error("Error uploading files:", error)
        setLoader(false)
      }
    }
  }

  return (
    <div className="bg-slate-200 h-screen">
      <div>
        <ul className="flex gap-3 justify-center py-4">
          <li>Mixdrop1 </li>
          <li>Mixdrop2 </li>
          <li>Mixdrop3 </li>
          <li>Mixdrop4 </li>
          <li>Mixdrop5 </li>
          <li>Mixdrop6 </li>
        </ul>
      </div>
      <div className="uploader-container">
        <div className="uploader-left">
          {loader ? (
            <div className="h-full flex items-center justify-center">
              <span className="loader"></span>
            </div>
          ) : (
            <div className="border border-gray-300 p-3">
              <h3>File Uploader</h3>
              <form onSubmit={handleSubmit} encType="multipart/form-data">
                <input
                  type="file"
                  name="files"
                  multiple
                  onChange={handleFileChange}
                />
                <button
                  className="inline-flex py-2.5 px-4 rounded bg-black text-white"
                  type="submit"
                >
                  Upload
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="uploader-right">
          {/* Grid layout of selected files */}
          <div className="grid grid-cols-2 gap-1">
            {selectedFiles &&
              Array.from(selectedFiles).map((file, index) => (
                <div key={index} className="file-item border border-gray-400">
                  <div className="flex items-center justify-between bg-blue-300 p-1">
                    <img
                      src="https://mixdrop.ag/imgs/v2/logo.png"
                      alt="Mixdrop"
                      className="mixdrop-image w-[80px]"
                    />
                    {uploadComplete.includes(file.name) && (
                      <FaCheckCircle className="success-icon" />
                    )}
                  </div>
                  <div className="p-1">
                    <p>
                      {file.name.length > 30
                        ? `${file.name.substring(0, 30)}...`
                        : file.name}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
