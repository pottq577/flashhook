import Link from "next/link";
import providersData from "../../data/webhook-providers.json";

interface WebhookProvider {
  slug: string;
  displayName: string;
}

const providers = providersData as WebhookProvider[];

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-[#0a0a0a] min-h-screen">
      <main className="flex flex-1 w-full max-w-4xl flex-col items-center justify-center py-20 px-8 text-center sm:items-start sm:text-left">
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-6">
          FlashHook Webhook Directory
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl">
          Instantly generate a free sandbox endpoint to test and debug webhooks
          from any platform. No sign-up required.
        </p>

        <div className="w-full">
          <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-200">
            Supported Providers
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
            {providers.map((provider) => (
              <Link
                key={provider.slug}
                href={`/webhooks/${provider.slug}`}
                className="block p-6 bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-gray-800 hover:border-blue-500 hover:shadow-md transition-all duration-200 group"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {provider.displayName} &rarr;
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  View setup guide and payload examples
                </p>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-16 w-full text-center">
          <a
            href="https://flashhook.site"
            className="inline-flex h-14 items-center justify-center rounded-full bg-blue-600 px-8 text-lg font-medium text-white transition-colors hover:bg-blue-700"
          >
            Start Testing Webhooks
          </a>
        </div>
      </main>
    </div>
  );
}
