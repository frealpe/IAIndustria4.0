const { env } = require("./env");
const { ChatOpenAI } = require("@langchain/openai");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { ChatGroq } = require("@langchain/groq");

/**
 * Creates a Chat Model instance based on the environment configuration.
 * @param {Object} opts - Options for the model (temperature, maxTokens, etc.)
 * @returns {import("@langchain/core/language_models/chat_models").BaseChatModel}
 */
function getChatModel(opts = {}) {
    const temp = opts?.temperature ?? 0.2;
    const provider = env.MODEL_PROVIDER.toLowerCase();

    console.log(`🏭 Initializing AI Model using provider: ${provider.toUpperCase()}`);

    switch (provider) {
        case "gemini":
            if (!env.GOOGLE_API_KEY) throw new Error("GOOGLE_API_KEY is missing for Gemini provider");
            return new ChatGoogleGenerativeAI({
                apiKey: env.GOOGLE_API_KEY,
                modelName: env.GEMINI_MODEL,
                temperature: temp,
                ...opts
            });

        case "groq":
            if (!env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is missing for Groq provider");
            return new ChatGroq({
                apiKey: env.GROQ_API_KEY,
                modelName: env.GROQ_MODEL,
                temperature: temp,
                ...opts
            });

        case "openai":
        default:
            if (!env.OPENAI_API_KEY) console.warn("⚠️ OPENAI_API_KEY might be missing for OpenAI provider");
            return new ChatOpenAI({
                openAIApiKey: env.OPENAI_API_KEY,
                modelName: env.OPENAI_MODEL,
                temperature: temp,
                ...opts
            });
    }
}

/**
 * Gets the configured Local Model (Ollama/DeepSeek/Llama)
 * @param {string} type - 'sql' | 'llama'
 * @param {Object} opts 
 */
function getLocalModel(type = 'sql', opts = {}) {
    const modelName = type === 'sql' ? env.LOCAL_MODEL_SQL : env.LOCAL_MODEL_LLAMA;
    
    console.log(`🏠 Initializing Local AI Model: ${modelName}`);

    // Reusing ChatOpenAI logic for Ollama compatibility
    return new ChatOpenAI({
        modelName: modelName,
        openAIApiKey: "ollama", // Dummy key
        configuration: {
            baseURL: env.OLLAMA_BASE_URL
        },
        temperature: 0,
        ...opts
    });
}

module.exports = { getChatModel, getLocalModel };