import { useState } from "react";

export default function ProjectShareButton({ projectId }) {
  const [message, setMessage] = useState("");

  async function handleCopyLink() {
    try {
      const projectLink = `${window.location.origin}/projects/${projectId}`;

      await navigator.clipboard.writeText(projectLink);

      setMessage("Project link copied!");

      setTimeout(() => {
        setMessage("");
      }, 2500);
    } catch (error) {
      console.error("Failed to copy project link:", error);
      setMessage("Unable to copy link.");
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleCopyLink}
        className="btn-secondary"
      >
        Share project
      </button>

      {message && (
        <div
          className="
            absolute
            right-0
            top-full
            mt-2
            z-50
            whitespace-nowrap
            rounded-lg
            border
            border-line
            bg-panel
            px-4
            py-2
            text-xs
            text-done
            shadow-xl
          "
        >
          {message}
        </div>
      )}
    </div>
  );
}