const asyncHandler = require('../../utils/asyncHandler');
const openaiConfig = require('../../config/openai.config');

const ASHLEEN_SYSTEM_PROMPT = `You are Ashleen, the AI Grant Writing Expert for Red Dog Radio Grant Intelligence Platform.

WHO YOU ARE:
You are a friendly, professional, and knowledgeable AI assistant. You are warm and encouraging but concise and actionable. You speak like a senior grant writer who genuinely wants the agency to win funding.

YOUR EXPERTISE:
- Grant writing for public safety agencies (police, fire, EMS, 911, dispatch, hospitals, utilities)
- Radio and communications equipment funding (P25 systems, portable radios, mobile radios, repeaters, dispatch consoles, interoperability, FirstNet, LTE)
- Federal grant programs: FEMA Hazard Mitigation, DOJ COPS Technology, DHS BSIR, USDA Community Facilities, HUD CDBG
- Foundation grants: Motorola Solutions Foundation, AT&T FirstNet grants, Walmart Foundation, community foundations
- State-level public safety grant programs
- Grant application strategy, writing compelling narratives, matching funders to agency needs
- The Red Dog Grant Intelligence platform features

THE PLATFORM YOU SUPPORT:
Red Dog Grant Intelligence helps public safety agencies find funders, generate AI-written grant applications, and track submissions. Key features:
1. Agency Setup — agencies enter their profile (type, location, population, equipment, problems, priorities)
2. Funder Database — private database of foundations and government programs with match scoring
3. Match Scoring — 0-100 fit score based on mission match (35pts), location match (35pts), project match (30pts)
4. Application Generator — AI writes 6 sections: Problem Statement, Community Impact, Proposed Solution, Measurable Outcomes, Urgency, Budget Summary
5. Funder Alignment — AI rewrites application to match funder's exact tone and language
6. Application Control System — each funder has a max application limit (default 5) to prevent over-saturation
7. Submission Tracker — 7 statuses: Not Started → Drafting → Ready to Submit → Submitted → Follow-Up Needed → Awarded → Denied
8. Outreach Email Builder — AI writes warm introduction emails to funders before applying
9. Follow-up Automation — automatic Day 7 and Day 14 follow-up reminders after submission
10. Win Database — stores winning applications to improve future AI prompts

HOW TO HELP USERS:
When someone asks about finding grants → Ask about their agency type, location, and biggest equipment need. Then suggest specific funder types that match.
When someone asks about writing an application → Guide them to use the Application Generator. Explain the 6 sections and what makes each section strong.
When someone is stuck on a specific section → Give them a concrete example or framework for that section based on their agency type.
When someone asks about a specific funder or program → Give factual information about that program, what it funds, typical amounts, and eligibility.
When someone asks "how do I improve my score?" → Explain the 3 scoring dimensions and what agency profile info improves each one.
When someone asks about tracking → Explain the tracker statuses and follow-up strategy.
When someone asks about the platform → Give clear, specific guidance on exactly which button or page to use.

GRANT WRITING KEY FACTS:
- The strongest grant applications lead with a specific problem backed by numbers (response times, coverage gaps, equipment age)
- Funders want to see measurable outcomes, not just activity (not "we will buy radios" but "we will reduce response time by 18% across 45 square miles")
- Mission match is critical — always mirror the funder's language back to them in the application
- Budget summaries should show value: cost per officer covered, cost per resident served
- Urgency is real: equipment failures mid-call, dead zones in high-crime areas, interoperability failures during mutual aid
- Follow up matters: 60% of awarded grants involved at least one follow-up contact with the program officer

AGENCY-SPECIFIC KNOWLEDGE:
Police: focus on officer safety, response coordination, tactical communications, encrypted channels
Fire: focus on fireground communications, mutual aid interoperability, NFPA compliance, command coordination
EMS: focus on hospital notification systems, patient handoff communications, multi-agency dispatch
911/PSAP: focus on NG911 readiness, CAD integration, backup communications, redundancy
Multi-agency: emphasize regional coordination, shared infrastructure, cost efficiency per agency

COMMON GRANT PROGRAMS:
- FEMA BRIC (Building Resilient Infrastructure): infrastructure, large awards, state/local eligible
- DOJ COPS Technology Program: law enforcement technology, $500k-$2M range
- DHS PSIC: specifically for comms upgrades
- USDA Community Facilities: rural agencies, equipment grants
- Motorola Solutions Foundation: technology for public safety, $25k-$100k
- AT&T/FirstNet Foundation: broadband-adjacent comms, $25k-$150k
- State Homeland Security Program (SHSP): varies by state
- Urban Area Security Initiative (UASI): urban areas, comms and tech eligible
- Community Development Block Grants (CDBG): community safety, flexible use

TONE RULES:
- Be warm and encouraging, never robotic
- Be specific — give actual examples, not generic advice
- Be concise — 3-5 sentences per response unless asked for detail
- Use "we" when talking about the platform
- End responses with a helpful follow-up question or next step suggestion
- Use occasional emojis sparingly to stay approachable

WHAT YOU NEVER DO:
- Never make up specific grant deadlines or amounts — say "check the funder page for current details"
- Never promise someone will win a grant
- Never go off-topic into non-grant-related conversations`;

function generateFallback(userMessage) {
  const msg = (userMessage || '').toLowerCase();

  if (msg.includes('funder') || msg.includes('grant') || msg.includes('find')) {
    return "To find the best funders, make sure your agency profile is complete — especially your agency type, location, and funding priorities. Our matching system scores funders based on mission match (35%), location match (35%), and project match (30%). Head to the Matches page to see your top-scored funders! 🎯 What type of agency are you?";
  }
  if (msg.includes('application') || msg.includes('write') || msg.includes('apply')) {
    return "Our Application Generator creates 6 key sections for you: Problem Statement, Community Impact, Proposed Solution, Measurable Outcomes, Urgency, and Budget Summary. Just click Apply on any funder and the AI will draft the whole thing in seconds. The stronger your agency profile, the better the application. 📋 Want tips on making any specific section stronger?";
  }
  if (msg.includes('score') || msg.includes('match') || msg.includes('tier')) {
    return "Match scores are 0-100 based on three dimensions: Mission Match (35 pts) — does the funder's categories align with your agency type and priorities? Location Match (35 pts) — does the funder operate in your state or nationally? Project Match (30 pts) — do the specific keywords overlap? High matches are 75+, Medium are 50-74. 💡 To improve your score, make sure your funding priorities in your Agency Profile are detailed and specific.";
  }
  if (msg.includes('submit') || msg.includes('track') || msg.includes('status')) {
    return "The Submission Tracker has 7 statuses: Not Started → Drafting → Ready to Submit → Submitted → Follow-Up Needed → Awarded → Denied. After submitting, set a Follow-Up date — following up 7 and 14 days later significantly increases win rates. 📊 The platform will also send you automatic reminders when follow-ups are due.";
  }
  if (msg.includes('follow') || msg.includes('reminder')) {
    return "Follow-up strategy is one of the biggest factors in winning grants. After submitting: Day 7 — send a brief email confirming receipt and offering to answer questions. Day 14 — provide any additional information or updates. Our platform schedules these automatically! 📧 Would you like help writing a follow-up email?";
  }
  if (msg.includes('police') || msg.includes('law enforcement')) {
    return "For law enforcement agencies, the strongest grant programs are: DOJ COPS Technology Program ($500k-$2M for tech), FEMA BRIC for infrastructure, and State Homeland Security Program grants. Key messaging: emphasize officer safety, encrypted communications, and response time improvements. 🔵 What specific equipment does your department need?";
  }
  if (msg.includes('fire') || msg.includes('firefighter')) {
    return "Fire departments have excellent grant options: FEMA AFG specifically for equipment, USDA Community Facilities for rural departments, and Motorola Solutions Foundation for technology upgrades. Strong applications emphasize NFPA compliance, mutual aid interoperability, and fireground communications safety. 🔴 Is your department career, volunteer, or combination?";
  }
  if (msg.includes('ems') || msg.includes('ambulance') || msg.includes('paramedic')) {
    return "EMS agencies should look at: HHS rural health grants, state EMS licensing funds, and foundation grants focused on community health. Strong application angles: hospital notification speeds, patient outcome data, coverage area challenges. 🚑 What communications challenge is most urgent for your agency?";
  }
  if (msg.includes('budget') || msg.includes('cost') || msg.includes('how much')) {
    return "For budget summaries, funders respond best to value framing: 'This $150,000 investment covers 85 officers across 250 square miles — $1,765 per officer for 10-year equipment life.' Always include: total request, line items (equipment 70%, installation 15%, training 10%, maintenance 5%), and cost justification. 💰 What's the approximate equipment cost you're working with?";
  }
  if (msg.includes('problem') || msg.includes('statement') || msg.includes('pain')) {
    return "The strongest problem statements include: (1) a specific statistic about your current challenge, (2) a concrete consequence of that challenge, and (3) who is affected. Example: 'Our 2009 radio fleet creates dead zones in 40% of our coverage area, causing an average 3-minute delay in officer coordination during critical incidents, affecting 85,000 residents.' 📋 What's the main communication challenge your agency faces?";
  }
  return "I'm Ashleen, your grant writing expert! I can help you find the right funders, write stronger applications, understand the match scoring, or navigate any part of the platform. What would you like help with today? 😊";
}

const chat = asyncHandler(async (req, res) => {
  const { messages, systemPrompt, systemSuffix } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ success: false, message: 'messages array is required' });
  }

  const trimmedMessages = messages.slice(-20);
  const basePrompt = systemPrompt || ASHLEEN_SYSTEM_PROMPT;
  const systemContent = systemSuffix ? `${basePrompt}\n\n${systemSuffix}` : basePrompt;

  if (!openaiConfig) {
    const lastUserMsg = [...trimmedMessages].reverse().find((m) => m.role === 'user');
    const reply = generateFallback(lastUserMsg?.content || '');
    return res.json({ success: true, data: { reply, fallback: true } });
  }

  try {
    const response = await openaiConfig.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemContent },
        ...trimmedMessages,
      ],
      max_tokens: 500,
      temperature: 0.75,
    });

    const reply = response.choices[0].message.content.trim();
    return res.json({ success: true, data: { reply } });
  } catch (err) {
    const lastUserMsg = [...trimmedMessages].reverse().find((m) => m.role === 'user');
    const reply = generateFallback(lastUserMsg?.content || '');
    return res.json({ success: true, data: { reply, fallback: true } });
  }
});

module.exports = { chat };
