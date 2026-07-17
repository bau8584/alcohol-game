import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import { initTheme } from './lib/theme'
import Home from './pages/Home.jsx'
import Host from './pages/Host.jsx'
import Player from './pages/Player.jsx'
import Tv from './pages/Tv.jsx'

initTheme()

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/host/:roomId', element: <Host /> },
  { path: '/play/:roomId', element: <Player /> },
  { path: '/tv/:roomId', element: <Tv /> }, // 화면 전용(두 번째 기기)
  { path: '*', element: <Home /> },
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
