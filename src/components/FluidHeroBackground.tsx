import { useEffect, useRef } from "react";

interface Particle {
  x: number;  // Initial 3D point on unit sphere
  y: number;
  z: number;
  tx: number; // Tangent vector X
  ty: number; // Tangent vector Y
  tz: number; // Tangent vector Z
  size: number;
  baseLength: number;
}

export default function FluidHeroBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const particles: Particle[] = [];
    const N = 950; // High density matches the screenshot perfectly
    const goldenRatio = (1 + Math.sqrt(5)) / 2;

    // Generate beautifully distributed nodes on a 3D sphere using Fibonacci sphere algorithm
    for (let i = 0; i < N; i++) {
      const theta = (2 * Math.PI * i) / goldenRatio;
      const phi = Math.acos(1 - (2 * (i + 0.5)) / N);
      
      const x = Math.cos(theta) * Math.sin(phi);
      const y = Math.sin(theta) * Math.sin(phi);
      const z = Math.cos(phi);

      // Create orbital swirling tangent vectors aligned with rotation
      let tx = -z;
      let ty = (Math.random() - 0.5) * 0.08; // subtle organic noise expansion
      let tz = x;

      // Normalize tangent vector
      const len = Math.sqrt(tx * tx + ty * ty + tz * tz);
      tx /= len;
      ty /= len;
      tz /= len;

      particles.push({
        x,
        y,
        z,
        tx,
        ty,
        tz,
        size: 1.6 + Math.random() * 2.2,
        baseLength: 10 + Math.random() * 12,
      });
    }

    // Interactive mouse positioning
    const mouse = {
      x: 0.5,
      y: 0.5,
      targetX: 0.5,
      targetY: 0.5,
      xPixels: 0,
      yPixels: 0,
      active: false,
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.targetX = (e.clientX - rect.left) / canvas.width;
      mouse.targetY = (e.clientY - rect.top) / canvas.height;
      mouse.xPixels = e.clientX - rect.left;
      mouse.yPixels = e.clientY - rect.top;
      mouse.active = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        mouse.targetX = (touch.clientX - rect.left) / canvas.width;
        mouse.targetY = (touch.clientY - rect.top) / canvas.height;
        mouse.xPixels = touch.clientX - rect.left;
        mouse.yPixels = touch.clientY - rect.top;
        mouse.active = true;
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener("resize", resize, { passive: true });
    resize();

    // Inertia simulation variables
    let autoRotX = 0;
    let autoRotY = 0;
    let currentRotX = 0;
    let currentRotY = 0;

    const angleXSpeed = 0.0008; // slow elegant auto-pilot orbiting
    const angleYSpeed = 0.0012;

    let animId: number;

    const rotateY = (x: number, z: number, theta: number): [number, number] => {
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      return [x * cos - z * sin, x * sin + z * cos];
    };

    const rotateX = (y: number, z: number, theta: number): [number, number] => {
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      return [y * cos - z * sin, y * sin + z * cos];
    };

    // Color gradient mapping based on diagonal coordinates inside the sphere projection
    const getParticleColor = (axisValue: number): string => {
      // axisValue generally ranges from -1.0 to 1.0 depending on projected location
      if (axisValue < -0.4) {
        return "rgb(251, 146, 60)"; // orange-yellow
      } else if (axisValue < 0.0) {
        return "rgb(244, 63, 94)";  // pinkish coral rose
      } else if (axisValue < 0.4) {
        return "rgb(139, 92, 246)"; // indigo-purple
      } else {
        return "rgb(50, 121, 249)";  // Google blue
      }
    };

    // Core Animation Frame Loop
    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Sphere bounds tracking
      const sphereRadius = Math.min(width, height) * 0.42;
      const centerX = width / 2;
      const centerY = height / 2;

      // Update auto rotators
      autoRotX += angleXSpeed;
      autoRotY += angleYSpeed;

      // Target steering rotation from mouse position displacement
      const targetRotY = mouse.active ? (mouse.targetX - 0.5) * 1.6 : 0;
      const targetRotX = mouse.active ? -(mouse.targetY - 0.5) * 1.6 : 0;

      // Smooth buttery lerp inertia transitions
      currentRotX += (targetRotX - currentRotX) * 0.06;
      currentRotY += (targetRotY - currentRotY) * 0.06;

      const totalAngleX = autoRotX + currentRotX;
      const totalAngleY = autoRotY + currentRotY;

      // Render layers by Z-depth descending to prevent painting issues (optional for low opacity but clean)
      // Sort can be skipped since we use multiplier alpha mode on translucent slate backdrop,
      // which is extremely fast and performant.

      particles.forEach((p) => {
        // Compute tangent points defining the 3D capsule line segment endpoints (P1 & P2)
        const halfLen = p.baseLength / 2;

        // Tangent vector offset in model coordinates
        const ltx = p.tx * halfLen;
        const lty = p.ty * halfLen;
        const ltz = p.tz * halfLen;

        const p1x = p.x * sphereRadius - ltx;
        const p1y = p.y * sphereRadius - lty;
        const p1z = p.z * sphereRadius - ltz;

        const p2x = p.x * sphereRadius + ltx;
        const p2y = p.y * sphereRadius + lty;
        const p2z = p.z * sphereRadius + ltz;

        // Apply 3D Sphere rotations
        // 1. Rotate start point P1 around vertical Y axis
        const [r1x_temp, r1z_temp] = rotateY(p1x, p1z, totalAngleY);
        // 2. Rotate start point P1 around horizontal X axis
        const [r1y, r1z] = rotateX(p1y, r1z_temp, totalAngleX);
        const r1x = r1x_temp;

        // Same for end point P2
        const [r2x_temp, r2z_temp] = rotateY(p2x, p2z, totalAngleY);
        const [r2y, r2z] = rotateX(p2y, r2z_temp, totalAngleX);
        const r2x = r2x_temp;

        // Center projection for depth scaling
        const [rcx_temp, rcz_temp] = rotateY(p.x * sphereRadius, p.z * sphereRadius, totalAngleY);
        const [, rcz] = rotateX(p.y * sphereRadius, rcz_temp, totalAngleX);

        // Perspective camera calculations
        const dCamera = sphereRadius * 2.3;
        const zScale1 = dCamera / (dCamera + r1z);
        const zScale2 = dCamera / (dCamera + r2z);
        const zScaleCenter = dCamera / (dCamera + rcz);

        // Project onto 2D screen coordinate frame
        const sx1 = centerX + r1x * zScale1;
        const sy1 = centerY + r1y * zScale1;

        const sx2 = centerX + r2x * zScale2;
        const sy2 = centerY + r2y * zScale2;

        // Real-time mouse repulsion / tactile stretch
        const midX = (sx1 + sx2) / 2;
        const midY = (sx1 + sx2) / 2; // Keep stable measure
        const realMidY = (sy1 + sy2) / 2;

        const mdx = midX - mouse.xPixels;
        const mdy = realMidY - mouse.yPixels;
        const mDist = Math.sqrt(mdx * mdx + mdy * mdy);

        let pushX = 0;
        let pushY = 0;
        let hoverStretch = 1.0;

        const pushRadius = 135;
        if (mouse.active && mDist < pushRadius && mDist > 0.1) {
          const factor = 1.0 - mDist / pushRadius; // 0 (outer boundary) to 1 (at cursor center)
          const pushForce = factor * factor * 28; // pushes capsules organically outwards
          pushX = (mdx / mDist) * pushForce;
          pushY = (mdy / mDist) * pushForce;

          // Elastic stretching capsule effect
          hoverStretch = 1.0 + factor * 1.6;
        }

        // Incorporate screen displacements and hover stretch
        const finalX1 = sx1 + pushX - (sx2 - sx1) * (hoverStretch - 1) * 0.5;
        const finalY1 = sy1 + pushY - (sy2 - sy1) * (hoverStretch - 1) * 0.5;
        const finalX2 = sx2 + pushX + (sx2 - sx1) * (hoverStretch - 1) * 0.5;
        const finalY2 = sy2 + pushY + (sy2 - sy1) * (hoverStretch - 1) * 0.5;

        // Map colors smoothly using diagonal gradient axis relative to center layout
        const diagonalVal = ((midX - centerX) - (realMidY - centerY)) / (sphereRadius * 0.85);
        const capsuleColor = getParticleColor(diagonalVal);

        // Set atmospheric depth alpha channel values
        const depthAlpha = Math.max(0.12, (1.0 - (rcz + sphereRadius) / (sphereRadius * 2.0))) * 0.82;

        // Render stroke capsule onto background
        ctx.beginPath();
        ctx.moveTo(finalX1, finalY1);
        ctx.lineTo(finalX2, finalY2);

        ctx.strokeStyle = capsuleColor;
        ctx.lineWidth = Math.max(1.3, p.size * zScaleCenter * hoverStretch);
        ctx.lineCap = "round";
        ctx.globalAlpha = depthAlpha;
        ctx.stroke();
      });

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="antigravity-particles-canvas"
      className="pointer-events-none fixed inset-0 w-screen h-screen"
      style={{
        zIndex: 0,
        mixBlendMode: "multiply", // Beautiful rich overlay blending onto slate background
        opacity: 0.95,
      }}
    />
  );
}
