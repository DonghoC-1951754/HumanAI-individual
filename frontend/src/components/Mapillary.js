import { useEffect, useRef } from "react";
import { Viewer } from "mapillary-js";

const Mapillary = ({ imageId, accessToken }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const viewer = new Viewer({
      accessToken,
      container: containerRef.current,
      imageId,
    });

    return () => viewer.remove();
  }, [imageId, accessToken]);

  return (
    <div className="w-2/3 h-full">
      <iframe
        className="w-full h-full"
        src={`https://www.mapillary.com/embed?map_style=Mapillary%20light&image_key=${imageId}&x=0.5&y=0.5&style=classic`}
        frameborder="0"
      ></iframe>
    </div>
  );
};

export default Mapillary;
