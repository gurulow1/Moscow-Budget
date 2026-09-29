import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
// First, so Tailwind sets the order of the cascade layers before any component stylesheet joins them.
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
