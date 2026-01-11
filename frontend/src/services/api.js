const API_BASE_URL = import.meta.env.VITE_API_URL;

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