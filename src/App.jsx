import React, { useState, useEffect } from 'react';

// Main App component
const App = () => {
    // State variables for the input keyword, generated ideas, loading status, and error messages
    const [seedKeyword, setSeedKeyword] = useState('');
    const [keywordIdeas, setKeywordIdeas] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Firebase related states (required for potential future storage, though not used in this initial version)
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);

    // Initialize Firebase and handle authentication
    useEffect(() => {
        const initializeFirebase = async () => {
            try {
                // Access global variables provided by the Canvas environment
                const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
                const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

                if (firebaseConfig) {
                    // Dynamically import Firebase modules
                    const { initializeApp } = await import('firebase/app');
                    const { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } = await import('firebase/auth');
                    const { getFirestore } = await import('firebase/firestore');

                    const app = initializeApp(firebaseConfig);
                    const firestoreDb = getFirestore(app);
                    const firebaseAuth = getAuth(app);

                    setDb(firestoreDb);
                    setAuth(firebaseAuth);

                    // Sign in with custom token if available, otherwise anonymously
                    if (initialAuthToken) {
                        await signInWithCustomToken(firebaseAuth, initialAuthToken);
                    } else {
                        await signInAnonymously(firebaseAuth);
                    }

                    // Listen for auth state changes to get the user ID
                    onAuthStateChanged(firebaseAuth, (user) => {
                        if (user) {
                            setUserId(user.uid);
                        } else {
                            setUserId(crypto.randomUUID()); // Fallback for unauthenticated users
                        }
                    });
                } else {
                    console.warn("Firebase config not found. Running without Firebase features.");
                    setUserId(crypto.randomUUID()); // Still provide a userId for consistency
                }
            } catch (err) {
                console.error("Failed to initialize Firebase:", err);
                setError("Failed to initialize Firebase. Some features might be unavailable.");
                setUserId(crypto.randomUUID()); // Still provide a userId for consistency
            }
        };

        initializeFirebase();
    }, []); // Run only once on component mount

    // Function to call the LLM API and generate keyword ideas
    const generateKeywordIdeas = async () => {
        if (!seedKeyword.trim()) {
            setError("Please enter a seed keyword.");
            return;
        }

        setIsLoading(true);
        setError('');
        setKeywordIdeas([]); // Clear previous ideas

        try {
            // Construct the prompt for the LLM
            const prompt = `Generate a list of 10-15 relevant keyword ideas, including long-tail variations and related phrases, for the seed keyword: '${seedKeyword}'. Focus on keywords that indicate search intent (e.g., informational, commercial, navigational). Format the output as a comma-separated list.`;

            let chatHistory = [];
            chatHistory.push({ role: "user", parts: [{ text: prompt }] });

            const payload = { contents: chatHistory };
            const apiKey = ""; // Canvas will automatically provide this key

            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
            }

            const result = await response.json();

            if (result.candidates && result.candidates.length > 0 &&
                result.candidates[0].content && result.candidates[0].content.parts &&
                result.candidates[0].content.parts.length > 0) {
                const text = result.candidates[0].content.parts[0].text;
                // Split the comma-separated string into an array and trim whitespace
                const ideas = text.split(',').map(item => item.trim()).filter(item => item.length > 0);
                setKeywordIdeas(ideas);
            } else {
                setError("Could not generate keyword ideas. Please try again.");
            }
        } catch (err) {
            console.error("Error generating keyword ideas:", err);
            setError(`Failed to generate ideas: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-inter">
            <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl">
                <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
                    SEO Keyword Idea Generator
                </h1>

                {/* User ID display (for multi-user context, if storage were implemented) */}
                {userId && (
                    <div className="text-sm text-gray-600 text-center mb-4">
                        Your User ID: <span className="font-mono bg-gray-200 px-2 py-1 rounded-md">{userId}</span>
                    </div>
                )}

                <div className="mb-6">
                    <label htmlFor="seed-keyword" className="block text-gray-700 text-sm font-semibold mb-2">
                        Enter a Seed Keyword:
                    </label>
                    <input
                        type="text"
                        id="seed-keyword"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                        placeholder="e.g., 'healthy recipes', 'best coffee machine'"
                        value={seedKeyword}
                        onChange={(e) => setSeedKeyword(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                generateKeywordIdeas();
                            }
                        }}
                    />
                </div>

                <button
                    onClick={generateKeywordIdeas}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 ease-in-out transform hover:scale-105"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generating...
                        </span>
                    ) : (
                        'Generate Keyword Ideas'
                    )}
                </button>

                {error && (
                    <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
                        {error}
                    </div>
                )}

                {keywordIdeas.length > 0 && (
                    <div className="mt-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Generated Keyword Ideas:</h2>
                        <ul className="list-disc pl-5 space-y-2 text-gray-700">
                            {keywordIdeas.map((idea, index) => (
                                <li key={index} className="bg-white p-2 rounded-md shadow-sm border border-gray-100 flex items-center justify-between">
                                    <span>{idea}</span>
                                    {/* Optional: Add a copy button for each keyword */}
                                    <button
                                        onClick={() => {
                                            // Using document.execCommand('copy') for clipboard operations in iframes
                                            const el = document.createElement('textarea');
                                            el.value = idea;
                                            document.body.appendChild(el);
                                            el.select();
                                            document.execCommand('copy');
                                            document.body.removeChild(el);
                                            // You could add a temporary "Copied!" message here
                                        }}
                                        className="ml-2 text-blue-500 hover:text-blue-700 text-sm"
                                        title="Copy keyword"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                        </svg>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;
