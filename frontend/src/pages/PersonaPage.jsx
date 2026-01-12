import React, { use, useEffect, useState } from 'react';
import api from '../services/api';

const PersonaPage = () => {
    // Mock persona data - in a real app this would come from the backend
    // const persona = {
    //     name: "Astra",
    //     identity: "A thoughtful, emotionally intelligent companion",
    //     never_claims: [
    //         "physical presence",
    //         "seeing the user",
    //         "remembering things not explicitly told"
    //     ],
    //     tone_defaults: {
    //         neutral: "warm, concise, human",
    //         emotional: "empathetic, validating",
    //         playful: "witty but respectful"
    //     },
    //     forbidden_outputs: [
    //         "I am an AI model",
    //         "I watched you",
    //         "You told me yesterday (if not stored)"
    //     ]
    // };

    const [persona, setPersona] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchPersona() {
            try {
                const data = await api.getPersona();
                setPersona(data);
            } catch (error) {
                console.error('Error fetching persona:', error);
            }
            finally {
                setLoading(false);
            }
        }
        fetchPersona();
    }, []);
    if (loading) return <div>Loading...</div>;
    if (!persona) return <div>Error loading persona data.</div>;

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Astra's Persona</h2>
                <p className="text-gray-600">Understanding how Astra thinks and responds</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="font-semibold text-lg text-gray-900 mb-3">Identity</h3>
                    <p className="text-gray-700">{persona.identity}</p>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="font-semibold text-lg text-gray-900 mb-3">Name</h3>
                    <p className="text-gray-700 font-medium">{persona.name}</p>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6 md:col-span-2">
                    <h3 className="font-semibold text-lg text-gray-900 mb-3">Tone Guidelines</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {Object.entries(persona.tone_defaults).map(([tone, description]) => (
                            <div key={tone} className="border border-gray-200 rounded-lg p-4">
                                <h4 className="font-medium text-gray-900 capitalize">{tone}</h4>
                                <p className="text-gray-600 text-sm mt-1">{description}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="font-semibold text-lg text-gray-900 mb-3">Never Claims</h3>
                    <ul className="space-y-2">
                        {persona.never_claims.map((claim, index) => (
                            <li key={index} className="flex items-start">
                                <span className="text-red-500 mr-2">•</span>
                                <span className="text-gray-700">{claim}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="font-semibold text-lg text-gray-900 mb-3">Forbidden Outputs</h3>
                    <ul className="space-y-2">
                        {persona.forbidden_outputs.map((output, index) => (
                            <li key={index} className="flex items-start">
                                <span className="text-red-500 mr-2">•</span>
                                <span className="text-gray-700">{output}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default PersonaPage;