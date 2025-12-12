import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100">
      <div className="text-center px-4">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-stone-950">404</h1>
          <div className="h-1 w-20 bg-stone-950 mx-auto mt-4"></div>
        </div>

        <h2 className="text-3xl font-bold text-stone-950 mb-4">Page Not Found</h2>

        <p className="text-stone-600 mb-8 max-w-md mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="space-x-4">
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-white text-stone-950 border-2 border-stone-950 rounded-lg hover:bg-stone-50 transition shadow-lg"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
