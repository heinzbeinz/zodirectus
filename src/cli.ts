#!/usr/bin/env node

import { Zodirectus, ZodirectusConfig } from './index';
import * as fs from 'fs';
import * as path from 'path';

interface CLIOptions {
  url: string;
  token?: string;
  additionalHeaders?: Record<string, string>;
  email?: string;
  password?: string;
  collections?: string[];
  output?: string;
  schemas?: boolean;
  types?: boolean;
  system?: boolean;
  help?: boolean;
  version?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    url: '',
    schemas: true,
    types: true,
    system: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--url':
      case '-u':
        options.url = args[++i];
        break;
      case '--token':
      case '-t':
        options.token = args[++i];
        break;
      case '--additional-headers':
        options.additionalHeaders = JSON.parse(args[++i]);
        break;
      case '--header':
      case '-H':
        if (!options.additionalHeaders) {
          options.additionalHeaders = {};
        }
        if (i + 2 >= args.length) {
          console.error('Error: Missing header key or value for --header option.');
          process.exit(1);
        }
        const headerKey = args[++i];
        const headerValue = args[++i];
        options.additionalHeaders[headerKey] = headerValue;
        break;
      case '--email':
      case '-e':
        options.email = args[++i];
        break;
      case '--password':
      case '-p':
        options.password = args[++i];
        break;
      case '--collections':
      case '-c':
        options.collections = args[++i].split(',').map(c => c.trim());
        break;
      case '--output':
      case '-o':
        options.output = args[++i];
        break;
      case '--schemas':
        options.schemas = true;
        break;
      case '--no-schemas':
        options.schemas = false;
        break;
      case '--types':
        options.types = true;
        break;
      case '--no-types':
        options.types = false;
        break;
      case '--system':
        options.system = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--version':
      case '-v':
        options.version = true;
        break;
      default:
        if (arg.startsWith('-')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
        break;
    }
  }

  return options;
}

/**
 * Display help information
 */
function showHelp(): void {
  console.log(`
Zodirectus - Generate Zod schemas and TypeScript types from Directus collections

Usage: zodirectus [options]

Options:
  -u, --url <url>                  Directus instance URL (required)
  -t, --token <token>              Authentication token
      --additional-headers <json>  Additional headers for authentication
  -H, --header <key> <value>       Additional header for authentication
  -e, --email <email>              Email for authentication
  -p, --password <password>        Password for authentication
  -c, --collections <list>         Comma-separated list of collections to generate
  -o, --output <dir>               Output directory (default: ./generated)
  --schemas                        Generate Zod schemas (default: true)
  --no-schemas                     Skip Zod schema generation
  --types                          Generate TypeScript types (default: true)
  --no-types                       Skip TypeScript type generation
  --system                         Include system collections
  -h, --help                       Show this help message
  -v, --version                    Show version information

Examples:
  zodirectus --url https://api.example.com --token your-token
  zodirectus --url https://api.example.com --email user@example.com --password pass123
  zodirectus --url https://api.example.com --email user@example.com --password pass123 --additional-headers '{"Authorization": "Bearer your-token"}'
  zodirectus --url https://api.example.com --collections users,posts --output ./types
`);
}

/**
 * Display version information
 */
function showVersion(): void {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8')
  );
  console.log(`zodirectus v${packageJson.version}`);
}

/**
 * Main CLI function
 */
async function main(): Promise<void> {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  if (options.version) {
    showVersion();
    return;
  }

  if (!options.url) {
    console.error('Error: Directus URL is required. Use --url or -u option.');
    console.error('Use --help for more information.');
    process.exit(1);
  }

  if (!options.token && (!options.email || !options.password)) {
    console.error(
      'Error: Authentication is required. Provide either --token or --email/--password.'
    );
    console.error('Use --help for more information.');
    process.exit(1);
  }

  try {
    const config: ZodirectusConfig = {
      directusUrl: options.url,
      additionalHeaders: options.additionalHeaders,
      token: options.token,
      email: options.email,
      password: options.password,
      collections: options.collections,
      outputDir: options.output,
      generateTypes: options.types,
      generateSchemas: options.schemas,
      includeSystemCollections: options.system,
    };

    console.log('🚀 Starting Zodirectus generation...');
    console.log(`📡 Connecting to: ${config.directusUrl}`);

    const zodirectus = new Zodirectus(config);
    const results = await zodirectus.generate();

    console.log(
      `✅ Successfully generated schemas and types for ${results.length} collections:`
    );
    results.forEach(result => {
      console.log(`   - ${result.collectionName}`);
    });

    console.log(`📁 Files written to: ${config.outputDir}`);
    console.log(`   - Individual .ts files for each collection`);
    console.log(`   - Each file contains schemas and types`);
  } catch (error) {
    console.error(
      '❌ Error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    process.exit(1);
  }
}

// Run the CLI
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}
