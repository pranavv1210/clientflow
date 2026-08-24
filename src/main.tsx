/**
 * Entry point.
 *
 * BrowserRouter rather than HashRouter because vercel.json rewrites every path
 * to index.html, so real URLs survive a refresh and can be bookmarked.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

const container = document.getElementById('root');
if (!container) throw new Error('#root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
