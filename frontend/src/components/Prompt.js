import { useState } from "react";
import ReactMarkdown from "react-markdown";

const Prompt = ({ imageId, setImageId }) => {
  // Create state variables for both model outputs
  const [geminiText, setGeminiText] = useState(
    "Traffic signs help regulate, warn, and guide traffic. Click 'Explain' to analyze the image with Gemini."
  );
  const [llamaText, setLlamaText] = useState(
    "Traffic signs help regulate, warn, and guide traffic. Click 'Explain' to analyze the image with Llama."
  );
  const [trafficRulesText, setTrafficRulesText] = useState(
    "Traffic rules are laws that govern the movement of vehicles and pedestrians. They are designed to ensure safety and efficiency on the roads."
  );
  const [activeTab, setActiveTab] = useState("gemini");
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [llamaLoading, setLlamaLoading] = useState(false);

  const handleExplanationClick = async () => {
    if (!imageId) {
      alert("Please enter an image ID first");
      return;
    }

    // Start loading for both models
    setGeminiLoading(true);
    setLlamaLoading(true);

    try {
      // Call both APIs in parallel
      const geminiPromise = sendImageIdToBackend(imageId, "gemini");
      const llamaPromise = sendImageIdToBackend(imageId, "llama");

      // Wait for both promises to resolve
      const [geminiResult, llamaResult] = await Promise.allSettled([
        geminiPromise,
        llamaPromise,
      ]);

      // Update state based on results
      if (geminiResult.status === "fulfilled") {
        setGeminiText(geminiResult.value);
      } else {
        setGeminiText("Error fetching Gemini data: " + geminiResult.reason);
      }

      if (llamaResult.status === "fulfilled") {
        setLlamaText(llamaResult.value);
      } else {
        setLlamaText("Error fetching Llama data: " + llamaResult.reason);
      }
    } catch (error) {
      console.error("Error during explanation process:", error);
    } finally {
      setGeminiLoading(false);
      setLlamaLoading(false);
    }
  };

  const sendImageIdToBackend = async (imageId, model) => {
    try {
      const endpoint = model === "gemini" ? "/gemini" : "/llama";
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Server error");
      }

      const data = await response.json();
      console.log(`${model.toUpperCase()} Response:`, data);
      return data.message;
    } catch (err) {
      console.error(`Error sending image ID to ${model}:`, err);
      throw err;
    }
  };

  return (
    <div className="w-1/3 h-full p-4 bg-white border-l border-gray-200">
      <h2 className="text-2xl font-bold mb-4">Traffic Information</h2>

      {/* Image ID input */}
      <div className="mb-6">
        <label
          htmlFor="imageId"
          className="block text-lg font-medium text-gray-700"
        >
          Enter Image ID
        </label>
        <input
          id="imageId"
          type="text"
          className="mt-2 p-2 w-full border border-gray-300 rounded-lg"
          placeholder="e.g., 515418514324302"
          value={imageId}
          onChange={(e) => setImageId(e.target.value)}
        />
      </div>

      {/* Model Tabs */}
      <div className="mb-2">
        <div className="flex border-b border-gray-200">
          <button
            className={`py-2 px-4 font-medium focus:outline-none ${
              activeTab === "gemini"
                ? "text-blue-500 border-b-2 border-blue-500"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("gemini")}
          >
            Gemini
            {geminiLoading && (
              <span className="ml-2 inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></span>
            )}
          </button>
          <button
            className={`py-2 px-4 font-medium focus:outline-none ${
              activeTab === "llama"
                ? "text-blue-500 border-b-2 border-blue-500"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("llama")}
          >
            Llama
            {llamaLoading && (
              <span className="ml-2 inline-block w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></span>
            )}
          </button>
        </div>
      </div>

      {/* Model Content based on active tab */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Traffic Sign Analysis</h3>
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-300 min-h-[200px] overflow-y-auto">
          {activeTab === "gemini" ? (
            geminiLoading ? (
              <div className="text-gray-500 italic">
                Analyzing with Gemini...
              </div>
            ) : (
              <ReactMarkdown>{geminiText}</ReactMarkdown>
            )
          ) : llamaLoading ? (
            <div className="text-gray-500 italic">Analyzing with Llama...</div>
          ) : (
            <ReactMarkdown>{llamaText}</ReactMarkdown>
          )}
        </div>
      </div>

      {/* Traffic Rules output field */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">General Traffic Rules</h3>
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-300">
          <p>{trafficRulesText}</p>
        </div>
      </div>

      {/* Explanation button */}
      <div className="mt-4">
        <button
          onClick={handleExplanationClick}
          disabled={geminiLoading || llamaLoading}
          className={`px-4 py-2 text-white rounded-lg transition ${
            geminiLoading || llamaLoading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {geminiLoading || llamaLoading ? "Analyzing..." : "Analyze Image"}
        </button>
      </div>
    </div>
  );
};

export default Prompt;
