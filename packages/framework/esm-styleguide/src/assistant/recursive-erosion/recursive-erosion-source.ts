export const recursiveErosionSource = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recursive Erosion Particle Sphere</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #0a0908;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #stage {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      display: block;
    }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
</head>
<body>
  <canvas id="stage"></canvas>

  <script>
    (function() {
      var canvas = document.getElementById('stage');
      var width = window.innerWidth;
      var height = window.innerHeight;

      // Ensure canvas has dimension
      canvas.width = width;
      canvas.height = height;

      // Mouse tracking
      var mouseX = 0, mouseY = 0;
      var targetRotX = 0, targetRotY = 0;
      window.addEventListener('mousemove', function(e) {
        mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
      });

      // Simple 3D noise approximation
      function snoise(x, y, z) {
        return Math.sin(x * 1.7 + y * 2.3) * Math.cos(y * 1.5 + z * 2.1) * Math.sin(z * 1.9 + x * 0.9);
      }

      // Check if THREE is loaded
      if (typeof THREE !== 'undefined') {
        initThree();
      } else {
        // In case external CDN fails, fallback to standalone canvas 2D rendering
        initCanvasFallback();
      }

      function initThree() {
        var scene = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
        camera.position.z = 240;

        var renderer = new THREE.WebGLRenderer({
          canvas: canvas,
          antialias: true,
          alpha: true,
          powerPreference: "high-performance"
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

        // Create 7,000 points on Fibonacci sphere
        var particleCount = 7000;
        var geometry = new THREE.BufferGeometry();
        var positions = new Float32Array(particleCount * 3);
        var basePositions = new Float32Array(particleCount * 3);
        var colors = new Float32Array(particleCount * 3);
        var sizes = new Float32Array(particleCount);

        var sphereRadius = 82;
        var goldenRatio = (1 + Math.sqrt(5)) / 2;

        for (var i = 0; i < particleCount; i++) {
          var y = 1 - (i / (particleCount - 1)) * 2;
          var radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
          var theta = 2 * Math.PI * i / goldenRatio;

          var x = Math.cos(theta) * radiusAtY;
          var z = Math.sin(theta) * radiusAtY;

          var bx = x * sphereRadius;
          var by = y * sphereRadius;
          var bz = z * sphereRadius;

          basePositions[i * 3] = bx;
          basePositions[i * 3 + 1] = by;
          basePositions[i * 3 + 2] = bz;

          positions[i * 3] = bx;
          positions[i * 3 + 1] = by;
          positions[i * 3 + 2] = bz;

          // Warm orange / amber / golden palette with organic gradient
          var ratio = (y + 1) * 0.5;
          var r = 1.0;
          var g = 0.38 + ratio * 0.28 + Math.random() * 0.12;
          var b = 0.05 + ratio * 0.08;

          colors[i * 3] = r;
          colors[i * 3 + 1] = g;
          colors[i * 3 + 2] = b;

          sizes[i] = 1.2 + Math.random() * 2.0;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        // Circular glow particle texture
        var circleCanvas = document.createElement('canvas');
        circleCanvas.width = 64;
        circleCanvas.height = 64;
        var ctx = circleCanvas.getContext('2d');
        var grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(0.2, 'rgba(255, 160, 60, 0.9)');
        grad.addColorStop(0.5, 'rgba(255, 90, 20, 0.4)');
        grad.addColorStop(1, 'rgba(255, 60, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);

        var pTexture = new THREE.CanvasTexture(circleCanvas);

        var material = new THREE.PointsMaterial({
          size: 3.2,
          vertexColors: true,
          map: pTexture,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          opacity: 0.92
        });

        var points = new THREE.Points(geometry, material);
        scene.add(points);

        // 8 jagged lightning arcs that strike across the sphere
        var arcGroup = new THREE.Group();
        var arcLines = [];
        var ARC_COUNT = 8;
        var ARC_SEGMENTS = 20;

        for (var a = 0; a < ARC_COUNT; a++) {
          var arcGeo = new THREE.BufferGeometry();
          var arcPos = new Float32Array(ARC_SEGMENTS * 3);
          arcGeo.setAttribute('position', new THREE.BufferAttribute(arcPos, 3));

          var arcMat = new THREE.LineBasicMaterial({
            color: new THREE.Color(1.0, 0.72 + Math.random() * 0.25, 0.3),
            transparent: true,
            opacity: 0.75,
            blending: THREE.AdditiveBlending,
            linewidth: 1.5
          });

          var line = new THREE.Line(arcGeo, arcMat);
          arcLines.push({ line: line, geo: arcGeo, phase: Math.random() * Math.PI * 2, speed: 0.8 + Math.random() * 0.6 });
          arcGroup.add(line);
        }
        scene.add(arcGroup);

        // Inner glowing core
        var coreGeo = new THREE.SphereGeometry(sphereRadius * 0.3, 16, 16);
        var coreMat = new THREE.MeshBasicMaterial({
          color: 0xff5500,
          transparent: true,
          opacity: 0.08,
          blending: THREE.AdditiveBlending,
          wireframe: true
        });
        var coreMesh = new THREE.Mesh(coreGeo, coreMat);
        scene.add(coreMesh);

        var clock = new THREE.Clock();

        function animate() {
          requestAnimationFrame(animate);
          var time = clock.getElapsedTime();

          // 4-second erosion breathing loop
          var loopCycle = (time % 4.0) / 4.0; // 0 to 1
          var erosionPulse = Math.sin(loopCycle * Math.PI * 2);

          var posAttr = geometry.attributes.position;
          var posArray = posAttr.array;

          for (var i = 0; i < particleCount; i++) {
            var i3 = i * 3;
            var bx = basePositions[i3];
            var by = basePositions[i3 + 1];
            var bz = basePositions[i3 + 2];

            // 3D noise for recursive erosion crumpling & hole creation
            var nVal = snoise(bx * 0.025 + time * 0.4, by * 0.025 + time * 0.3, bz * 0.025);
            var isHole = nVal > (0.42 - erosionPulse * 0.25);

            var displace = isHole ? (1.0 + (nVal - 0.3) * 0.65) : (1.0 + nVal * 0.12 * erosionPulse);
            posArray[i3] = bx * displace;
            posArray[i3 + 1] = by * displace;
            posArray[i3 + 2] = bz * displace;
          }
          posAttr.needsUpdate = true;

          // Lightning arcs updates
          for (var a = 0; a < ARC_COUNT; a++) {
            var arcObj = arcLines[a];
            var aGeo = arcObj.geo;
            var aPos = aGeo.attributes.position.array;

            var tPhase = time * arcObj.speed + arcObj.phase;
            var p1Idx = Math.floor(Math.abs(Math.sin(tPhase * 0.7) * (particleCount - 1)));
            var p2Idx = Math.floor(Math.abs(Math.cos(tPhase * 0.5) * (particleCount - 1)));

            var x1 = posArray[p1Idx * 3], y1 = posArray[p1Idx * 3 + 1], z1 = posArray[p1Idx * 3 + 2];
            var x2 = posArray[p2Idx * 3], y2 = posArray[p2Idx * 3 + 1], z2 = posArray[p2Idx * 3 + 2];

            for (var s = 0; s < ARC_SEGMENTS; s++) {
              var tSeg = s / (ARC_SEGMENTS - 1);
              var sx = x1 + (x2 - x1) * tSeg;
              var sy = y1 + (y2 - y1) * tSeg;
              var sz = z1 + (z2 - z1) * tSeg;

              // Jagged lightning noise displacement
              if (s > 0 && s < ARC_SEGMENTS - 1) {
                var jitter = Math.sin(tSeg * Math.PI) * 7.5;
                sx += (Math.random() - 0.5) * jitter;
                sy += (Math.random() - 0.5) * jitter;
                sz += (Math.random() - 0.5) * jitter;
              }

              aPos[s * 3] = sx;
              aPos[s * 3 + 1] = sy;
              aPos[s * 3 + 2] = sz;
            }
            aGeo.attributes.position.needsUpdate = true;
            arcObj.line.material.opacity = 0.3 + Math.random() * 0.65;
          }

          // Smooth rotation & interactive mouse tilt
          targetRotX = mouseY * 0.45;
          targetRotY = mouseX * 0.55;

          points.rotation.y += 0.0035;
          points.rotation.x += (targetRotX - points.rotation.x) * 0.05;
          points.rotation.z += (targetRotY * 0.2 - points.rotation.z) * 0.05;

          arcGroup.rotation.copy(points.rotation);
          coreMesh.rotation.copy(points.rotation);

          renderer.render(scene, camera);
        }

        animate();

        window.addEventListener('resize', function() {
          width = window.innerWidth;
          height = window.innerHeight;
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
        });
      }

      function initCanvasFallback() {
        var ctx = canvas.getContext('2d');
        var particles = [];
        var count = 3000;
        for (var i = 0; i < count; i++) {
          var y = 1 - (i / (count - 1)) * 2;
          var rAtY = Math.sqrt(Math.max(0, 1 - y * y));
          var theta = 2 * Math.PI * i / 1.6180339887;
          particles.push({
            x: Math.cos(theta) * rAtY,
            y: y,
            z: Math.sin(theta) * rAtY,
            baseRadius: 180
          });
        }

        var angleX = 0, angleY = 0;
        function renderLoop() {
          requestAnimationFrame(renderLoop);
          ctx.fillStyle = '#0a0908';
          ctx.fillRect(0, 0, width, height);

          var cx = width / 2;
          var cy = height / 2;

          angleY += 0.005;
          angleX = mouseY * 0.3;

          for (var i = 0; i < count; i += 2) {
            var p = particles[i];
            var cosY = Math.cos(angleY), sinY = Math.sin(angleY);
            var cosX = Math.cos(angleX), sinX = Math.sin(angleX);

            var x1 = p.x * cosY - p.z * sinY;
            var z1 = p.z * cosY + p.x * sinY;

            var y2 = p.y * cosX - z1 * sinX;
            var z2 = z1 * cosX + p.y * sinX;

            var scale = 400 / (400 + z2 * p.baseRadius);
            var px = cx + x1 * p.baseRadius * scale;
            var py = cy + y2 * p.baseRadius * scale;

            var alpha = Math.max(0.1, Math.min(1, (z2 + 1.2) * 0.45));
            ctx.fillStyle = 'rgba(255, 140, 40, ' + alpha + ')';
            ctx.beginPath();
            ctx.arc(px, py, Math.max(1, 2.0 * scale), 0, Math.PI * 2);
            ctx.fill();
          }
        }
        renderLoop();

        window.addEventListener('resize', function() {
          width = window.innerWidth;
          height = window.innerHeight;
          canvas.width = width;
          canvas.height = height;
        });
      }
    })();
  </script>
</body>
</html>`;
