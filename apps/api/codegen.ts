import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
    // schema: "./src/**/*.schema",
    schema: ['http://localhost:8080/graphql'],
    generates: {
        './generated/graphql/': {
            plugins: ['typescript', 'typescript-operations', 'typescript-urql'],
            preset: 'client',
            config: { withHooks: true },
        }
    }
}
export default config