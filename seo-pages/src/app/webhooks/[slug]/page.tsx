import fs from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
  const filePath = path.join(process.cwd(), 'data', 'webhook-providers.json');
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const providers = JSON.parse(fileContents);
 
  return providers.map((provider: any) => ({
    slug: provider.slug,
  }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const filePath = path.join(process.cwd(), 'data', 'webhook-providers.json');
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const providers = JSON.parse(fileContents);
  const provider = providers.find((p: any) => p.slug === params.slug);

  if (!provider) {
    return {};
  }

  return {
    title: `${provider.displayName} Webhook Testing — Free Sandbox | FlashHook`,
    description: `Learn how to test ${provider.displayName} webhooks using FlashHook. View sample payloads, setup instructions, and authentication methods.`,
    openGraph: {
      title: `${provider.displayName} Webhook Testing — Free Sandbox | FlashHook`,
      description: `Learn how to test ${provider.displayName} webhooks using FlashHook. View sample payloads, setup instructions, and authentication methods.`,
    },
  };
}

export default function WebhookProviderPage({ params }: { params: { slug: string } }) {
  const filePath = path.join(process.cwd(), 'data', 'webhook-providers.json');
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const providers = JSON.parse(fileContents);
  const provider = providers.find((p: any) => p.slug === params.slug);

  if (!provider) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="mb-8 border-b pb-6 border-gray-200 dark:border-gray-800">
        <h1 className="text-4xl font-bold mb-4 tracking-tight">
          Test {provider.displayName} Webhooks
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
          Use FlashHook to catch and inspect {provider.displayName} webhooks in real-time. No login required.
        </p>
        <div className="flex items-center space-x-4">
          <a
            href="https://flashhook.site"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            Start Testing {provider.displayName} Webhooks
          </a>
          <a
            href={provider.officialDocsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
          >
            Official Docs &rarr;
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Setup Instructions</h2>
          <ol className="list-decimal pl-5 space-y-3 text-gray-700 dark:text-gray-300">
            {provider.setupSteps.map((step: string, idx: number) => (
              <li key={idx} className="pl-1">{step}</li>
            ))}
          </ol>

          <h2 className="text-2xl font-semibold mt-8 mb-4">Authentication</h2>
          <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800">
            <span className="font-medium">Method:</span> {provider.authMethod}
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Sample Event Payload</h2>
          {provider.sampleEvents.map((event: any, idx: number) => (
            <div key={idx} className="mb-6">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
                Event: <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm">{event.eventName}</code>
              </h3>
              <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto shadow-inner">
                <pre className="text-sm text-green-400 font-mono">
                  {JSON.stringify(event.samplePayload, null, 2)}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
