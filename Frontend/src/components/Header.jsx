import React, { useState } from "react"
import { Link } from "react-router-dom"

export default function Header() {
  return (
    <>
      <nav id="nav" className="text-center container">
        <Link to={"/"}>Home</Link>
        <Link >FAQ</Link>
        <Link>Cutter</Link>
      </nav>
    </>
  )
}
