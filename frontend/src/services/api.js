const API_BASE_URL = 'https://smart-conversational-ai.onrender.com/api';

class ApiService {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    async sendMessage(userId, inputText, sessionId = null) {
        console.log('Sending message:', inputText);
        try {
            const response = await fetch(`${this.baseURL}/conversation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    inputText,
                    sessionId
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    async getPersona() {
    try {
        const response = await fetch(`${this.baseURL}/persona`);
        if (!response.ok) throw new Error('Failed to fetch persona');
        return await response.json();
    } catch (error) {
        console.error('Error fetching persona:', error);
        throw error;
    }
}

async getHistory(userId) {
    try {
        const response = await fetch(`${this.baseURL}/history/${userId}`);
        if (!response.ok) throw new Error('Failed to fetch history');
        return await response.json();
    } catch (error) {
        console.error('Error fetching history:', error);
        throw error;
    }
}

    async getHealth() {
        try {
            const response = await fetch(`${this.baseURL}/health`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error checking health:', error);
            throw error;
        }
    }
}

export default new ApiService();
