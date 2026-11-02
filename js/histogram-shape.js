(function () {
  // Гладкая заливка через точки бакетов (Catmull-Rom -> кубические Безье),
  // с обрезкой по базовой линии снизу, чтобы получить закрытый контур area-графика.
  function smoothAreaPath(points, baselineY) {
    if (points.length < 2) return "";
    const padded = [points[0], ...points, points[points.length - 1]];
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < padded.length - 2; i++) {
      const p0 = padded[i - 1];
      const p1 = padded[i];
      const p2 = padded[i + 1];
      const p3 = padded[i + 2];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
    }
    const first = points[0];
    const last = points[points.length - 1];
    d += ` L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
    return d;
  }

  window.App = window.App || {};
  window.App.smoothAreaPath = smoothAreaPath;
})();
