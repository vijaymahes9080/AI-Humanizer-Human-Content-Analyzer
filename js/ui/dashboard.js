/**
 * AI Humanizer Pro - Canvas Dashboard Module
 * Implements highly polished, custom, animated gauges, radar, and line charts
 * using the HTML5 Canvas API. Fully responsive and theme-aware.
 */

const Dashboard = (() => {
  // Theme color configurations (automatically overridden by document theme in draw cycles)
  let colors = {
    original: 'rgba(239, 68, 68, 0.75)',    // Red/Orange for AI/Stiff text
    originalLight: 'rgba(239, 68, 68, 0.15)',
    human: 'rgba(20, 184, 166, 0.85)',       // Teal for Humanized text
    humanLight: 'rgba(20, 184, 166, 0.2)',
    grid: 'rgba(255, 255, 255, 0.1)',
    text: '#94a3b8',
    textHighlight: '#f8fafc',
    accent: '#6366f1',
    glow: 'rgba(20, 184, 166, 0.4)'
  };

  /**
   * Updates chart color palette based on active theme.
   * @param {boolean} isDark 
   */
  function updateColors(isDark) {
    if (isDark) {
      colors.grid = 'rgba(255, 255, 255, 0.08)';
      colors.text = '#94a3b8';
      colors.textHighlight = '#f8fafc';
    } else {
      colors.grid = 'rgba(15, 23, 42, 0.08)';
      colors.text = '#475569';
      colors.textHighlight = '#0f172a';
    }
  }

  /**
   * Helper to set Canvas resolution for high-DPI (Retina) screens.
   */
  function setupCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx, width: rect.width, height: rect.height };
  }

  /**
   * Renders an animated Gauge Chart for the overall score.
   */
  class GaugeChart {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      this.currentVal = 0;
      this.targetVal = 0;
      this.animationSpeed = 0.05;
      this.animationFrame = null;
      this.label = 'Human Score';
    }

    render(targetVal, label = 'Human Score') {
      this.targetVal = targetVal;
      this.label = label;
      
      const animate = () => {
        const diff = this.targetVal - this.currentVal;
        if (Math.abs(diff) < 0.1) {
          this.currentVal = this.targetVal;
          this.draw();
          cancelAnimationFrame(this.animationFrame);
        } else {
          this.currentVal += diff * this.animationSpeed;
          this.draw();
          this.animationFrame = requestAnimationFrame(animate);
        }
      };
      
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = requestAnimationFrame(animate);
    }

    draw() {
      if (!this.canvas) return;
      const { ctx, width, height } = setupCanvas(this.canvas);
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height * 0.65;
      const radius = Math.min(width, height) * 0.45;
      const startAngle = Math.PI * 0.9;
      const endAngle = Math.PI * 2.1;
      const range = endAngle - startAngle;

      // 1. Draw Background Track
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.lineWidth = 14;
      ctx.strokeStyle = colors.grid;
      ctx.lineCap = 'round';
      ctx.stroke();

      // 2. Draw Progress Arc
      if (this.currentVal > 0) {
        ctx.beginPath();
        const currentAngle = startAngle + (this.currentVal / 100) * range;
        ctx.arc(cx, cy, radius, startAngle, currentAngle);
        ctx.lineWidth = 16;
        
        // Dynamic color transition based on score
        const grad = ctx.createLinearGradient(0, cy, width, cy);
        grad.addColorStop(0, colors.original);
        grad.addColorStop(0.5, colors.accent);
        grad.addColorStop(1, colors.human);

        ctx.strokeStyle = grad;
        ctx.lineCap = 'round';
        
        // Apply glow effect
        ctx.shadowBlur = 10;
        ctx.shadowColor = colors.glow;
        ctx.stroke();
        
        // Reset shadow
        ctx.shadowBlur = 0;
      }

      // 3. Draw Center Text (Score)
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      ctx.fillStyle = colors.textHighlight;
      ctx.font = 'bold 36px Outfit, Inter, system-ui, sans-serif';
      ctx.fillText(`${Math.round(this.currentVal)}%`, cx, cy - 10);

      // Label below score
      ctx.fillStyle = colors.text;
      ctx.font = '500 13px Inter, system-ui, sans-serif';
      ctx.fillText(this.label, cx, cy + 25);
    }
  }

  /**
   * Renders a Radar Chart comparing Text properties.
   */
  class RadarChart {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      this.originalData = [0, 0, 0, 0, 0];
      this.humanizedData = [0, 0, 0, 0, 0];
      this.targetOrig = [0, 0, 0, 0, 0];
      this.targetHuman = [0, 0, 0, 0, 0];
      this.labels = ['Natural Flow', 'Lexical Richness', 'Variety', 'Formality', 'Grammar'];
      this.animationSpeed = 0.08;
      this.animationFrame = null;
    }

    render(origStats, humStats) {
      // Map stats: [Flow, Lexical Richness, Variety (Sentence Length SD), Formality, Grammar]
      this.targetOrig = [
        origStats.flowScore || 0,
        origStats.lexicalRichness || 0,
        origStats.sentenceVariety || 0,
        origStats.formalityScore || 0,
        origStats.grammarScore || 0
      ];

      this.targetHuman = [
        humStats.flowScore || 0,
        humStats.lexicalRichness || 0,
        humStats.sentenceVariety || 0,
        humStats.formalityScore || 0,
        humStats.grammarScore || 0
      ];

      const animate = () => {
        let done = true;
        for (let i = 0; i < 5; i++) {
          const diffOrig = this.targetOrig[i] - this.originalData[i];
          const diffHum = this.targetHuman[i] - this.humanizedData[i];
          
          if (Math.abs(diffOrig) > 0.5) {
            this.originalData[i] += diffOrig * this.animationSpeed;
            done = false;
          } else {
            this.originalData[i] = this.targetOrig[i];
          }

          if (Math.abs(diffHum) > 0.5) {
            this.humanizedData[i] += diffHum * this.animationSpeed;
            done = false;
          } else {
            this.humanizedData[i] = this.targetHuman[i];
          }
        }

        this.draw();

        if (!done) {
          this.animationFrame = requestAnimationFrame(animate);
        } else {
          cancelAnimationFrame(this.animationFrame);
        }
      };

      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = requestAnimationFrame(animate);
    }

    draw() {
      if (!this.canvas) return;
      const { ctx, width, height } = setupCanvas(this.canvas);
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2 + 5;
      const radius = Math.min(width, height) * 0.35;
      const numPoints = 5;
      const angleStep = (Math.PI * 2) / numPoints;

      // Draw Concentric Pentagon Grid Rings
      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 1;
      
      for (let r = 1; r <= 4; r++) {
        const curRadius = radius * (r / 4);
        ctx.beginPath();
        for (let i = 0; i < numPoints; i++) {
          const angle = i * angleStep - Math.PI / 2;
          const px = cx + Math.cos(angle) * curRadius;
          const py = cy + Math.sin(angle) * curRadius;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // Draw Grid Axes (radiating spokes)
      ctx.beginPath();
      for (let i = 0; i < numPoints; i++) {
        const angle = i * angleStep - Math.PI / 2;
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
      }
      ctx.stroke();

      // Draw Axis Labels
      ctx.fillStyle = colors.text;
      ctx.font = '500 11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let i = 0; i < numPoints; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const offset = 16;
        const px = cx + Math.cos(angle) * (radius + offset);
        const py = cy + Math.sin(angle) * (radius + offset);
        
        // Alignment tweaks
        if (Math.cos(angle) < -0.1) ctx.textAlign = 'right';
        else if (Math.cos(angle) > 0.1) ctx.textAlign = 'left';
        else ctx.textAlign = 'center';
        
        ctx.fillText(this.labels[i], px, py);
      }

      // Draw Original Polygon (AI Stiff)
      this.drawPolygon(ctx, cx, cy, angleStep, radius, this.originalData, colors.original, colors.originalLight);

      // Draw Humanized Polygon (Teal Flow)
      this.drawPolygon(ctx, cx, cy, angleStep, radius, this.humanizedData, colors.human, colors.humanLight);
    }

    drawPolygon(ctx, cx, cy, angleStep, radius, data, outlineColor, fillColor) {
      ctx.beginPath();
      for (let i = 0; i < data.length; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const val = data[i] / 100;
        const px = cx + Math.cos(angle) * radius * val;
        const py = cy + Math.sin(angle) * radius * val;
        
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      
      // Fill
      ctx.fillStyle = fillColor;
      ctx.fill();
      
      // Outline
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Draw Vertices
      for (let i = 0; i < data.length; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const val = data[i] / 100;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(angle) * radius * val, cy + Math.sin(angle) * radius * val, 4, 0, Math.PI * 2);
        ctx.fillStyle = outlineColor;
        ctx.fill();
      }
    }
  }

  /**
   * Renders a Line Chart showing Sentence Length Distribution / Rhythm comparison.
   */
  class DistributionChart {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      this.origLengths = [];
      this.humLengths = [];
      this.animProgress = 0;
      this.animationFrame = null;
    }

    render(origLengths, humLengths) {
      this.origLengths = origLengths || [];
      this.humLengths = humLengths || [];
      this.animProgress = 0;

      const animate = () => {
        if (this.animProgress < 1) {
          this.animProgress += 0.04;
          this.draw();
          this.animationFrame = requestAnimationFrame(animate);
        } else {
          this.animProgress = 1;
          this.draw();
          cancelAnimationFrame(this.animationFrame);
        }
      };

      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = requestAnimationFrame(animate);
    }

    draw() {
      if (!this.canvas) return;
      const { ctx, width, height } = setupCanvas(this.canvas);
      ctx.clearRect(0, 0, width, height);

      const paddingLeft = 35;
      const paddingRight = 15;
      const paddingTop = 20;
      const paddingBottom = 25;
      
      const graphWidth = width - paddingLeft - paddingRight;
      const graphHeight = height - paddingTop - paddingBottom;

      // Find maximum sentence length for Y scaling
      const maxVal = Math.max(
        ...this.origLengths, 
        ...this.humLengths, 
        15 // baseline minimum ceiling
      ) + 5;

      const maxPoints = Math.max(
        this.origLengths.length, 
        this.humLengths.length, 
        2 // baseline x-axis ticks
      );

      // Draw Grid Lines (Y-axis grid)
      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 1;
      ctx.fillStyle = colors.text;
      ctx.font = '9px Inter, system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      const gridTicks = 4;
      for (let i = 0; i <= gridTicks; i++) {
        const val = (maxVal * (i / gridTicks));
        const y = height - paddingBottom - (graphHeight * (i / gridTicks));
        
        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(width - paddingRight, y);
        ctx.stroke();

        ctx.fillText(Math.round(val), paddingLeft - 8, y);
      }

      // X-axis label
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('Sentence sequence', paddingLeft + graphWidth / 2, height - 12);

      // Draw Lines
      this.drawLine(ctx, paddingLeft, paddingTop, graphWidth, graphHeight, this.origLengths, maxVal, maxPoints, colors.original, colors.originalLight);
      this.drawLine(ctx, paddingLeft, paddingTop, graphWidth, graphHeight, this.humLengths, maxVal, maxPoints, colors.human, colors.humanLight);
    }

    drawLine(ctx, left, top, gWidth, gHeight, points, maxVal, maxPoints, color, glowColor) {
      if (points.length < 1) return;

      const stepX = points.length > 1 ? gWidth / (points.length - 1) : gWidth;
      
      ctx.beginPath();
      for (let i = 0; i < points.length; i++) {
        const x = left + i * stepX;
        const targetY = top + gHeight * (1 - (points[i] / maxVal));
        
        // Animate entering growth
        const currentY = top + gHeight - (gHeight - targetY) * this.animProgress;
        
        if (i === 0) ctx.moveTo(x, currentY);
        else {
          // Use Bezier curves for organic, smooth humanized look
          const prevX = left + (i - 1) * stepX;
          const prevTargetY = top + gHeight * (1 - (points[i - 1] / maxVal));
          const prevCurrentY = top + gHeight - (gHeight - prevTargetY) * this.animProgress;
          
          const cpX1 = prevX + stepX / 2;
          const cpY1 = prevCurrentY;
          const cpX2 = prevX + stepX / 2;
          const cpY2 = currentY;

          ctx.bezierCurveTo(cpX1, cpY1, cpX2, cpY2, x, currentY);
        }
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.stroke();

      // Shadow overlay
      ctx.shadowBlur = 5;
      ctx.shadowColor = glowColor;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }

  return {
    Gauge: GaugeChart,
    Radar: RadarChart,
    Distribution: DistributionChart,
    updateColors
  };
})();

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Dashboard;
} else {
  window.Dashboard = Dashboard;
}
