import type { CollectionConfig } from 'payload'

export const Atoms: CollectionConfig = {
    slug: 'atom',
    access: {
        read: () => true,
    },
    fields: [
        {
            name: 'alt',
            type: 'text',
            required: true,
        },
    ],
}
