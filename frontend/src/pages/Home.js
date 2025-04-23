import { useEffect, useRef } from "react";
import Mapillary from "../components/Mapillary";
import Prompt from "../components/Prompt";

const Home = () => {
  const imageId = "515418514324302";
  const accessToken = "MLY|29035766876069488|34bbc2018881031154e33f7953b7ccc4";

  return (
    <div className="h-screen flex">
      <Mapillary imageId={imageId} accessToken={accessToken} />
      <Prompt />
    </div>
  );
};

export default Home;
