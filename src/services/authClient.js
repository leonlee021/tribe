import axios from 'axios';
import { API_BASE_URL } from '@env';

const createApiClient = () => {
  return axios.create({
    // baseURL: API_BASE_URL,
    baseURL: 'http://192.168.2.247:4000',
    timeout: 30000,
  });
};

export default createApiClient;