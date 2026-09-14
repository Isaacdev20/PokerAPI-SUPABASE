import * as THREE from 'three';

export function initDottedSurface(containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const {
        size = 8,
        opacity = 0.8,
        sizeAttenuation = true,
        vertexColors = true,
        theme = 'dark' // Default to dark for this app
    } = options;

    const SEPARATION = 150;
    const AMOUNTX = 40;
    const AMOUNTY = 60;

    // Scene setup
    const scene = new THREE.Scene();
    // We adjust fog color to match the app's dark green background if desired, or keep it neutral
    scene.fog = new THREE.Fog(0x070e0b, 2000, 10000);

    const camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        1,
        10000,
    );
    camera.position.set(0, 355, 1220);

    const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(scene.fog.color, 0); // 0 alpha makes it transparent so CSS gradient shows

    container.appendChild(renderer.domElement);

    // Create particles
    const positions = [];
    const colors = [];

    // Create geometry for all particles
    const geometry = new THREE.BufferGeometry();

    for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
            const x = ix * SEPARATION - (AMOUNTX * SEPARATION) / 2;
            const y = 0; // Will be animated
            const z = iy * SEPARATION - (AMOUNTY * SEPARATION) / 2;

            positions.push(x, y, z);
            if (theme === "dark") {
                colors.push(200/255, 200/255, 200/255);
            } else {
                colors.push(0, 0, 0);
            }
        }
    }

    geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    // Create material
    const material = new THREE.PointsMaterial({
        size,
        vertexColors,
        color: vertexColors ? undefined : (theme === "dark" ? 0xc8c8c8 : 0x000000),
        transparent: true,
        opacity,
        sizeAttenuation,
    });

    // Create points object
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    let count = 0;
    let animationId;

    // Animation function
    const animate = () => {
        animationId = requestAnimationFrame(animate);

        const positionAttribute = geometry.attributes.position;
        const positions = positionAttribute.array;

        let i = 0;
        for (let ix = 0; ix < AMOUNTX; ix++) {
            for (let iy = 0; iy < AMOUNTY; iy++) {
                const index = i * 3;

                // Animate Y position with sine waves
                positions[index + 1] =
                    Math.sin((ix + count) * 0.3) * 50 +
                    Math.sin((iy + count) * 0.5) * 50;

                i++;
            }
        }

        positionAttribute.needsUpdate = true;

        renderer.render(scene, camera);
        count += 0.1;
    };

    // Handle window resize
    const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", handleResize);

    // Start animation
    animate();

    // Cleanup function
    return () => {
        window.removeEventListener("resize", handleResize);
        cancelAnimationFrame(animationId);

        geometry.dispose();
        material.dispose();
        renderer.dispose();

        if (container && renderer.domElement) {
            container.removeChild(renderer.domElement);
        }
    };
}
