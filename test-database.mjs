#!/usr/bin/env node

/**
 * Database Test Script
 * Tests Neon PostgreSQL connection and Prisma schema
 */

import * as dotenv from 'dotenv';
import { PrismaClient } from './generated/prisma/index.js';

// Load environment variables
dotenv.config();

console.log('🔌 Testing PIP AI Database Connection...\n');

const prisma = new PrismaClient();

async function testDatabaseConnection() {
  try {
    console.log('📊 Testing Neon PostgreSQL connection...');
    
    // Test basic connection
    await prisma.$connect();
    console.log('✅ Successfully connected to Neon database');
    
    // Test database info
    const result = await prisma.$queryRaw`SELECT version() as version, current_database() as database, current_user as user;`;
    console.log(`📋 Database info:`, result[0]);
    
    // Test table creation (check if our schema was applied)
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    console.log(`\n📁 Created tables (${tables.length}):`);
    tables.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });
    
    // Test creating a sample user (if User table exists)
    try {
      const testUser = await prisma.user.create({
        data: {
          clerkId: `test-clerk-${Date.now()}`,
          email: `test-${Date.now()}@pip-ai.com`,
          firstName: 'Test',
          lastName: 'User',
        },
      });
      console.log(`\n✅ Sample user created:`, {
        id: testUser.id,
        email: testUser.email,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
      });
      
      // Clean up - delete the test user
      await prisma.user.delete({
        where: { id: testUser.id },
      });
      console.log('🧹 Test user cleaned up');
      
    } catch (error) {
      console.log(`⚠️  Could not create test user: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔚 Database connection closed');
  }
}

// Environment check
function checkEnvironment() {
  console.log('🔧 Environment Check:');
  
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    // Parse and display connection info (without password)
    const urlParts = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^\/]+)\/(.+)/);
    if (urlParts) {
      console.log(`   Database: ${urlParts[4].split('?')[0]}`);
      console.log(`   Host: ${urlParts[3]}`);
      console.log(`   User: ${urlParts[1]}`);
      console.log(`   SSL: ${dbUrl.includes('sslmode=require') ? 'Required' : 'Optional'}`);
    }
  } else {
    console.log('   ❌ DATABASE_URL not found');
  }
  
  console.log(`   Project ID: ${process.env.NEON_PROJECT_ID || 'Not set'}`);
  console.log(`   Region: ${process.env.NEON_REGION || 'Not set'}\n`);
}

// Run tests
async function runTests() {
  checkEnvironment();
  await testDatabaseConnection();
  console.log('🎯 Database test completed!\n');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}
