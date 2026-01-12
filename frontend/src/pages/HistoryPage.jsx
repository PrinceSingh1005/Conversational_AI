import React, { useEffect, useState } from 'react';
import api from '../services/api';
const HistoryPage = ({userId}) => {
    // Mock history data
    // const mockHistory = [
    //     {
    //         id: 1,
    //         date: '2024-01-10',
    //         summary: 'Discussed interests in anime and backend systems',
    //         emotion: 'positive',
    //         duration: '12 min'
    //     },
    //     {
    //         id: 2,
    //         date: '2024-01-09',
    //         summary: 'Talked about emotional wellbeing and stress management',
    //         emotion: 'empathetic',
    //         duration: '8 min'
    //     },
    //     {
    //         id: 3,
    //         date: '2024-01-08',
    //         summary: 'Shared thoughts on technology and personal growth',
    //         emotion: 'neutral',
    //         duration: '15 min'
    //     }
    // ];

    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() =>{
        async function fetchHistory(){
            try{
                const data = await api.getHistory(userId);
                setHistory(data);
            }catch(error){
                console.error('Error fetching history:', error);
            }
            finally{
                setLoading(false);
            }
        }
        fetchHistory();
    },[userId])
    if (loading) return <div>Loading...</div>;
    if (history.length === 0) return <div>No conversation history found.</div>;

    const getEmotionColor = (emotion) => {
        switch (emotion) {
            case 'positive':
                return 'bg-green-100 text-green-800';
            case 'empathetic':
                return 'bg-purple-100 text-purple-800';
            case 'neutral':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Conversation History</h2>
                <p className="text-gray-600">Browse your past conversations with Astra</p>
            </div>

            <div className="space-y-4">
                {history.map((item) => (
                    <div
                        key={item.id}
                        className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-semibold text-gray-900">{item.summary}</h3>
                                <p className="text-sm text-gray-500 mt-1">{item.date} • {item.duration}</p>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEmotionColor(item.emotion)}`}>
                                {item.emotion}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HistoryPage;