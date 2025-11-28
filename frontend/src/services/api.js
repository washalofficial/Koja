import axios from 'axios';

const api = axios.create({ baseURL: 'http://10.0.2.2:4000/api' }); // use localhost for emulator

export default api;
