import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

const Prompt = ({ imageId, setImageId }) => {
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
      const geminiPromise = sendImageIdToBackend(imageId, "gemini");
      const llamaPromise = sendImageIdToBackend(imageId, "llama");

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
          llamaOutput
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

  const performValidation = async (imageId, geminiOutput, llamaOutput) => {
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
        <div className="mb-6">
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
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{userOutput}</ReactMarkdown>
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
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{geminiText}</ReactMarkdown>
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
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{llamaText}</ReactMarkdown>
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
                renderValidationResult()
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
