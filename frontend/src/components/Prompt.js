import { useState } from "react";

const Prompt = () => {
  const [imageId, setImageId] = useState("");
  const [trafficSignsText, setTrafficSignsText] = useState(
    "Traffic signs help regulate, warn, and guide traffic. Some common examples include stop signs, yield signs, and speed limit signs."
  );
  const [trafficRulesText, setTrafficRulesText] = useState(
    "Traffic rules are laws that govern the movement of vehicles and pedestrians. They are designed to ensure safety and efficiency on the roads."
  );

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
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-300">
          <p>{trafficSignsText}</p>
        </div>
      </div>

      {/* Traffic Rules output field */}
      <div>
        <h3 className="text-xl font-semibold mb-2">General Traffic Rules</h3>
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-300">
          <p>{trafficRulesText}</p>
        </div>
      </div>
    </div>
  );
};

export default Prompt;
