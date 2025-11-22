import axios from 'axios';

// Configuration for backend URLs
const LOCAL_API_URL = 'http://localhost:5000/api';
const DEPLOYED_API_URL = 'https://online-test-platform-server-1q1h.onrender.com/api';

// Function to check if local backend is available
const checkLocalBackend = async () => {
  try {
    const response = await fetch(`${LOCAL_API_URL.replace('/api', '')}/`, {
      method: 'GET',
      timeout: 2000, // 2 second timeout
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

// Function to determine the API URL
const getApiUrl = async () => {
  // Check if we have a cached result that's still valid (cache for 5 minutes)
  const cached = localStorage.getItem('api_url_cache');
  const cacheTime = localStorage.getItem('api_url_cache_time');
  
  if (cached && cacheTime) {
    const timeDiff = Date.now() - parseInt(cacheTime);
    const fiveMinutes = 5 * 60 * 1000;
    
    if (timeDiff < fiveMinutes) {
      console.log(`Using cached API URL: ${cached}`);
      return cached;
    }
  }

  // Check if local backend is available
  console.log('Checking local backend availability...');
  const isLocalAvailable = await checkLocalBackend();
  
  const apiUrl = isLocalAvailable ? LOCAL_API_URL : DEPLOYED_API_URL;
  
  // Cache the result
  localStorage.setItem('api_url_cache', apiUrl);
  localStorage.setItem('api_url_cache_time', Date.now().toString());
  
  console.log(`API URL determined: ${apiUrl} (local: ${isLocalAvailable})`);
  return apiUrl;
};

// Initialize API base URL
let API_BASE_URL = DEPLOYED_API_URL; // Use deployed URL by default

// Update the base URL when the app loads
getApiUrl().then(url => {
  API_BASE_URL = url;
  api.defaults.baseURL = url;
}).catch(error => {
  console.warn('Failed to determine API URL, using deployed backend:', error);
  API_BASE_URL = DEPLOYED_API_URL;
});

const api = axios.create({
  baseURL: DEPLOYED_API_URL, // Use deployed URL by default
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // Increased to 30 second timeout
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration and backend failures
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle authentication errors
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(error);
    }

    // Log network errors for debugging
    if (!error.response) {
      console.error('Network error detected:', error);
    }

    return Promise.reject(error);
  }
);

// Function to manually refresh backend detection
api.refreshBackendUrl = async () => {
  localStorage.removeItem('api_url_cache');
  localStorage.removeItem('api_url_cache_time');
  const newUrl = await getApiUrl();
  api.defaults.baseURL = newUrl;
  return newUrl;
};

// Function to get current backend info
api.getBackendInfo = () => {
  return {
    currentUrl: api.defaults.baseURL,
    isLocal: api.defaults.baseURL === LOCAL_API_URL,
    cached: localStorage.getItem('api_url_cache'),
    cacheTime: localStorage.getItem('api_url_cache_time')
  };
};

export default api;