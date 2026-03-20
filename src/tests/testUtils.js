/**
 * Generates mock landmarks for a specific angle.
 * @param {number[]} jointIds - Array of 3 joint IDs [p1, p2, p3] (p2 is vertex)
 * @param {number} targetAngle - The desired interior angle in degrees
 * @returns {Object} - Landmarks object for evaluateForm
 */
export const generateMockLandmarks = (jointIds, targetAngle) => {
  const [id1, id2, id3] = jointIds;
  const radians = (targetAngle * Math.PI) / 180;
  const p2 = { x: 0.5, y: 0.5 };
  const p1 = { x: 0.5, y: 0.2 }; 

  const radius = 0.3;
  const p3 = {
    x: 0.5 + radius * Math.sin(radians),
    y: 0.5 - radius * Math.cos(radians)
  };

  return {
    [id1]: p1,
    [id2]: p2,
    [id3]: p3,
  };
};