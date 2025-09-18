// redis-test.js
const { createClient } = require('redis');

const client = createClient({
    username: 'default',
    password: 'h50potIC3tUXedNa5CrztNa4aLWeInvY',
    socket: {
        host: 'redis-19627.crce206.ap-south-1-1.ec2.redns.redis-cloud.com',
        port: 19627
    }
});

client.on('error', err => console.log('Redis Client Error', err));

async function run() {
    await client.connect();

    await client.set('foo', 'bar');
    const result = await client.get('foo');
    console.log(result);  // >>> bar

    await client.quit();
}

run().catch(console.error);
