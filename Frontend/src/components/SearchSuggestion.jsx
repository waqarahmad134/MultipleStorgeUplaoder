import React, { useState, useEffect } from "react"
import axios from "axios"
import debounce from "lodash.debounce"
import searchIcon from "../../search-icon.png"
import { BASE_URL } from "../utilities/URL"
import Card from "./Card"

export default function SearchSuggestion() {
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState([])

  const fetchSuggestions = async (query1) => {
    try {
      const response = await axios.get(`${BASE_URL}suggestions`, {
        params: {
          q: query1,
          client: "youtube",
          hl: "en",
        },
        headers: {
          "Content-Type": "application/json",
        },
      })
      setSuggestions(response.data)
    } catch (error) {
      console.error("Error fetching suggestions", error)
    }
  }

  const debouncedFetchSuggestions = debounce((value) => {
    if (value) {
      fetchSuggestions(value)
    } else {
      setSuggestions([])
    }
  }, 1000)

  const handleInputChange = (e) => {
    const value = e.target.value
    setQuery(value)
    debouncedFetchSuggestions(value)
  }

  useEffect(() => {
    return () => {
      debouncedFetchSuggestions.cancel()
    }
  }, [])

  const searchYTData = async (query) => {
    setLoading(true)
    try {
      const res = await axios.get(`${BASE_URL}search?q=/${query}`)
      if (res?.status === 200) {
        setData(res?.data?.results?.items)
      } else {
        setData(res?.data?.results?.items)
      }
    } catch (error) {
      console.error(
        "Error fetching data:",
        error.response || error.message || error
      )
    } finally {
      setLoading(false)
      setSuggestions([])
    }
  }

  return loading ? (
    <div class="main_loader_data">
      <div class="loader progress"></div>
    </div>
  ) : (
    <>
      <div className="hero-input container">
        <form>
          <div className="hero-input-Search">
            <input
              type="text"
              value={query}
              onChange={handleInputChange}
              className="form-control"
              autoComplete="off"
              placeholder="Search Your Favorite Music"
            />
            <button type="submit" className="btn btn-submit" id="submit_btn">
              <img src={searchIcon} alt="Search" />
            </button>
            <div id="suggestion_box">
              {suggestions?.length > 0 && (
                <ul className="suggestions" id="suggestions">
                  {suggestions?.map((suggestion, index) => (
                    <li
                      key={index}
                      className="search_result"
                      onClick={() => searchYTData(suggestion?.[0])}
                    >
                      {suggestion?.[0]}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </form>
        <p>By pressing Search” you confirm your consent to our Terms of Use.</p>
      </div>
      <div className="waqar">
        {data?.length > 0 &&
          data?.map((item) => <Card data={item} key={item?.channel} />)}
      </div>
    </>
  )
}
