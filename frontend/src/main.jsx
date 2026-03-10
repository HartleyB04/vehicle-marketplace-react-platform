import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from "./contexts/AuthContext.jsx";  
import './index.css';
import App from './App.jsx';
import { NotificationProvider } from './contexts/NotificationContext.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <NotificationProvider>
      <App />
      </NotificationProvider>
    </AuthProvider>
  </StrictMode>
);
