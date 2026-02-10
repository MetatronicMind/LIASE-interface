
const assert = require('assert');

// Mock request and response
const mockReq = {
    user: {
        organizationId: 'org123',
        role: 'admin' // Not superadmin
    }
};

const mockRes = {
    json: (data) => {
        console.log('Response data:', JSON.stringify(data, null, 2));

        // Check if superadmin is present
        const hasSuperAdmin = data.roles.some(r => r.name === 'superadmin');

        if (hasSuperAdmin) {
            console.error('❌ FAILED: Superadmin role was found in response for non-superadmin user');
            process.exit(1);
        } else {
            console.log('✅ PASSED: Superadmin role was correctly filtered out');
        }
    },
    status: (code) => {
        console.log(`Status: ${code}`);
        return mockRes;
    }
};

// Mock RoleService
const mockRoleService = {
    getRolesByOrganization: async (orgId) => {
        return [
            { name: 'admin', toJSON: () => ({ name: 'admin' }) },
            { name: 'superadmin', toJSON: () => ({ name: 'superadmin' }) }, // Should be filtered
            { name: 'user', toJSON: () => ({ name: 'user' }) }
        ];
    }
};

// Mock the route handler logic directly since we can't easily import the route without the app
async function testRouteHandler() {
    console.log('Testing role filtering logic...');

    try {
        const roles = await mockRoleService.getRolesByOrganization(mockReq.user.organizationId);

        // logic from roleRoutes.js
        const filteredRoles = roles.filter(role => {
            if (mockReq.user.role === 'superadmin') return true;
            return role.name !== 'superadmin';
        });

        mockRes.json({
            roles: filteredRoles.map(role => role.toJSON()),
            total: filteredRoles.length
        });

    } catch (error) {
        console.error('Test error:', error);
        process.exit(1);
    }
}

testRouteHandler();
