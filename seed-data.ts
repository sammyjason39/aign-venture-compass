import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

function parseVal(val: string): any {
  if (val === '\\N' || val === undefined) return null;
  // Unescape standard PG escapes
  let unescaped = val
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\\/g, '\\');
  return unescaped;
}

function parseJsonVal(val: string): any {
  const parsed = parseVal(val);
  if (!parsed) return null;
  try {
    return JSON.parse(parsed);
  } catch (e) {
    console.warn(`Failed to parse JSON: ${parsed.substring(0, 100)}...`);
    return parsed;
  }
}

function parseDataSql(file_path: string) {
  const content = fs.readFileSync(file_path, 'utf8');
  const lines = content.split(/\r?\n/);

  const tables: Record<string, { cols: string[]; rows: any[][] }> = {};
  let currentTable: string | null = null;
  let currentCols: string[] = [];
  let currentRows: any[][] = [];

  const copyPattern = /COPY\s+([\w\.]+)\s*\((.*?)\)\s*FROM\s+stdin;/i;

  for (const line of lines) {
    const lineStripped = line.trim();
    
    if (currentTable !== null) {
      if (lineStripped === '\\.') {
        tables[currentTable] = {
          cols: currentCols,
          rows: currentRows
        };
        currentTable = null;
        currentCols = [];
        currentRows = [];
      } else {
        const rowParts = line.replace(/\r?\n$/, '').split('\t');
        currentRows.push(rowParts);
      }
    } else {
      const match = copyPattern.exec(lineStripped);
      if (match) {
        currentTable = match[1];
        currentCols = match[2].split(',').map(c => c.trim());
        currentRows = [];
      }
    }
  }

  return tables;
}

async function seed() {
  console.log('Parsing data.sql...');
  const tables = parseDataSql('extracted_export/db/data.sql');
  
  // 1. Seed Auth Users
  const authUsersData = tables['auth.users'];
  if (authUsersData) {
    console.log(`Seeding ${authUsersData.rows.length} auth users...`);
    const idColIdx = authUsersData.cols.indexOf('id');
    const emailColIdx = authUsersData.cols.indexOf('email');
    const metaColIdx = authUsersData.cols.indexOf('raw_user_meta_data');
    
    // Get existing users to avoid duplicates
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('Error listing existing users:', listError.message);
      process.exit(1);
    }
    const existingEmails = new Set(existingUsers.users.map(u => u.email?.toLowerCase()));

    for (const row of authUsersData.rows) {
      const id = parseVal(row[idColIdx]);
      const email = parseVal(row[emailColIdx]);
      const meta = parseJsonVal(row[metaColIdx]) || {};
      
      if (!email) continue;

      if (existingEmails.has(email.toLowerCase())) {
        console.log(`User ${email} already exists in Auth. Skipping creation.`);
        continue;
      }

      console.log(`Creating user: ${email} (${id})...`);
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        id: id,
        email: email,
        password: 'Password123!', // Default password for all seeded users
        email_confirm: true,
        user_metadata: meta
      });

      if (createError) {
        console.error(`Failed to create user ${email}:`, createError.message);
      } else {
        console.log(`Successfully created user ${email}`);
      }
    }
  }

  // 2. Seed public.allowed_users
  const allowedUsersData = tables['public.allowed_users'];
  if (allowedUsersData) {
    console.log(`Seeding ${allowedUsersData.rows.length} allowed_users...`);
    const emailIdx = allowedUsersData.cols.indexOf('email');
    const roleIdx = allowedUsersData.cols.indexOf('role');
    const createdAtIdx = allowedUsersData.cols.indexOf('created_at');

    const payload = allowedUsersData.rows.map(row => ({
      email: parseVal(row[emailIdx]),
      role: parseVal(row[roleIdx]),
      created_at: parseVal(row[createdAtIdx]) || new Date().toISOString()
    })).filter(item => item.email);

    const { error } = await supabase.from('allowed_users').upsert(payload, { onConflict: 'email' });
    if (error) console.error('Error seeding allowed_users:', error.message);
    else console.log('Successfully seeded allowed_users.');
  }

  // 3. Seed public.profiles
  const profilesData = tables['public.profiles'];
  if (profilesData) {
    console.log(`Seeding ${profilesData.rows.length} profiles...`);
    const idIdx = profilesData.cols.indexOf('id');
    const fullNameIdx = profilesData.cols.indexOf('full_name');
    const emailIdx = profilesData.cols.indexOf('email');
    const createdAtIdx = profilesData.cols.indexOf('created_at');
    const updatedAtIdx = profilesData.cols.indexOf('updated_at');
    const salutationIdx = profilesData.cols.indexOf('salutation');

    const payload = profilesData.rows.map(row => ({
      id: parseVal(row[idIdx]),
      full_name: parseVal(row[fullNameIdx]),
      email: parseVal(row[emailIdx]),
      created_at: parseVal(row[createdAtIdx]) || new Date().toISOString(),
      updated_at: parseVal(row[updatedAtIdx]) || new Date().toISOString(),
      salutation: parseVal(row[salutationIdx])
    })).filter(item => item.id);

    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
    if (error) console.error('Error seeding profiles:', error.message);
    else console.log('Successfully seeded profiles.');
  }

  // 4. Seed public.user_roles
  const userRolesData = tables['public.user_roles'];
  if (userRolesData) {
    console.log(`Seeding ${userRolesData.rows.length} user_roles...`);
    const idIdx = userRolesData.cols.indexOf('id');
    const userIdIdx = userRolesData.cols.indexOf('user_id');
    const roleIdx = userRolesData.cols.indexOf('role');
    const createdAtIdx = userRolesData.cols.indexOf('created_at');

    const payload = userRolesData.rows.map(row => ({
      id: parseVal(row[idIdx]),
      user_id: parseVal(row[userIdIdx]),
      role: parseVal(row[roleIdx]),
      created_at: parseVal(row[createdAtIdx]) || new Date().toISOString()
    })).filter(item => item.user_id);

    const { error } = await supabase.from('user_roles').upsert(payload, { onConflict: 'user_id,role' });
    if (error) console.error('Error seeding user_roles:', error.message);
    else console.log('Successfully seeded user_roles.');
  }

  // 5. Seed public.startups
  const startupsData = tables['public.startups'];
  if (startupsData) {
    console.log(`Seeding ${startupsData.rows.length} startups...`);
    
    const payload = startupsData.rows.map(row => {
      const item: Record<string, any> = {};
      startupsData.cols.forEach((col, idx) => {
        const val = row[idx];
        if (col === 'ai_scores' || col === 'ai_strengths' || col === 'ai_weaknesses' || col === 'ai_risks' || col === 'financial_data') {
          item[col] = parseJsonVal(val);
        } else if (col === 'archetype_confidence' || col === 'sort_order') {
          const parsedNum = parseInt(parseVal(val));
          item[col] = isNaN(parsedNum) ? null : parsedNum;
        } else {
          item[col] = parseVal(val);
        }
      });
      return item;
    }).filter(item => item.id && item.name);

    const { error } = await supabase.from('startups').upsert(payload, { onConflict: 'id' });
    if (error) console.error('Error seeding startups:', error.message);
    else console.log('Successfully seeded startups.');
  }

  // 6. Seed public.judge_scores
  const judgeScoresData = tables['public.judge_scores'];
  if (judgeScoresData) {
    console.log(`Seeding ${judgeScoresData.rows.length} judge_scores...`);
    
    const payload = judgeScoresData.rows.map(row => {
      const item: Record<string, any> = {};
      judgeScoresData.cols.forEach((col, idx) => {
        const val = row[idx];
        if (col === 'scores') {
          item[col] = parseJsonVal(val);
        } else if (col === 'submitted') {
          item[col] = parseVal(val) === 't' || parseVal(val) === 'true' || parseVal(val) === true;
        } else {
          item[col] = parseVal(val);
        }
      });
      return item;
    }).filter(item => item.id && item.startup_id && item.judge_id);

    const { error } = await supabase.from('judge_scores').upsert(payload, { onConflict: 'startup_id,judge_id' });
    if (error) console.error('Error seeding judge_scores:', error.message);
    else console.log('Successfully seeded judge_scores.');
  }

  console.log('\nAll seeding operations completed!');
}

seed().catch(err => {
  console.error('Unhandled error during seeding:', err);
});
