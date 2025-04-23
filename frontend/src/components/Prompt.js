import { useState } from "react";
import ReactMarkdown from "react-markdown";

const Prompt = ({ imageId, setImageId }) => {
  const [trafficSignsText, setTrafficSignsText] = useState(
    "Traffic signs help regulate, warn, and guide traffic. Some common examples include stop signs, yield signs, and speed limit signs."
  );
  const [trafficRulesText, setTrafficRulesText] = useState(
    "Traffic rules are laws that govern the movement of vehicles and pedestrians. They are designed to ensure safety and efficiency on the roads."
  );
  const [loading, setLoading] = useState(false); // Loading state

  const handleExplanationClick = async (imageId) => {
    setLoading(true); // Start loading
    try {
      const imageUrl = await getImageUrlFromMapillary(imageId);
      const result_text = await sendImageToFlask(imageUrl);
      setTrafficSignsText(result_text); // Set response text
    } catch (error) {
      setTrafficSignsText("Error fetching data. Please try again.");
    } finally {
      setLoading(false); // Stop loading once done
    }
  };

  const sendImageToFlask = async (imageUrl) => {
    const response = await fetch(imageUrl);
    const blob = await response.blob();

    const formData = new FormData();
    formData.append("image", blob, "mapillary.jpg");

    const res = await fetch("http://localhost:5000/google-gemma", {
      method: "POST",
      body: formData,
    });

    const result = await res.json();
    console.log("Flask Response:", result.message);
    return result.message;
  };

  const getImageUrlFromMapillary = async (imageId) => {
    const accessToken =
      "MLY|29035766876069488|34bbc2018881031154e33f7953b7ccc4";
    const url = `https://graph.mapillary.com/${imageId}?access_token=${accessToken}&fields=thumb_2048_url`;

    const res = await fetch(url);
    const data = await res.json();

    return data.thumb_2048_url; // High-resolution image URL
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

      {/* Traffic Signs output field */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Traffic Signs</h3>
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-300 min-h-[100px]">
          {loading ? (
            <div className="text-gray-500 italic animate-pulse">
              Loading explanation...
            </div>
          ) : (
            <ReactMarkdown>{trafficSignsText}</ReactMarkdown>
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
          onClick={() => handleExplanationClick(imageId)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Explain
        </button>
      </div>
    </div>
  );
};

export default Prompt;
