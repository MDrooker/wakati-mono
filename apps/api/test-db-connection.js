#!/usr/bin/env node

/**
 * Database connectivity test script
 * Run this to test if your database connection is working
 * 
 * Usage: node test-db-connection.js
 */

const { Client } = require('pg');
require('dotenv').config();

async function testDatabaseConnection() {
    console.log('🔍 Testing Database Connection...');
    console.log('===============================');

    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
        console.error('❌ DATABASE_URL environment variable is not set');
        console.log('Please add DATABASE_URL to your .env file');
        console.log('Example: DATABASE_URL=postgres://user:password@localhost:5432/database');
        process.exit(1);
    }

    console.log(`📋 Database URL: ${databaseUrl.replace(/\/\/.*@/, '//***:***@')}`);

    const client = new Client({
        connectionString: databaseUrl,
    });

    try {
        console.log('🔌 Attempting to connect...');
        await client.connect();
        console.log('✅ Database connection successful!');

        console.log('📊 Running test query...');
        const result = await client.query('SELECT NOW() as current_time, version() as postgres_version');
        console.log('✅ Test query successful!');
        console.log(`   Current time: ${result.rows[0].current_time}`);
        console.log(`   PostgreSQL version: ${result.rows[0].postgres_version.split(' ')[0]}`);

        // Test if we can create/drop a test table
        console.log('🧪 Testing table operations...');
        await client.query('CREATE TABLE IF NOT EXISTS connection_test (id SERIAL PRIMARY KEY, test_data TEXT)');
        await client.query('INSERT INTO connection_test (test_data) VALUES ($1)', ['Connection test successful']);
        const testResult = await client.query('SELECT * FROM connection_test ORDER BY id DESC LIMIT 1');
        await client.query('DROP TABLE connection_test');
        console.log('✅ Table operations successful!');
        console.log(`   Test data: ${testResult.rows[0].test_data}`);

    } catch (error) {
        console.error('❌ Database connection failed!');
        console.error(`   Error: ${error.message}`);

        if (error.code === 'ENOTFOUND') {
            console.log('💡 Suggestion: Check if the database host is correct and reachable');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('💡 Suggestion: Check if PostgreSQL is running on the specified port');
        } else if (error.code === '28P01') {
            console.log('💡 Suggestion: Check your username and password');
        } else if (error.code === '3D000') {
            console.log('💡 Suggestion: The database does not exist. Create it first.');
        }

        process.exit(1);
    } finally {
        await client.end();
        console.log('🔌 Database connection closed');
    }

    console.log('');
    console.log('🎉 Database connectivity test completed successfully!');
    console.log('Your Rockwell API should be able to connect to the database.');
}

if (require.main === module) {
    testDatabaseConnection().catch(console.error);
}

module.exports = { testDatabaseConnection };
