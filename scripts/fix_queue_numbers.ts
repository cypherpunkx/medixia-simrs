import postgres from "postgres";

const connectionString = process.env.DATABASE_URL || "postgres://postgres:admin@localhost:5432/medixia_simrs";
const sql = postgres(connectionString);

async function main() {
  await sql`UPDATE queue_items SET queue_number = 'B-001' WHERE registration_number = 'RJ-20260921-0001'`;
  await sql`UPDATE encounters SET queue_number = 'B-001' WHERE registration_number = 'RJ-20260921-0001'`;
  await sql`UPDATE queue_items SET queue_number = 'C-001' WHERE registration_number = 'RJ-20260921-0002'`;
  await sql`UPDATE encounters SET queue_number = 'C-001' WHERE registration_number = 'RJ-20260921-0002'`;
  console.log("Successfully normalized queue numbers in DB: Poli Umum -> B-001, Poli Anak -> C-001");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
