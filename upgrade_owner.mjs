import mysql from 'mysql2/promise';

const AGENCY_PRICE_ID = process.env.STRIPE_PRICE_AGENCY;
const OWNER_OPEN_ID = process.env.OWNER_OPEN_ID;

async function run() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    // Find the owner's user record using camelCase column name
    const [users] = await conn.execute(
      'SELECT id, openId, name, email, role FROM users WHERE openId = ?',
      [OWNER_OPEN_ID]
    );

    if (users.length === 0) {
      console.log('Owner user not found. Available users:');
      const [allUsers] = await conn.execute('SELECT id, openId, name, email FROM users LIMIT 10');
      console.log(JSON.stringify(allUsers, null, 2));
      return;
    }

    const owner = users[0];
    console.log('Found owner:', owner.name, '(id:', owner.id, ')');

    // Check existing subscription
    const [subs] = await conn.execute(
      'SELECT * FROM subscriptions WHERE userId = ?',
      [owner.id]
    );
    console.log('Current subscription:', JSON.stringify(subs, null, 2));

    // Use MySQL datetime format
    const oneYearFromNow = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 19).replace('T', ' ');

    if (subs.length === 0) {
      // Insert new Agency subscription
      await conn.execute(
        `INSERT INTO subscriptions 
         (userId, stripeCustomerId, stripeSubscriptionId, stripePriceId, plan, status, currentPeriodEnd)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          owner.id,
          'cus_owner_agency',
          'sub_owner_agency',
          AGENCY_PRICE_ID || 'price_agency',
          'agency',
          'active',
          oneYearFromNow
        ]
      );
      console.log('✅ Created Agency subscription for owner');
    } else {
      // Update existing subscription to Agency
      await conn.execute(
        `UPDATE subscriptions 
         SET stripePriceId = ?, plan = 'agency', status = 'active', currentPeriodEnd = ?
         WHERE userId = ?`,
        [
          AGENCY_PRICE_ID || 'price_agency',
          oneYearFromNow,
          owner.id
        ]
      );
      console.log('✅ Updated subscription to Agency tier for owner');
    }

    // Verify the change
    const [updatedSubs] = await conn.execute(
      'SELECT * FROM subscriptions WHERE userId = ?',
      [owner.id]
    );
    console.log('Updated subscription:', JSON.stringify(updatedSubs, null, 2));

  } finally {
    await conn.end();
  }
}

run().catch(e => console.error('Error:', e.message, e.stack));
