import { Zodirectus } from '../index';

async function generate() {
  console.log('Starting generation...');
  const zodirectus = new Zodirectus({
    directusUrl: 'http://localhost:8055',
    token: 'd2hRayaSOoOuVHfEuuw1W2DAqdxXHonG',
    // collections: ['applications'], // Only generate for applications collection
    outputDir: './generated',
    includeSystemCollections: true,
  });

  console.log('Generating schemas and types...');
  const results = await zodirectus.generate();
  console.log('Generation completed!');
  console.log('Results:', results.length, 'collections processed');
}

generate().catch(err => {
  console.error('Failed to generate types:', err);
  process.exit(1);
});
