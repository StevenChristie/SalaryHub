import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './components/App' // Points to the new folder
import './global_1.css' // Your global styles

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)