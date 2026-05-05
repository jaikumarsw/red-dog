const openaiConfig = require('../../config/openai.config');

const generateSuggestedReply = async ({ funderEmailBody, historyText, agencyProfile, applicationDetails }) => {
  if (!openaiConfig) {
    return {
      suggestion: 'No AI available. Please write a reply manually.',
      flags: ['ai_unavailable']
    };
  }

  const systemPrompt = `You are Ashleen, an AI Grant Writing Expert.
Your task is to draft a highly professional, courteous, and strategic email reply to a funder on behalf of the agency.
You will be provided with:
- The Funder's email body
- The communication history
- The Agency's profile
- Application Details

Draft a reply that addresses the funder's email perfectly. 
Keep it concise, professional, and appreciative. 
If the funder asked questions, draft answers based on the agency profile or leave clear [DATA NEEDED] placeholders if information is missing.
Only return the email body text. Do not include subject line or greetings if they are redundant.`;

  const userPrompt = `
Funder's Email:
${funderEmailBody}

Communication History:
${historyText || 'No previous history.'}

Agency Profile:
Name: ${agencyProfile?.name || 'Unknown'}
Type: ${agencyProfile?.agencyType || 'Unknown'}
Location: ${agencyProfile?.city}, ${agencyProfile?.state}
Mission: ${agencyProfile?.missionStatement || 'N/A'}

Application:
Title: ${applicationDetails?.projectTitle || 'N/A'}

Draft the reply:`;

  try {
    const response = await openaiConfig.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 600,
      temperature: 0.7,
    });

    const suggestion = response.choices[0].message.content.trim();
    const flags = [];
    if (suggestion.includes('[DATA NEEDED]')) {
      flags.push('requires_review');
    }
    
    return { suggestion, flags };
  } catch (error) {
    console.error('[Ashleen Service] generateSuggestedReply failed:', error);
    return { suggestion: 'Failed to generate a reply due to an error.', flags: ['error'] };
  }
};

module.exports = {
  generateSuggestedReply
};
