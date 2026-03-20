export const calculateAngle = (p1, p2, p3) => {
  if (!p1 || !p2 || !p3) return 0;

  const radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
  let angle = Math.abs((radians * 180.0) / Math.PI);
  if (angle > 180.0) angle = 360 - angle;

  return Math.round(angle); 
};

export const calculateEMA = (currentValue, previousValue, alpha = 0.3) => {
  if (previousValue === undefined || previousValue === null) return currentValue;
  return Math.round(alpha * currentValue + (1 - alpha) * previousValue);
};

export const calculateAngle3D = (p1, p2, p3) => {
  if (!p1 || !p2 || !p3) return 0;
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y, z: (p1.z || 0) - (p2.z || 0) };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y, z: (p3.z || 0) - (p2.z || 0) };

  const dotProduct = (v1.x * v2.x) + (v1.y * v2.y) + (v1.z * v2.z);
  const mag1 = Math.sqrt(v1.x**2 + v1.y**2 + v1.z**2);
  const mag2 = Math.sqrt(v2.x**2 + v2.y**2 + v2.z**2);
  
  const cosTheta = dotProduct / (mag1 * mag2);
  const angle = Math.acos(Math.max(-1, Math.min(1, cosTheta)));

  return Math.round((angle * 180.0) / Math.PI);
};

export const mapMediaPipeToInternal = (rawLandmarks) => {
  if (!rawLandmarks || !Array.isArray(rawLandmarks)) return {};

  return rawLandmarks.reduce((acc, landmark, index) => {
    acc[index] = {
      x: landmark.x,
      y: landmark.y,
      z: landmark.z || 0,
      visibility: landmark.visibility || landmark.presence || 0
    };
    return acc;
  }, {});
};

