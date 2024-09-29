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
const puppeteer = require('puppeteer');

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


async function scrapeYouTubeChannel(channelUrl) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(channelUrl, { waitUntil: 'load', timeout: 0 });

    // Scroll to load more videos
    let previousHeight;
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

    while (true) {
        previousHeight = await page.evaluate('document.body.scrollHeight');
        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
        await delay(2000); // Replaces waitForTimeout with a manual delay
        const newHeight = await page.evaluate('document.body.scrollHeight');
        if (newHeight === previousHeight) break; // exit loop if no more content is loaded
    }

    // Extract video details
    const videos = await page.evaluate(() => {
        const videoNodes = document.querySelectorAll('ytd-grid-video-renderer');
        console.log("🚀 ~ videos ~ videoNodes:", videoNodes)
        return Array.from(videoNodes).map(video => ({
            title: video.querySelector('#video-title').innerText,
            url: video.querySelector('#video-title').href,
            views: video.querySelector('#metadata-line span:nth-child(1)').innerText,
            uploaded: video.querySelector('#metadata-line span:nth-child(2)').innerText
        }));
    });

    await browser.close();
    return videos;
}

const channelUrl = 'https://www.youtube.com/channel/UCsZdkgstWhCgJ6u9YOWZdbQ/videos';  // Channel URL for Spike Tv
scrapeYouTubeChannel(channelUrl).then(videos => {
    console.log('Videos:', videos);
});
