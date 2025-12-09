export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <h1 className="text-5xl font-bold mb-4 text-gray-900">Campus Services Hub</h1>
        <p className="text-xl text-gray-600 mb-8">Your one-stop platform for campus management</p>
        <div className="space-x-4">
          <a
            href="/login"
            className="inline-block px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md"
          >
            Sign In
          </a>
          <a
            href="/register"
            className="inline-block px-8 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition shadow-md"
          >
            Register
          </a>
        </div>
      </div>
    </div>
  );
}
