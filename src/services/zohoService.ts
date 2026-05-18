import { Client } from '../types';
import axios from 'axios';

export const syncClientToZoho = async (client: Client) => {
    // Call our server API route which will handle Zoho interaction securely
    const response = await axios.post('/api/zoho/sync', { client });
    return response.data;
};
