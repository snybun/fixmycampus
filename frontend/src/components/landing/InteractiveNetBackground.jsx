import React, { useEffect, useRef } from 'react';

/**
 * InteractiveNetBackground
 * Renders an interactive elastic geometric net/mesh canvas behind the page.
 * Vertices react dynamically with spring physics when the mouse moves or drags across.
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
    const spacing = 46; // Distance between net intersections
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
        this.damping = 0.88; // Friction
        this.spring = 0.045; // Return to origin strength
      }

      update() {
        // Elastic return force
        const dxOrigin = this.originX - this.x;
        const dyOrigin = this.originY - this.y;
        this.vx += dxOrigin * this.spring;
        this.vy += dyOrigin * this.spring;

        // Mouse interaction (repel + drag wave)
        const dxMouse = this.x - mouse.x;
        const dyMouse = this.y - mouse.y;
        const dist = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);

        if (dist < mouse.radius && dist > 0) {
          const force = (mouse.radius - dist) / mouse.radius;
          const angle = Math.atan2(dyMouse, dxMouse);

          // Displace point away from cursor
          this.vx += Math.cos(angle) * force * 5.2;
          this.vy += Math.sin(angle) * force * 5.2;

          // Add slight momentum from mouse velocity
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
      resizeTimer = setTimeout(initGrid, 150);
    };
    window.addEventListener('resize', handleResize);

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

          // Calculate distance from cursor for dynamic lighting effect
          const distToMouse = Math.hypot(p.x - mouse.x, p.y - mouse.y);
          const isNearMouse = distToMouse < mouse.radius * 1.2;

          // Connect Horizontal
          if (c + 1 < cols) {
            const pRight = points[r][c + 1];
            if (pRight) {
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(pRight.x, pRight.y);

              if (isNearMouse) {
                const alpha = Math.max(0.08, 0.42 * (1 - distToMouse / (mouse.radius * 1.2)));
                ctx.strokeStyle = `rgba(14, 165, 233, ${alpha})`; // Subtle cyan/blue accent near mouse
              } else {
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.055)'; // Base subtle monochrome net
              }
              ctx.stroke();
            }
          }

          // Connect Vertical
          if (r + 1 < rows) {
            const pDown = points[r + 1][c];
            if (pDown) {
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(pDown.x, pDown.y);

              if (isNearMouse) {
                const alpha = Math.max(0.08, 0.42 * (1 - distToMouse / (mouse.radius * 1.2)));
                ctx.strokeStyle = `rgba(14, 165, 233, ${alpha})`;
              } else {
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.055)';
              }
              ctx.stroke();
            }
          }

          // Draw small intersections (Nodes)
          if (isNearMouse) {
            const dotAlpha = Math.max(0.2, 0.8 * (1 - distToMouse / (mouse.radius * 1.2)));
            ctx.fillStyle = `rgba(2, 132, 199, ${dotAlpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
            ctx.fill();
          } else if ((r + c) % 2 === 0) {
            // Draw subtle junction dots on alternating nodes
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // 3. Subtle elastic tether lines connecting to mouse cursor
      if (mouse.x > 0 && mouse.y > 0 && mouse.x < width && mouse.y < height) {
        ctx.beginPath();
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const p = points[r][c];
            const dist = Math.hypot(p.x - mouse.x, p.y - mouse.y);
            if (dist < mouse.radius * 0.65) {
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(mouse.x, mouse.y);
            }
          }
        }
        ctx.strokeStyle = 'rgba(14, 165, 233, 0.12)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Soft cursor spotlight ring
        const gradient = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, mouse.radius);
        gradient.addColorStop(0, 'rgba(56, 189, 248, 0.15)');
        gradient.addColorStop(0.5, 'rgba(14, 165, 233, 0.04)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, mouse.radius, 0, Math.PI * 2);
        ctx.fill();
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
        opacity: 0.9,
      }}
    />
  );
}
