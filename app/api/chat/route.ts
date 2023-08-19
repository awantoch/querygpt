import OpenAI from 'openai';
import { Client } from 'pg';

async function getCreateTableStatements(connectionString: string): Promise<string[]> {
  const client = new Client({ connectionString });
  await client.connect();

  const query = `
    SELECT table_name, column_name, column_default, is_nullable, data_type, character_maximum_length
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `;

  const res = await client.query(query);
  await client.end();

  const tables: { [key: string]: any[] } = {};
  res.rows.forEach((row: any) => {
    if (!tables[row.table_name]) tables[row.table_name] = [];
    tables[row.table_name].push(row);
  });

  const createTableStatements = Object.keys(tables).map(tableName => {
    const columns = tables[tableName]
      .map(column => {
        const type = column.character_maximum_length ? `${column.data_type}(${column.character_maximum_length})` : column.data_type;
        const defaultVal = column.column_default ? `DEFAULT ${column.column_default}` : '';
        const nullable = column.is_nullable === 'YES' ? '' : 'NOT NULL';
        return `  ${column.column_name} ${type} ${defaultVal} ${nullable}`;
      })
      .join(',\n');

    return `CREATE TABLE ${tableName} (\n${columns}\n);`;
  });

  return createTableStatements;
}

export async function POST(request: Request): Promise<Response> {
  if (!process.env.OPENAI_API_KEY) return new Response(JSON.stringify({ message: 'OpenAI API key not found' }), { status: 500 });
  if (!process.env.POSTGRES_CONNECTION_STRING) return new Response(JSON.stringify({ message: 'Postgres connection string not found' }), { status: 500 });

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const { query } = await request.json();

  let conversation = [];
  conversation.push({
    'role': 'system',
    'content': `In the next several prompts, you will receive a database schema and a natural language request from the user.
      Your job is to generate the SQL query that answers the request. Print only the query itself.`
      .replaceAll('  ', ' ').replaceAll('\n', ''),
  });

  try {
    const createTableStatements = await getCreateTableStatements(process.env.POSTGRES_CONNECTION_STRING);
    createTableStatements.forEach((part) => {
      conversation.push({ 'role': 'system', 'content': `${part}` });
    });
  } catch (error) {
    return new Response(JSON.stringify({ message: 'Failed to get CREATE TABLE statements', error }), { status: 500 });
  }

  // Add the user's query to the conversation
  conversation.push({ 'role': 'user', 'content': query });

  console.log({ conversation });

  const completion = await openai.chat.completions.create({
    messages: conversation as any,
    model: 'gpt-4',
  });

  return new Response(`${completion.choices[0].message.content}`, { status: 200 });
}
