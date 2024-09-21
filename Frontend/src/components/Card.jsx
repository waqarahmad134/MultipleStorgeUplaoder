import axios from "axios"
import React, { useState } from "react"
import { Link } from "react-router-dom"
import { BASE_URL } from "../utilities/URL"

export default function Card({ data, key }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [showMp3Options, setShowMp3Options] = useState(false)

  const togglePlay = () => {
    setIsPlaying((prevState) => !prevState)
  }

  const toggleMp3Options = () => {
    setShowMp3Options((prevState) => !prevState)
  }


  const download = async (isAudioOnly) => {
    try {
      const videoUrl = data?.url?.toString();
      const res = await axios.post(`${BASE_URL}download`, {
        url: videoUrl,
        // url: "https://www.youtube.com/watch?v=qemeKvokfwg",
        vQuality: "720",
        isAudioOnly: isAudioOnly
      });
      if(res?.status === 200){
        const streamUrl = res?.data?.streamUrl;
        if (streamUrl) {
          const a = document.createElement('a');
          a.href = streamUrl;
          a.click();
        } else {
          alert('No stream URL found');
        }
      }
      else{
        alert('Err')
      }
    } catch (error) {
      console.error("Error fetching data:", error.response || error.message || error);
    } finally {
      console.log('finally');
    }
  }
  

  return (
    <div>
      <div
        key={key}
        className="result"
        style={{
          background: "rgb(255, 255, 255)",
          borderRadius: "10px",
          padding: "20px",
          textAlign: "center",
          marginBottom: "15px",
        }}
      >
        <div>
          <img
            src={data?.thumbnail}
            className="img-fluid"
            alt={data?.name}
            style={{ width: "200px", margin: "auto" }}
          />
        </div>
        <div className="videoInfo">
          <div
            className="title"
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              fontWeight: 600,
              textOverflow: "ellipsis",
              width: "100%",
            }}
          >
            <b>{data?.name}</b>
          </div>
          <div className="videoDuration" style={{ padding: "15px 0px" }}>
            Duration: {data?.duration}
          </div>
        </div>
        <div className="options">
          <a
            className="download MP3"
            onClick={toggleMp3Options}
            style={{
              textDecoration: "none",
              borderRadius: "2px",
              padding: "7px 15px",
              color: "rgb(255, 255, 255)",
              backgroundColor: "rgb(13, 71, 161)",
              fontWeight: 700,
              lineHeight: "22px",
              fontSize: "16px",
              textAlign: "center",
              marginRight: "0.833333%",
              display: "inline-block",
              cursor: "pointer",
            }}
          >
            {showMp3Options ? "Close" : "MP3"}
          </a>
          <a
            className="download MP4"
            style={{
              textDecoration: "none",
              borderRadius: "2px",
              padding: "7px 15px",
              color: "rgb(255, 255, 255)",
              backgroundColor: "rgb(13, 71, 161)",
              fontWeight: 700,
              lineHeight: "22px",
              fontSize: "16px",
              textAlign: "center",
              marginRight: "0.833333%",
              display: "inline-block",
              cursor: "pointer",
            }}
          >
             {showMp3Options ? "Close" : "MP4"}
          </a>
          <a
            className="play"
            onClick={togglePlay}
            style={{
              textDecoration: "none",
              borderRadius: "2px",
              padding: "7px 15px",
              color: "rgb(255, 255, 255)",
              backgroundColor: "rgb(13, 71, 161)",
              fontWeight: 700,
              lineHeight: "22px",
              fontSize: "16px",
              textAlign: "center",
              marginRight: "0.833333%",
              display: "inline-block",
              cursor: "pointer",
            }}
          >
            {isPlaying ? "Close" : "Play"}
          </a>
        </div>
      </div>
      <div className="details_sec text-center">
        {isPlaying && (
          <>
            <div className="videoPlayer" style={{ marginTop: "15px" }}>
              <iframe
                width="560"
                height="315"
                src={`https://www.youtube.com/embed/${data.id}`}
                title={data.name}
                frameBorder="0"
                allow="autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ borderRadius: "10px" }}
              ></iframe>
            </div>
          </>
        )}
        {showMp3Options && (
          <div className="data_display">
            {/* <div class="main_loader_data">
              <div class="loader progress"></div>
            </div> */}
            <div class="loadData">
              <div class="inside_data_mp3" onClick={()=>download(false)}>
                <div class="text">mp3</div>
                <div class="bitrate">320kbps</div>
                <div class="filesize"></div>
              </div>
              <div class="inside_data_mp3" onClick={()=>download(false)}>
                <div class="text">mp3</div>
                <div class="bitrate">256kbps</div>
                <div class="filesize"></div>
              </div>
              <div class="inside_data_mp3" onClick={()=>download(false)}>
                <div class="text">mp3</div>
                <div class="bitrate">192kbps</div>
                <div class="filesize"></div>
              </div>
              <div class="inside_data_mp3" onClick={()=>download(false)}>
                <div class="text">mp3</div>
                <div class="bitrate">128kbps</div>
                <div class="filesize"></div>
              </div>
              <div class="inside_data_mp3" onClick={()=>download(false)}>
                <div class="text">mp3</div>
                <div class="bitrate">64kbps</div>
                <div class="filesize"></div>
              </div>
            </div>
          </div>
        )}
        {(isPlaying || showMp3Options) && (
        <div className="btn-group">
          <Link className="btn-download">Download Now</Link>
          <div>
            <a className="btn-playnow">Play Now</a>
            <span>Advertising</span>
          </div>
        </div>
        )}
      </div>
    </div>
  )
}
