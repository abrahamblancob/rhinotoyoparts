import pg from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function tryConnect(config, label) {
  const client = new pg.Client(config);
  try {
    await client.connect();
    console.log(`CONNECTED via ${label}!`);
    const res = await client.query('SELECT current_database(), current_user');
    console.log('DB:', res.rows[0].current_database, 'User:', res.rows[0].current_user);
    return client;
  } catch (err) {
    console.log(`${label} failed:`, err.message);
    await client.end().catch(() => {});
    return null;
  }
}

async function run() {
  // Try multiple connection approaches
  const configs = [
    {
      label: 'pooler-6543-transaction',
      config: {
        host: 'aws-0-us-east-1.pooler.supabase.com',
        port: 6543,
        database: 'postgres',
        user: 'postgres.omeoiefgckiilgwhczra',
        password: 'rhinotoyoparts2026!',
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      }
    },
    {
      label: 'pooler-5432-session',
      config: {
        host: 'aws-0-us-east-1.pooler.supabase.com',
        port: 5432,
        database: 'postgres',
        user: 'postgres.omeoiefgckiilgwhczra',
        password: 'rhinotoyoparts2026!',
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      }
    },
    {
      label: 'pooler-6543-noDot',
      config: {
        host: 'aws-0-us-east-1.pooler.supabase.com',
        port: 6543,
        database: 'postgres',
        user: 'postgres',
        password: 'rhinotoyoparts2026!',
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 10000,
      }
    },
  ];

  let client = null;
  for (const { label, config } of configs) {
    process.stdout.write(`Trying ${label}... `);
    client = await tryConnect(config, label);
    if (client) break;
  }

  if (!client) {
    console.log('\nAll connection attempts failed.');
    console.log('Please verify your database password at:');
    console.log('Supabase Dashboard -> Settings -> Database -> Database password');
    console.log('And also check the connection string shown there.');
    return;
  }

  // Execute SQL files
  const files = ['schema.sql', 'functions.sql', 'rls.sql', 'seed.sql'];
  for (const file of files) {
    console.log(`\n--- Executing ${file} ---`);
    const sql = readFileSync(join(__dirname, file), 'utf-8');
    try {
      await client.query(sql);
      console.log(`OK ${file}`);
    } catch (err) {
      console.error(`ERR ${file}:`, err.message);
    }
  }

  // Verify
  try {
    const res = await client.query("SELECT count(*) as c FROM organizations");
    console.log('\nOrganizations:', res.rows[0].c);
    const r2 = await client.query("SELECT count(*) as c FROM roles");
    console.log('Roles:', r2.rows[0].c);
    const r3 = await client.query("SELECT count(*) as c FROM permissions");
    console.log('Permissions:', r3.rows[0].c);
  } catch (e) {
    console.error('Verify error:', e.message);
  }

  await client.end();
  console.log('\nDone!');
}

run();
