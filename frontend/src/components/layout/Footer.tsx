import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-400">
        <p>© {new Date().getFullYear()} MosaicForge. All rights reserved.</p>
        <div className="flex gap-6">
          <Link href="/pricing" className="hover:text-gray-600">Pricing</Link>
          <Link href="/auth/login" className="hover:text-gray-600">Sign in</Link>
          <Link href="/create" className="hover:text-gray-600">Create</Link>
        </div>
      </div>
    </footer>
  );
}
