require('dotenv').config();

const env = {
    MODEL_PROVIDER: process.env.MODEL_PROVIDER || 'openai', // 'openai' | 'gemini' | 'groq'
    
    // OpenAI
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o',

    // // Google Gemini
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-pro',

    // // Groq
    // GROQ_API_KEY: process.env.GROQ_API_KEY,
    // GROQ_MODEL: process.env.GROQ_MODEL || 'mixtral-8x7b-32768',

    // Local
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1",
    LOCAL_MODEL: process.env.LOCAL_MODEL || "deepseek-coder:6.7b"
};

module.exports = { env };
