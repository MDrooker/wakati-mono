import { GraphQLDefinitionsFactory } from '@nestjs/graphql';
import { constraintDirectiveTypeDefs } from 'graphql-constraint-directive';
import { join } from 'path';
import { DateTypeDefinition } from 'graphql-scalars';
import { print } from 'graphql';
import { loadFilesSync } from '@graphql-tools/load-files';
import { mergeTypeDefs } from '@graphql-tools/merge';
import * as fs from 'fs';
const definitionsFactory = new GraphQLDefinitionsFactory();

definitionsFactory
  .generate({
    typePaths: ['./src/**/*.graphql'],
    path: join(process.cwd(), 'src/graphql.schema.ts'),
    outputAs: 'class',
    // watch: true,
    emitTypenameField: true,
    skipResolverArgs: true,
    typeDefs: [constraintDirectiveTypeDefs, DateTypeDefinition],
    defaultTypeMapping: {
      ID: 'number',
    },
  })
  .then(() => {})
  .catch((error) => {
    console.error(error);
  });

async function mergeSDLFiles() {
  console.log('Merging SDL files...', `${__dirname}/**/*.graphql`);
  const loadedFiles = loadFilesSync(`${__dirname}/**/*.graphql`);
  const typeDefs = mergeTypeDefs(loadedFiles);
  const printedTypeDefs = print(typeDefs);
  fs.writeFileSync('schema.graphql', printedTypeDefs);
}

// mergeSDLFiles();
