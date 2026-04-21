const { PrismaClient } = require('@prisma/client');

async function setupDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔄 Setting up database...');
    
    // Test connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Check if tables exist
    const result = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    console.log('📋 Existing tables:', result);
    
    if (result.length === 0) {
      console.log('⚠️  No tables found. Database needs to be initialized.');
      console.log('Please run: npx prisma db push');
    } else {
      console.log('✅ Database tables exist');
    }
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    
    if (error.code === 'P1001') {
      console.log('💡 Database connection failed. Please check:');
      console.log('   - PostgreSQL service is running');
      console.log('   - Database "employee_management" exists');
      console.log('   - Credentials in .env are correct');
    }
  } finally {
    await prisma.$disconnect();
  }
}

setupDatabase();
