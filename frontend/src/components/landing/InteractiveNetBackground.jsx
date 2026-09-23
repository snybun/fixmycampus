import React, { useEffect, useRef } from 'react';

/**
 * InteractiveNetBackground
 * Renders an interactive elastic geometric net/mesh canvas behind the page.
 * The net elastically wraps around the hero text area to maintain 100% typography legibility,
 * while reacting dynamically with spring physics when the mouse moves or drags across.
 */
export default function InteractiveNetBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = canvas.parentElement?.offsetWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.offsetHeight || window.innerHeight);

    // Dynamic Text Safe-Zone bounding coordinates (to wrap around text)
    let textZone = { cx: width / 2, cy: 190, rx: 380, ry: 155 };

    const updateTextZone = () => {
      const textEl = canvas.parentElement?.querySelector('.hero-content');
      if (textEl) {
        const cRect = canvas.getBoundingClientRect();
        const tRect = textEl.getBoundingClientRect();
        textZone = {
          cx: tRect.left - cRect.left + tRect.width / 2,
          cy: tRect.top - cRect.top + tRect.height / 2,
          rx: Math.max(260, tRect.width / 2 + 32),
          ry: Math.max(120, tRect.height / 2 + 24),
        };
      }
    };

    // Mouse state
    const mouse = {
      x: -1000,
      y: -1000,
      prevX: -1000,
      prevY: -1000,
      radius: 160,
      isMoving: false,
      idleTimer: null,
    };

    // Grid configuration
    const spacing = 46;
    let cols = Math.ceil(width / spacing) + 1;
    let rows = Math.ceil(height / spacing) + 1;

    class Point {
      constructor(originX, originY) {
        this.originX = originX;
        this.originY = originY;
        this.x = originX;
        this.y = originY;
        this.vx = 0;
        this.vy = 0;
        this.damping = 0.88;
        this.spring = 0.045;
      }

      update() {
        // 1. Elastic return to origin force
        const dxOrigin = this.originX - this.x;
        const dyOrigin = this.originY - this.y;
        this.vx += dxOrigin * this.spring;
        this.vy += dyOrigin * this.spring;

        // 2. Text exclusion contour force (wraps around the headline)
        if (textZone.rx > 0 && textZone.ry > 0) {
          const normX = (this.x - textZone.cx) / textZone.rx;
          const normY = (this.y - textZone.cy) / textZone.ry;
          const distSq = normX * normX + normY * normY;

          if (distSq < 1.15 && distSq > 0) {
            const dist = Math.sqrt(distSq);
            // Push point outwards to drape around the text contour
            const pushFactor = (1.15 - dist) * 4.2;
            const angle = Math.atan2(this.y - textZone.cy, this.x - textZone.cx);
            this.vx += Math.cos(angle) * pushFactor * 3.8;
            this.vy += Math.sin(angle) * pushFactor * 3.8;
          }
        }

        // 3. Mouse interaction (repel + wave displacement)
        const dxMouse = this.x - mouse.x;
        const dyMouse = this.y - mouse.y;
        const dist = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

        if (dist < mouse.radius && dist > 0) {
          const force = (mouse.radius - dist) / mouse.radius;
          const angle = Math.atan2(dyMouse, dxMouse);

          this.vx += Math.cos(angle) * force * 5.2;
          this.vy += Math.sin(angle) * force * 5.2;

          const mouseVx = mouse.x - mouse.prevX;
          const mouseVy = mouse.y - mouse.prevY;
          this.vx += mouseVx * 0.08 * force;
          this.vy += mouseVy * 0.08 * force;
        }

        // Apply friction
        this.vx *= this.damping;
        this.vy *= this.damping;

        this.x += this.vx;
        this.y += this.vy;
      }
    }

    let points = [];

    const initGrid = () => {
      width = canvas.width = canvas.parentElement?.offsetWidth || window.innerWidth;
      height = canvas.height = canvas.parentElement?.offsetHeight || window.innerHeight;
      cols = Math.ceil(width / spacing) + 1;
      rows = Math.ceil(height / spacing) + 1;
      points = [];
      updateTextZone();

      for (let r = 0; r < rows; r++) {
        points[r] = [];
        for (let c = 0; c < cols; c++) {
          const x = c * spacing;
          const y = r * spacing;
          points[r][c] = new Point(x, y);
        }
      }
    };

    initGrid();
    setTimeout(updateTextZone, 100);

    // Mouse & Touch listeners on window
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.prevX = mouse.x;
      mouse.prevY = mouse.y;
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.isMoving = true;

      clearTimeout(mouse.idleTimer);
      mouse.idleTimer = setTimeout(() => {
        mouse.prevX = mouse.x;
        mouse.prevY = mouse.y;
      }, 50);
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
      mouse.prevX = -1000;
      mouse.prevY = -1000;
    };

    const handleTouchMove = (e) => {
      if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        mouse.prevX = mouse.x;
        mouse.prevY = mouse.y;
        mouse.x = e.touches[0].clientX - rect.left;
        mouse.y = e.touches[0].clientY - rect.top;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    let resizeTimer;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        initGrid();
        updateTextZone();
      }, 150);
    };
    window.addEventListener('resize', handleResize);

    // Helper: calculate text zone fade multiplier (0 inside text, 1 outside text)
    const getTextVisibilityFactor = (x, y) => {
      if (!textZone.rx || !textZone.ry) return 1;
      const nx = (x - textZone.cx) / textZone.rx;
      const ny = (y - textZone.cy) / textZone.ry;
      const dSq = nx * nx + ny * ny;

      if (dSq < 0.85) return 0; // Completely clear inside text zone
      if (dSq < 1.25) return (dSq - 0.85) / 0.4; // Smooth transition around edge
      return 1;
    };

    // Animation Loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // 1. Update all points
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          points[r]?.[c]?.update();
        }
      }

      // 2. Draw Net Lines (Horizontal & Vertical)
      ctx.lineWidth = 1;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const p = points[r][c];
          if (!p) continue;

          // Connect Horizontal
          if (c + 1 < cols) {
            const pRight = points[r][c + 1];
            if (pRight) {
              const midX = (p.x + pRight.x) / 2;
              const midY = (p.y + pRight.y) / 2;
              const textFactor = getTextVisibilityFactor(midX, midY);

              if (textFactor > 0.05) {
                const distToMouse = Math.hypot(midX - mouse.x, midY - mouse.y);
                const isNearMouse = distToMouse < mouse.radius * 1.2;

                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(pRight.x, pRight.y);

                if (isNearMouse) {
                  const baseAlpha = Math.max(0.1, 0.48 * (1 - distToMouse / (mouse.radius * 1.2)));
                  ctx.strokeStyle = `rgba(0, 0, 0, ${baseAlpha * textFactor})`;
                } else {
                  ctx.strokeStyle = `rgba(0, 0, 0, ${0.06 * textFactor})`;
                }
                ctx.stroke();
              }
            }
          }

          // Connect Vertical
          if (r + 1 < rows) {
            const pDown = points[r + 1][c];
            if (pDown) {
              const midX = (p.x + pDown.x) / 2;
              const midY = (p.y + pDown.y) / 2;
              const textFactor = getTextVisibilityFactor(midX, midY);

              if (textFactor > 0.05) {
                const distToMouse = Math.hypot(midX - mouse.x, midY - mouse.y);
                const isNearMouse = distToMouse < mouse.radius * 1.2;

                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(pDown.x, pDown.y);

                if (isNearMouse) {
                  const baseAlpha = Math.max(0.1, 0.48 * (1 - distToMouse / (mouse.radius * 1.2)));
                  ctx.strokeStyle = `rgba(0, 0, 0, ${baseAlpha * textFactor})`;
                } else {
                  ctx.strokeStyle = `rgba(0, 0, 0, ${0.06 * textFactor})`;
                }
                ctx.stroke();
              }
            }
          }

          // Draw small intersections (Nodes)
          const nodeTextFactor = getTextVisibilityFactor(p.x, p.y);
          if (nodeTextFactor > 0.08) {
            const distToMouse = Math.hypot(p.x - mouse.x, p.y - mouse.y);
            const isNearMouse = distToMouse < mouse.radius * 1.2;

            if (isNearMouse) {
              const dotAlpha = Math.max(0.3, 0.9 * (1 - distToMouse / (mouse.radius * 1.2))) * nodeTextFactor;
              ctx.fillStyle = `rgba(0, 0, 0, ${dotAlpha})`;
              ctx.beginPath();
              ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
              ctx.fill();

              ctx.fillStyle = `rgba(255, 255, 255, ${nodeTextFactor})`;
              ctx.beginPath();
              ctx.arc(p.x, p.y, 1, 0, Math.PI * 2);
              ctx.fill();
            } else if ((r + c) % 2 === 0) {
              ctx.fillStyle = `rgba(0, 0, 0, ${0.12 * nodeTextFactor})`;
              ctx.beginPath();
              ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      // 3. Subtle elastic tether lines connecting to mouse cursor
      if (mouse.x > 0 && mouse.y > 0 && mouse.x < width && mouse.y < height) {
        const cursorTextFactor = getTextVisibilityFactor(mouse.x, mouse.y);
        if (cursorTextFactor > 0.2) {
          ctx.beginPath();
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const p = points[r][c];
              const dist = Math.hypot(p.x - mouse.x, p.y - mouse.y);
              if (dist < mouse.radius * 0.65) {
                const pFactor = getTextVisibilityFactor(p.x, p.y);
                if (pFactor > 0.2) {
                  ctx.moveTo(p.x, p.y);
                  ctx.lineTo(mouse.x, mouse.y);
                }
              }
            }
          }
          ctx.strokeStyle = `rgba(0, 0, 0, ${0.14 * cursorTextFactor})`;
          ctx.lineWidth = 1;
          ctx.stroke();

          // Soft monochrome spotlight ring
          const gradient = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, mouse.radius);
          gradient.addColorStop(0, `rgba(0, 0, 0, ${0.04 * cursorTextFactor})`);
          gradient.addColorStop(0.5, `rgba(0, 0, 0, ${0.015 * cursorTextFactor})`);
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(mouse.x, mouse.y, mouse.radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="interactive-net-canvas"
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.95,
      }}
    />
  );
}
