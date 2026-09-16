import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { Provider } from 'react-redux'
import appStore from './Context/appStore.tsx'
import { initTheme } from './utils/theme'

initTheme()

createRoot(document.getElementById('root')!).render(
  <Provider store={appStore}>
  <StrictMode>
    <App />
  </StrictMode>
  </Provider>,
)
