const userService = require('../../src/services/userService');
const roleService = require('../../src/services/roleService');
const cosmosService = require('../../src/services/cosmosService');

// Mock cosmosService
jest.mock('../../src/services/cosmosService');

describe('Data Isolation Unit Tests', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        // Default mock implementation
        cosmosService.queryItems.mockResolvedValue([]);
        cosmosService.getItem.mockResolvedValue(null);
    });

    describe('UserService', () => {
        it('getUsersByOrganization should filter by organizationId', async () => {
            const orgId = 'org-123';

            // Mock result
            cosmosService.queryItems.mockResolvedValue([
                { id: 'user-1', organizationId: orgId, type: 'user', role: null }
            ]);

            await userService.getUsersByOrganization(orgId);

            expect(cosmosService.queryItems).toHaveBeenCalledTimes(1);
            const [container, query, params] = cosmosService.queryItems.mock.calls[0];

            expect(container).toBe('users');
            expect(query).toContain('c.organizationId = @organizationId');
            expect(params).toEqual(expect.arrayContaining([
                { name: '@organizationId', value: orgId }
            ]));
        });

        it('getAllUsers should NOT filter by organizationId', async () => {
            await userService.getAllUsers();

            expect(cosmosService.queryItems).toHaveBeenCalledTimes(1);
            const [container, query, params] = cosmosService.queryItems.mock.calls[0];

            expect(container).toBe('users');
            expect(query).not.toContain('WHERE c.organizationId = @organizationId');
            // Should order by createdAt
            expect(query).toContain('ORDER BY c.createdAt DESC');
            // Should not have orgId param
            expect(params).toEqual([]);
        });
    });

    describe('RoleService', () => {
        it('getRolesByOrganization should filter by organizationId', async () => {
            const orgId = 'org-123';

            cosmosService.queryItems.mockResolvedValue([
                { id: 'role-1', name: 'Admin', organizationId: orgId, type: 'role' }
            ]);

            await roleService.getRolesByOrganization(orgId);

            expect(cosmosService.queryItems).toHaveBeenCalledTimes(1);
            const [container, query, params] = cosmosService.queryItems.mock.calls[0];

            expect(container).toBe('roles');
            expect(query).toContain('c.organizationId = @organizationId');
            expect(params).toEqual(expect.arrayContaining([
                { name: '@organizationId', value: orgId }
            ]));
        });

        it('getAllRoles should NOT filter by organizationId', async () => {
            cosmosService.queryItems.mockResolvedValue([
                { id: 'role-1', name: 'Admin', organizationId: 'org-A', type: 'role' }
            ]);

            await roleService.getAllRoles();

            expect(cosmosService.queryItems).toHaveBeenCalledTimes(1);
            const [container, query, params] = cosmosService.queryItems.mock.calls[0];

            expect(container).toBe('roles');
            expect(query).not.toContain('WHERE c.organizationId = @organizationId');
            expect(params).toEqual([]);
        });
    });
});
