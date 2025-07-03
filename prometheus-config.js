const APP_CONSTANTS = {
    USER_ROLES: {
        FOUNDING_PARTNER: {
            id: 'founding_partner',
            name: 'Founding Partner',
            level: 5,
            rate: 750,
            permissions: ['*']
        },
        PARTNER: {
            id: 'partner',
            name: 'Partner',
            level: 4,
            rate: 500,
            permissions: [
                'clients.view', 'clients.create', 'clients.edit', 'clients.delete',
                'matters.view', 'matters.create', 'matters.edit', 'matters.delete',
                'time.view', 'time.create', 'time.edit', 'time.delete',
                'billing.view', 'billing.create', 'billing.edit', 'billing.export',
                'documents.view', 'documents.upload', 'documents.edit', 'documents.delete',
                'analytics.view', 'analytics.export',
                'users.view', 'users.create', 'users.edit',
                'system.backup'
            ]
        },
        ASSOCIATE: {
            id: 'associate',
            name: 'Associate',
            level: 3,
            rate: 250,
            permissions: [
                'clients.view', 'clients.create', 'clients.edit',
                'matters.view', 'matters.create', 'matters.edit',
                'time.view', 'time.create', 'time.edit',
                'billing.view', 'billing.create',
                'documents.view', 'documents.upload', 'documents.edit',
                'analytics.view'
            ]
        },
        ASSISTANT: {
            id: 'assistant',
            name: 'Legal Assistant',
            level: 2,
            rate: 150,
            permissions: [
                'clients.view', 'clients.create',
                'matters.view', 'matters.create',
                'time.view', 'time.create',
                'documents.view', 'documents.upload',
                'billing.view'
            ]
        },
        INTERN: {
            id: 'intern',
            name: 'Intern',
            level: 1,
            rate: 50,
            permissions: [
                'clients.view',
                'matters.view',
                'time.view', 'time.create',
                'documents.view'
            ]
        }
    }
};