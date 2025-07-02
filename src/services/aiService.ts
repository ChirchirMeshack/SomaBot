/**
 * AI Service - OpenAI API integration (minimal)
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Send a prompt or conversation history to OpenAI and return the response (GPT-3.5-turbo)
 * @param messages - Array of message objects (OpenAI format: {role, content})
 * @returns AI response string
 */
export async function askOpenAI(messages: { role: string; content: string }[] | string): Promise<string> {
  if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY not set');
  let msgArr: { role: string; content: string }[];
  if (typeof messages === 'string') {
    msgArr = [{ role: 'user', content: messages }];
  } else {
    msgArr = messages;
  }
  const res = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: msgArr,
      max_tokens: 256
    })
  });
  if (!res.ok) throw new Error('OpenAI API error: ' + res.status);
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

/**
 * Generate a multiple-choice quiz question from lesson content using OpenAI
 * @param lessonTitle - Title of the lesson
 * @param lessonContent - Content of the lesson
 * @param difficulty - Difficulty level ('easy' | 'medium' | 'hard')
 * @returns Quiz question as a string
 */
export async function generateQuizQuestion(lessonTitle: string, lessonContent: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium'): Promise<string> {
  const systemPrompt = `Generate a ${difficulty} multiple-choice quiz question (with 4 options, A-D) based on the following lesson. Format: Question, then options A-D, then indicate the correct answer.\nLesson Title: ${lessonTitle}\nLesson Content: ${lessonContent}`;
  const messages = [
    { role: 'system', content: systemPrompt }
  ];
  return askOpenAI(messages);
}

/**
 * Generate feedback on a quiz answer using OpenAI
 * @param question - The quiz question
 * @param correctAnswer - The correct answer (e.g., 'B')
 * @param userAnswer - The user's answer (e.g., 'A')
 * @returns Feedback as a string
 */
export async function generateQuizFeedback(question: string, correctAnswer: string, userAnswer: string): Promise<string> {
  const systemPrompt = `Given the following quiz question, the correct answer, and the user's answer, explain why the answer is correct or incorrect and provide a helpful hint.\nQuestion: ${question}\nCorrect Answer: ${correctAnswer}\nUser Answer: ${userAnswer}`;
  const messages = [
    { role: 'system', content: systemPrompt }
  ];
  return askOpenAI(messages);
}

/**
 * Generate learning insights and suggestions from user progress using OpenAI
 * @param progressData - User's progress data (object or array)
 * @returns Insights as a string
 */
export async function generateProgressInsights(progressData: any): Promise<string> {
  const systemPrompt = `Given this user progress data, summarize their learning patterns and suggest improvements.\nProgress Data: ${JSON.stringify(progressData)}`;
  const messages = [
    { role: 'system', content: systemPrompt }
  ];
  return askOpenAI(messages);
} 