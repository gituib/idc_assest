import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AuthInitializer from './components/AuthInitializer';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary fullPage>
      <AuthInitializer>
        <App />
      </AuthInitializer>
    </ErrorBoundary>
  </React.StrictMode>
);