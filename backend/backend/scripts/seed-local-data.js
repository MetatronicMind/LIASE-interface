const axios = require('axios');

async function seedLocalData() {
  console.log('🌱 Seeding local development data...');
  
  const baseURL = 'http://localhost:3001/api';
  
  try {
    // Check if server is running
    console.log('🔍 Checking if backend server is running...');
    await axios.get(`${baseURL}/health`);
    console.log('✅ Backend server is running');

    // Create first organization and admin user
    console.log('🏢 Creating test organization...');
    const orgResponse = await axios.post(`${baseURL}/admin/create-organization`, {
      name: 'LIASE Test Organization',
      adminUser: {
        username: 'admin',
        email: 'admin@liase-test.com',
        password: 'TestAdmin123!',
        firstName: 'Admin',
        lastName: 'User'
      }
    });

    console.log('✅ Organization created:', orgResponse.data.organization.name);
    console.log('✅ Admin user created:', orgResponse.data.user.username);

    // Login to get token
    console.log('🔐 Logging in as admin...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      username: 'admin',
      password: 'TestAdmin123!'
    });

    const token = loginResponse.data.token;
    const headers = { Authorization: `Bearer ${token}` };

    // Create additional test users
    console.log('👥 Creating test users...');
    
    const testUsers = [
      {
        username: 'pharmacovigilance1',
        email: 'pv1@liase-test.com',
        password: 'TestPV123!',
        firstName: 'John',
        lastName: 'Pharmacovigilance',
        role: 'pharmacovigilance'
      },
      {
        username: 'auditor1',
        email: 'auditor1@liase-test.com',
        password: 'TestAuditor123!',
        firstName: 'Jane',
        lastName: 'Auditor',
        role: 'sponsor-auditor'
      }
    ];

    for (const user of testUsers) {
      const userResponse = await axios.post(`${baseURL}/users`, user, { headers });
      console.log(`✅ Created ${user.role} user: ${user.username}`);
    }

    // Create test drug
    console.log('💊 Creating test drug...');
    const drugResponse = await axios.post(`${baseURL}/drugs`, {
      name: 'Test Drug Alpha',
      genericName: 'alphatest',
      manufacturer: 'LIASE Pharma',
      therapeuticArea: 'Cardiology',
      indication: 'Hypertension',
      dosageForm: 'Tablet',
      strength: '10mg',
      status: 'active'
    }, { headers });

    console.log('✅ Created test drug:', drugResponse.data.name);

    // Create test study
    console.log('📊 Creating test study...');
    const studyResponse = await axios.post(`${baseURL}/studies`, {
      title: 'Phase III Clinical Trial - Test Drug Alpha',
      protocol: 'LIASE-ALPHA-001',
      phase: 'Phase III',
      indication: 'Hypertension',
      sponsor: 'LIASE Pharma',
      principalInvestigator: 'Dr. John Smith',
      status: 'ongoing',
      startDate: new Date().toISOString(),
      estimatedCompletionDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      drugId: drugResponse.data.id
    }, { headers });

    console.log('✅ Created test study:', studyResponse.data.title);

    console.log('\n🎉 Local data seeding complete!');
    console.log('\n📋 Test Accounts Created:');
    console.log('   Admin: admin / TestAdmin123!');
    console.log('   Pharmacovigilance: pharmacovigilance1 / TestPV123!');
    console.log('   Auditor: auditor1 / TestAuditor123!');
    console.log('\n🌐 Access your application:');
    console.log('   Frontend: http://localhost:3000');
    console.log('   Backend API: http://localhost:3001/api');
    console.log('   Health Check: http://localhost:3001/api/health');

  } catch (error) {
    console.error('❌ Error seeding data:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Make sure the backend server is running:');
      console.log('   Run: npm run dev');
    }
    
    process.exit(1);
  }
}

seedLocalData();
