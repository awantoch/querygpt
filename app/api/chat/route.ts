import OpenAI from 'openai';
import fs from 'fs';

export async function POST(request: Request): Promise<Response> {
  if (!process.env.OPENAI_API_KEY) return new Response(JSON.stringify({ message: 'OpenAI API key not found' }), { status: 500 });
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const { query } = await request.json();

  let conversation = [];
  conversation.push({
    'role': 'system',
    'content': `In the next several prompts, you will receive a database schema and a natural language request from the user.
      Your job is to generate the SQL query that answers the request. Print only the query itself.`
      .replaceAll('  ', ' ').replaceAll('\n', ''),
  });

  const schemaLines = fs.readFileSync('schema.sql', 'utf-8').split('\n\n');

  // feed the table definitions to the AI
  // note: this is not a perfect solution, as other constraints will need to be inferred, but reduces the number of prompts to within the token limit
  schemaLines.forEach((part) => {
    if (part.includes('CREATE TABLE')) {
      conversation.push({ 'role': 'system', 'content': `${part}` });
    }
  });

  // Add the user's query to the conversation
  conversation.push({ 'role': 'user', 'content': query });

  const completion = await openai.chat.completions.create({
    messages: conversation as any,
    model: 'gpt-4',
  });

  return new Response(`${completion.choices[0].message.content}`, { status: 200 });
}
