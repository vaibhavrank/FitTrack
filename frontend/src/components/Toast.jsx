export default function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center rounded-full bg-black/80 px-4 py-2 text-sm text-white shadow-lg">
      <span className="mr-2">✅</span>
      <span>{message}</span>
    </div>
  );
}
