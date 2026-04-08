import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCloudAccount, getDecryptedCredentials } from './cloud-account.service';
import { prisma } from '../../lib/prisma';
import { encrypt, decrypt } from '../../lib/encryption';
import { env } from '../../config/env';

// Mock dependencies
vi.mock('../../lib/prisma', () => ({
    prisma: {
        project: {
            findFirst: vi.fn(),
        },
        cloudAccount: {
            create: vi.fn(),
            findUnique: vi.fn(),
        },
    },
}));

vi.mock('../../lib/encryption', () => ({
    encrypt: vi.fn(),
    decrypt: vi.fn(),
}));

describe('CloudAccountService - Encryption Logic', () => {
    const mockUserId = 'user_123';
    const mockProjectId = 'proj_456';
    const mockAccountId = 'acc_789';

    beforeEach(() => {
        vi.resetAllMocks();
        // Simulate valid project lookup
        (prisma.project.findFirst as any).mockResolvedValue({ id: mockProjectId, userId: mockUserId });
    });

    it('should encrypt GCP json keys before saving to database', async () => {
        const rawGcpKey = '{"type": "service_account", "project_id": "test"}';
        const encryptedStr = 'encrypted_gcp_key_data';

        (encrypt as any).mockReturnValue(encryptedStr);
        (prisma.cloudAccount.create as any).mockResolvedValue({ id: mockAccountId });

        await createCloudAccount(mockUserId, {
            projectId: mockProjectId,
            provider: 'GCP',
            accountLabel: 'Test GCP',
            externalAccountId: 'ext_gcp_1',
            gcpKeyJson: rawGcpKey,
        });

        // Ensure encrypt was called with correct data and key
        expect(encrypt).toHaveBeenCalledWith(rawGcpKey, env.ENCRYPTION_KEY);

        // Ensure prisma create was called with the encrypted data, NOT the raw data
        expect(prisma.cloudAccount.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    gcpKeyJsonEncrypted: encryptedStr,
                })
            })
        );
        // Ensure raw data is not accidentally passed 
        const createCallArgs = (prisma.cloudAccount.create as any).mock.calls[0][0].data;
        expect(createCallArgs.gcpKeyJson).toBeUndefined();
    });

    it('should encrypt Azure secrets before saving to database', async () => {
        const rawAzureSecret = 'super_secret_azure_value';
        const encryptedStr = 'encrypted_azure_secret';

        (encrypt as any).mockReturnValue(encryptedStr);
        (prisma.cloudAccount.create as any).mockResolvedValue({ id: mockAccountId });

        await createCloudAccount(mockUserId, {
            projectId: mockProjectId,
            provider: 'AZURE',
            accountLabel: 'Test Azure',
            externalAccountId: 'ext_az_1',
            azureTenantId: 'tenant_1',
            azureClientId: 'client_1',
            azureClientSecret: rawAzureSecret,
            azureSubscriptionId: 'sub_1',
        });

        expect(encrypt).toHaveBeenCalledWith(rawAzureSecret, env.ENCRYPTION_KEY);
        expect(prisma.cloudAccount.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    azureClientSecretEncrypted: encryptedStr,
                    azureTenantId: 'tenant_1',
                })
            })
        );
    });

    it('should decrypt credentials when getDecryptedCredentials is called', async () => {
        const encryptedAzureSecret = 'encrypted_azure_secret';
        const rawAzureSecret = 'super_secret_azure_value';

        (prisma.cloudAccount.findUnique as any).mockResolvedValue({
            id: mockAccountId,
            userId: mockUserId,
            provider: 'AZURE',
            externalAccountId: 'ext_az_1',
            azureTenantId: 'tenant_1',
            azureClientId: 'client_1',
            azureClientSecretEncrypted: encryptedAzureSecret,
            azureSubscriptionId: 'sub_1',
        });

        (decrypt as any).mockReturnValue(rawAzureSecret);

        const creds = await getDecryptedCredentials(mockAccountId, mockUserId);

        expect(decrypt).toHaveBeenCalledWith(encryptedAzureSecret, env.ENCRYPTION_KEY);
        expect(creds).toEqual(expect.objectContaining({
            provider: 'AZURE',
            azureTenantId: 'tenant_1',
            azureClientSecret: rawAzureSecret,
        }));
        // Should not return the encrypted version
        expect((creds as any).azureClientSecretEncrypted).toBeUndefined();
    });

    it('should throw Error if unauthorized user tries to decrypt credentials', async () => {
        (prisma.cloudAccount.findUnique as any).mockResolvedValue({
            id: mockAccountId,
            userId: 'different_user_id',
        });

        await expect(getDecryptedCredentials(mockAccountId, mockUserId)).rejects.toThrow('Not authorized');
    });
});
