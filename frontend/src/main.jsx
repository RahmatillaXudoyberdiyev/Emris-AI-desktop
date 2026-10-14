import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

try {
    console.log("Mounting Emris AI React application...");
    const rootElement = document.getElementById('root');
    if (rootElement) {
        ReactDOM.createRoot(rootElement).render(
            <React.StrictMode>
                <App />
            </React.StrictMode>
        );
    }
} catch (error) {
    console.error("Critical error mounting React application:", error);
}
