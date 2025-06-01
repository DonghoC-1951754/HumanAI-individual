import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

const Prompt = ({ imageId, setImageId, accessToken }) => {
  const [geminiText, setGeminiText] = useState("");
  const [llamaText, setLlamaText] = useState("");
  const [validationResult, setValidationResult] = useState(null);
  const [userOutput, setUserOutput] = useState(
    "Enter an image ID and click 'Analyze Image' to view the traffic sign analysis."
  );
  const [trafficRulesText, setTrafficRulesText] = useState(
    "This website provides an automatic analysis of traffic signs. This analysis is provided by combining multiple LLM models such as Gemini and Llama which are further validated by gpt-4o-mini. Click the Explain Process button to see the analysis process."
  );
  const [activeTab, setActiveTab] = useState("gemini");
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [llamaLoading, setLlamaLoading] = useState(false);
  const [validationLoading, setValidationLoading] = useState(false);
  const [userOutputLoading, setUserOutputLoading] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [autoUpdated, setAutoUpdated] = useState(false);
  const [locationInfo, setLocationInfo] = useState("");
  const [locationLoading, setLocationLoading] = useState(false);

  // Track when imageId is updated from Mapillary navigation
  useEffect(() => {
    // Set a flag to show the auto-update notification
    setAutoUpdated(true);

    // Clear the flag after 3 seconds
    const timer = setTimeout(() => {
      setAutoUpdated(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [imageId]);

  // Fetch location info when imageId changes
  useEffect(() => {
    if (imageId && imageId.trim() !== "" && accessToken) {
      fetchLocationInfo(imageId);
    } else {
      setLocationInfo("");
    }
  }, [imageId, accessToken]);

  const fetchLocationInfo = async (imageKey) => {
    setLocationLoading(true);
    try {
      const response = await fetch(
        `https://graph.mapillary.com/${imageKey}?fields=computed_geometry,computed_compass_angle&access_token=${accessToken}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch image data from Mapillary");
      }

      const imageData = await response.json();
      const { coordinates } = imageData.computed_geometry;
      const [longitude, latitude] = coordinates;

      // Reverse geocoding using OpenStreetMap Nominatim
      const geocodeResponse = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=14&addressdetails=1`,
        {
          headers: {
            "User-Agent": "TrafficSignAnalysis/1.0", // Nominatim requires this
          },
        }
      );

      if (geocodeResponse.ok) {
        const geocodeData = await geocodeResponse.json();

        if (geocodeData && geocodeData.address) {
          const address = geocodeData.address;
          const locationParts = [];

          if (address.city) {
            locationParts.push(address.city);
          } else if (address.town) {
            locationParts.push(address.town);
          } else if (address.village) {
            locationParts.push(address.village);
          } else if (address.municipality) {
            locationParts.push(address.municipality);
          } else if (address.suburb) {
            locationParts.push(address.suburb);
          }

          if (address.state) {
            locationParts.push(address.state);
          } else if (address.region) {
            locationParts.push(address.region);
          }

          if (address.country) {
            locationParts.push(address.country);
          }

          if (locationParts.length > 0) {
            setLocationInfo(locationParts.join(", "));
          } else {
            setLocationInfo(
              geocodeData.display_name ||
                `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
            );
          }
        } else {
          setLocationInfo(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
      } else {
        setLocationInfo(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      }
    } catch (error) {
      console.error("Error fetching location info:", error);
      setLocationInfo("Location unavailable");
    } finally {
      setLocationLoading(false);
    }
  };

  const handleExplanationClick = async () => {
    if (!imageId) {
      alert("Please enter an image ID first");
      return;
    }

    setGeminiLoading(true);
    setLlamaLoading(true);
    setUserOutputLoading(true);
    setValidationResult(null);
    setShowExplanation(false);

    try {
      const geminiPromise = sendImageIdToBackend(
        imageId,
        "gemini",
        locationInfo
      );
      const llamaPromise = sendImageIdToBackend(imageId, "llama", locationInfo);

      const [geminiResult, llamaResult] = await Promise.allSettled([
        geminiPromise,
        llamaPromise,
      ]);

      let geminiOutput = "";
      let llamaOutput = "";

      if (geminiResult.status === "fulfilled") {
        geminiOutput = geminiResult.value;
        setGeminiText(geminiOutput);
      } else {
        setGeminiText("Error fetching Gemini data: " + geminiResult.reason);
      }

      if (llamaResult.status === "fulfilled") {
        llamaOutput = llamaResult.value;
        setLlamaText(llamaOutput);
      } else {
        setLlamaText("Error fetching Llama data: " + llamaResult.reason);
      }

      // Only proceed if both models returned results
      if (
        geminiResult.status === "fulfilled" &&
        llamaResult.status === "fulfilled"
      ) {
        // Single call to the validation endpoint with all necessary data
        const validationOutput = await performValidation(
          imageId,
          geminiOutput,
          llamaOutput,
          locationInfo
        );

        if (validationOutput) {
          setUserOutput(validationOutput);
          setValidationResult(validationOutput);
        } else {
          setUserOutput("Failed to validate the analysis. Please try again.");
        }
      } else {
        setUserOutput("Failed to analyze the image. Please try again.");
      }
    } catch (error) {
      console.error("Error during explanation process:", error);
      setUserOutput("An error occurred while processing. Please try again.");
    } finally {
      setGeminiLoading(false);
      setLlamaLoading(false);
      setUserOutputLoading(false);
    }
  };

  const sendImageIdToBackend = async (imageId, model, location) => {
    try {
      const endpoint = model === "gemini" ? "/gemini" : "/llama";
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageId,
          location, // Add the location here
        }),
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

  const performValidation = async (
    imageId,
    geminiOutput,
    llamaOutput,
    location
  ) => {
    try {
      setValidationLoading(true);

      const response = await fetch(
        "http://localhost:5000/contextual-validation",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_id: imageId,
            gemini_output: geminiOutput,
            llama_output: llamaOutput,
            location: location,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Validation server error");
      }

      const data = await response.json();
      console.log("Validation Result:", data);
      return data.message;
    } catch (err) {
      console.error("Error during validation:", err);
      return null;
    } finally {
      setValidationLoading(false);
    }
  };

  const renderValidationResult = () => {
    if (!validationResult)
      return (
        <div className="flex justify-center items-center h-40 text-gray-500">
          No validation data available yet
        </div>
      );

    if (typeof validationResult === "object") {
      return (
        <div className="space-y-4">
          <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg text-sm">
            {JSON.stringify(validationResult, null, 2)}
          </pre>
        </div>
      );
    }

    return (
      <div className="prose prose-sm max-w-none">
        <ReactMarkdown>{validationResult}</ReactMarkdown>
      </div>
    );
  };

  const tabClasses = (tab) => `
    flex items-center py-3 px-4 font-medium text-sm transition-colors duration-200
    ${
      activeTab === tab
        ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
        : "text-gray-600 hover:text-blue-600 hover:bg-blue-50"
    }
  `;

  const LoadingSpinner = () => (
    <span className="ml-2 inline-block w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></span>
  );

  return (
    <div className="w-full md:w-1/3 h-full bg-white border-l border-gray-200 shadow-lg">
      <div className="sticky top-0 bg-white z-10 border-b border-gray-200 p-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 mr-2 text-blue-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Traffic Sign Analysis
        </h2>
      </div>

      <div className="p-4">
        {/* Image ID input with icon */}
        <div className="mb-4">
          <label
            htmlFor="imageId"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Enter Image ID
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <input
              id="imageId"
              type="text"
              className={`pl-10 block w-full border ${
                autoUpdated ? "border-blue-400 bg-blue-50" : "border-gray-300"
              } rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500 text-sm transition-colors duration-300`}
              placeholder="e.g., 515418514324302"
              value={imageId}
              onChange={(e) => setImageId(e.target.value)}
            />
          </div>
          {autoUpdated && (
            <div className="mt-1 text-xs text-blue-600 animate-pulse">
              Image ID updated from Mapillary navigation
            </div>
          )}
        </div>

        {/* Location Information Field */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              readOnly
              className="pl-10 block w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 text-sm text-gray-600"
              placeholder="Location will appear here..."
              value={locationLoading ? "Loading location..." : locationInfo}
            />
          </div>
        </div>

        {/* Analyze button */}
        <div className="mb-6">
          <button
            onClick={handleExplanationClick}
            disabled={
              userOutputLoading ||
              geminiLoading ||
              llamaLoading ||
              validationLoading
            }
            className={`w-full px-4 py-2.5 text-white rounded-lg transition flex items-center justify-center ${
              userOutputLoading ||
              geminiLoading ||
              llamaLoading ||
              validationLoading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 shadow-sm"
            }`}
          >
            {userOutputLoading ? (
              <>
                Processing
                <LoadingSpinner />
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                Analyze Image
              </>
            )}
          </button>
        </div>

        {/* User Output Card */}
        <div className="mb-6">
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <h3 className="text-lg font-medium text-gray-800 flex items-center mb-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Traffic Signs
            </h3>

            {userOutputLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-center">
                  <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-2"></div>
                  <p className="text-gray-500">Analyzing traffic sign...</p>
                </div>
              </div>
            ) : (
              <div className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-headings:font-semibold prose-p:text-gray-700 prose-p:leading-relaxed prose-strong:text-gray-900 prose-strong:font-semibold prose-ul:space-y-1 prose-ol:space-y-1 prose-li:text-gray-700 prose-blockquote:border-l-4 prose-blockquote:border-purple-500 prose-blockquote:pl-4 prose-blockquote:italic prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm">
                <ReactMarkdown
                  components={{
                    // Custom heading styles
                    h1: ({ children }) => (
                      <h1 className="text-2xl font-bold text-gray-900 mb-4 mt-6">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-xl font-semibold text-gray-900 mb-3 mt-5">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-4">
                        {children}
                      </h3>
                    ),

                    // Enhanced paragraph spacing
                    p: ({ children }) => (
                      <p className="text-gray-700 leading-relaxed mb-4">
                        {children}
                      </p>
                    ),

                    // Better list formatting
                    ul: ({ children }) => (
                      <ul className="list-disc pl-6 mb-4 space-y-2">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal pl-6 mb-4 space-y-2">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-gray-700 leading-relaxed">
                        {children}
                      </li>
                    ),

                    // Enhanced strong/bold text
                    strong: ({ children }) => (
                      <strong className="font-semibold text-gray-900">
                        {children}
                      </strong>
                    ),

                    // Better blockquote styling
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-purple-500 pl-4 py-2 mb-4 italic bg-purple-50 rounded-r">
                        {children}
                      </blockquote>
                    ),

                    // Code formatting
                    code: ({ children }) => (
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800">
                        {children}
                      </code>
                    ),

                    // Code block formatting
                    pre: ({ children }) => (
                      <pre className="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto mb-4">
                        {children}
                      </pre>
                    ),
                  }}
                >
                  {userOutput}
                </ReactMarkdown>
              </div>
            )}

            {/* Explain Process Button - Only show if analysis has been completed */}
            {userOutput &&
              userOutput !==
                "Enter an image ID and click 'Analyze Image' to view the traffic sign analysis." &&
              !userOutputLoading && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setShowExplanation(!showExplanation)}
                    className="flex items-center px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition"
                  >
                    {showExplanation ? (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-1.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                        Hide Process
                      </>
                    ) : (
                      <>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-1.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        Explain Process
                      </>
                    )}
                  </button>
                </div>
              )}
          </div>
        </div>

        {/* Model Tabs - Only shown when "Explain Process" is clicked */}
        {showExplanation && (
          <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex bg-gray-50 overflow-x-auto">
              <button
                className={tabClasses("gemini")}
                onClick={() => setActiveTab("gemini")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                Gemini
                {geminiLoading && <LoadingSpinner />}
              </button>
              <button
                className={tabClasses("llama")}
                onClick={() => setActiveTab("llama")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                Llama
                {llamaLoading && <LoadingSpinner />}
              </button>
              <button
                className={tabClasses("validation")}
                onClick={() => setActiveTab("validation")}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                Validation
                {validationLoading && <LoadingSpinner />}
              </button>
            </div>

            {/* Content panel */}
            <div className="p-4 bg-white border-t border-gray-200">
              {activeTab === "gemini" ? (
                geminiLoading ? (
                  <div className="flex justify-center items-center h-40">
                    <div className="text-center">
                      <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-2"></div>
                      <p className="text-gray-500">Analyzing with Gemini...</p>
                    </div>
                  </div>
                ) : !geminiText ? (
                  <div className="flex justify-center items-center h-40 text-gray-500">
                    No Gemini data available yet
                  </div>
                ) : (
                  <div className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-headings:font-semibold prose-p:text-gray-700 prose-p:leading-relaxed prose-strong:text-gray-900 prose-strong:font-semibold prose-ul:space-y-1 prose-ol:space-y-1 prose-li:text-gray-700 prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4 prose-blockquote:italic prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm">
                    <ReactMarkdown
                      components={{
                        // Custom heading styles
                        h1: ({ children }) => (
                          <h1 className="text-2xl font-bold text-gray-900 mb-4 mt-6">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-xl font-semibold text-gray-900 mb-3 mt-5">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-4">
                            {children}
                          </h3>
                        ),

                        // Enhanced paragraph spacing
                        p: ({ children }) => (
                          <p className="text-gray-700 leading-relaxed mb-4">
                            {children}
                          </p>
                        ),

                        // Better list formatting
                        ul: ({ children }) => (
                          <ul className="list-disc pl-6 mb-4 space-y-2">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal pl-6 mb-4 space-y-2">
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => (
                          <li className="text-gray-700 leading-relaxed">
                            {children}
                          </li>
                        ),

                        // Enhanced strong/bold text
                        strong: ({ children }) => (
                          <strong className="font-semibold text-gray-900">
                            {children}
                          </strong>
                        ),

                        // Better blockquote styling
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-blue-500 pl-4 py-2 mb-4 italic bg-blue-50 rounded-r">
                            {children}
                          </blockquote>
                        ),

                        // Code formatting
                        code: ({ children }) => (
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800">
                            {children}
                          </code>
                        ),

                        // Code block formatting
                        pre: ({ children }) => (
                          <pre className="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto mb-4">
                            {children}
                          </pre>
                        ),
                      }}
                    >
                      {geminiText}
                    </ReactMarkdown>
                  </div>
                )
              ) : activeTab === "llama" ? (
                llamaLoading ? (
                  <div className="flex justify-center items-center h-40">
                    <div className="text-center">
                      <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-2"></div>
                      <p className="text-gray-500">Analyzing with Llama...</p>
                    </div>
                  </div>
                ) : !llamaText ? (
                  <div className="flex justify-center items-center h-40 text-gray-500">
                    No Llama data available yet
                  </div>
                ) : (
                  <div className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-headings:font-semibold prose-p:text-gray-700 prose-p:leading-relaxed prose-strong:text-gray-900 prose-strong:font-semibold prose-ul:space-y-1 prose-ol:space-y-1 prose-li:text-gray-700 prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4 prose-blockquote:italic prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm">
                    <ReactMarkdown
                      components={{
                        // Custom heading styles
                        h1: ({ children }) => (
                          <h1 className="text-2xl font-bold text-gray-900 mb-4 mt-6">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-xl font-semibold text-gray-900 mb-3 mt-5">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-4">
                            {children}
                          </h3>
                        ),

                        // Enhanced paragraph spacing
                        p: ({ children }) => (
                          <p className="text-gray-700 leading-relaxed mb-4">
                            {children}
                          </p>
                        ),

                        // Better list formatting
                        ul: ({ children }) => (
                          <ul className="list-disc pl-6 mb-4 space-y-2">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal pl-6 mb-4 space-y-2">
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => (
                          <li className="text-gray-700 leading-relaxed">
                            {children}
                          </li>
                        ),

                        // Enhanced strong/bold text
                        strong: ({ children }) => (
                          <strong className="font-semibold text-gray-900">
                            {children}
                          </strong>
                        ),

                        // Better blockquote styling
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-blue-500 pl-4 py-2 mb-4 italic bg-blue-50 rounded-r">
                            {children}
                          </blockquote>
                        ),

                        // Code formatting
                        code: ({ children }) => (
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800">
                            {children}
                          </code>
                        ),

                        // Code block formatting
                        pre: ({ children }) => (
                          <pre className="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto mb-4">
                            {children}
                          </pre>
                        ),
                      }}
                    >
                      {llamaText}
                    </ReactMarkdown>
                  </div>
                )
              ) : validationLoading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="text-center">
                    <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-2"></div>
                    <p className="text-gray-500">Comparing model outputs...</p>
                  </div>
                </div>
              ) : (
                <div className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-headings:font-semibold prose-p:text-gray-700 prose-p:leading-relaxed prose-strong:text-gray-900 prose-strong:font-semibold prose-ul:space-y-1 prose-ol:space-y-1 prose-li:text-gray-700 prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4 prose-blockquote:italic prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm">
                  {typeof validationResult === "string" ? (
                    <ReactMarkdown
                      components={{
                        // Custom heading styles
                        h1: ({ children }) => (
                          <h1 className="text-2xl font-bold text-gray-900 mb-4 mt-6">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-xl font-semibold text-gray-900 mb-3 mt-5">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-4">
                            {children}
                          </h3>
                        ),

                        // Enhanced paragraph spacing
                        p: ({ children }) => (
                          <p className="text-gray-700 leading-relaxed mb-4">
                            {children}
                          </p>
                        ),

                        // Better list formatting
                        ul: ({ children }) => (
                          <ul className="list-disc pl-6 mb-4 space-y-2">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal pl-6 mb-4 space-y-2">
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => (
                          <li className="text-gray-700 leading-relaxed">
                            {children}
                          </li>
                        ),

                        // Enhanced strong/bold text
                        strong: ({ children }) => (
                          <strong className="font-semibold text-gray-900">
                            {children}
                          </strong>
                        ),

                        // Better blockquote styling
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-green-500 pl-4 py-2 mb-4 italic bg-green-50 rounded-r">
                            {children}
                          </blockquote>
                        ),

                        // Code formatting
                        code: ({ children }) => (
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800">
                            {children}
                          </code>
                        ),

                        // Code block formatting
                        pre: ({ children }) => (
                          <pre className="bg-gray-900 text-white p-4 rounded-lg overflow-x-auto mb-4">
                            {children}
                          </pre>
                        ),
                      }}
                    >
                      {validationResult}
                    </ReactMarkdown>
                  ) : (
                    renderValidationResult()
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Traffic Rules card */}
        <div className="mt-6">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <h3 className="text-lg font-medium text-blue-800 flex items-center mb-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Explainable AI
            </h3>
            <p className="text-blue-700 text-sm">{trafficRulesText}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Prompt;
