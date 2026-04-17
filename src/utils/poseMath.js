export const calculateAngle = (p1, p2, p3, aspectRatio = 1) => {
  if (!p1 || !p2 || !p3) return 0;

  const dy1 = (p1.y - p2.y) * aspectRatio;
  const dx1 = p1.x - p2.x;
  const dy2 = (p3.y - p2.y) * aspectRatio;
  const dx2 = p3.x - p2.x;

  const radians = Math.atan2(dy2, dx2) - Math.atan2(dy1, dx1);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) angle = 360 - angle;

  return Math.round(angle);
};

export const calculateEMA = (currentValue, previousValue, alpha = 0.25) => { // 0.3 to 0.1 for more noise filtering
  if (previousValue === undefined || previousValue === null) return currentValue;
  return Math.round(alpha * currentValue + (1 - alpha) * previousValue);
};

export const calculateAngle3D = (p1, p2, p3, aspectRatio = 1) => {
  if (!p1 || !p2 || !p3) return 0;
  const useDepth = (p1.visibility > 0.8 && p2.visibility > 0.8 && p3.visibility > 0.8);
  const z1 = useDepth ? (p1.z || 0) : 0;
  const z2 = useDepth ? (p2.z || 0) : 0;
  const z3 = useDepth ? (p3.z || 0) : 0;

  const v1 = { x: p1.x - p2.x, y: (p1.y - p2.y) * aspectRatio, z: z1 - z2 };
  const v2 = { x: p3.x - p2.x, y: (p3.y - p2.y) * aspectRatio, z: z3 - z2 };

  const dotProduct = (v1.x * v2.x) + (v1.y * v2.y) + (v1.z * v2.z);
  const mag1 = Math.sqrt(v1.x**2 + v1.y**2 + v1.z**2);
  const mag2 = Math.sqrt(v2.x**2 + v2.y**2 + v2.z**2);
  
  const cosTheta = dotProduct / (mag1 * mag2);
  const angle = Math.acos(Math.max(-1, Math.min(1, cosTheta)));

  return Math.round((angle * 180.0) / Math.PI);
};

export const mapMediaPipeToInternal = (rawLandmarks) => {
  return rawLandmarks.reduce((acc, landmark, index) => {
    acc[index] = { x: landmark.x, y: landmark.y, z: landmark.z || 0, visibility: landmark.visibility || 0 };
    return acc;
  }, {});
};

export const smoothLandmarks = (nextLandmarks, prevLandmarks, alpha = 0.2) => {
  if (!prevLandmarks || Object.keys(prevLandmarks).length === 0) return nextLandmarks;
  
  const smoothed = {};
  Object.keys(nextLandmarks).forEach(id => {
    if (prevLandmarks[id]) {
      smoothed[id] = {
        x: alpha * nextLandmarks[id].x + (1 - alpha) * prevLandmarks[id].x,
        y: alpha * nextLandmarks[id].y + (1 - alpha) * prevLandmarks[id].y,
        z: nextLandmarks[id].z, // bilmem hic alpha uygulayasım gelmedi
        visibility: nextLandmarks[id].visibility
      };
    } else {
      smoothed[id] = nextLandmarks[id];
    }
  });
  return smoothed;
};