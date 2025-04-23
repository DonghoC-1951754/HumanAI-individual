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
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

export default Mapillary;
