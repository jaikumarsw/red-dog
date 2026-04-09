// OpenAI is stubbed — set OPENAI_API_KEY in .env to enable real AI responses.
let openai = null;

if (process.env.OPENAI_API_KEY) {
  const { OpenAI } = require('openai');
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

module.exports = openai;
