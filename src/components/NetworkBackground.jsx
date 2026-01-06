import React, { useEffect, useRef } from 'react';

const NetworkBackground = ({ themeColor }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let width, height, particles = [];

        const resize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            init();
        };

        class PulseParticle {
            constructor() {
                this.x = Math.random() * width;
                this.y = Math.random() * height;
                this.vx = (Math.random() - 0.5) * 0.8;
                this.vy = (Math.random() - 0.5) * 0.8;
                this.pulses = [];
            }
            update() {
                this.x += this.vx; this.y += this.vy;
                if (this.x < 0 || this.x > width) this.vx *= -1;
                if (this.y < 0 || this.y > height) this.vy *= -1;
            }
        }

        const init = () => {
            particles = Array.from({ length: 80 }, () => new PulseParticle());
        };

        const draw = (mouse) => {
            ctx.clearRect(0, 0, width, height);
            ctx.strokeStyle = themeColor + '22';
            ctx.lineWidth = 0.5;

            particles.forEach((p, i) => {
                p.update();
                ctx.beginPath();
                ctx.arc(p.x, p.y, 1, 0, Math.PI * 2);
                ctx.fillStyle = themeColor + '66';
                ctx.fill();

                for (let j = i + 1; j < particles.length; j++) {
                    const p2 = particles[j];
                    const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
                    if (dist < 200) {
                        ctx.beginPath();
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                        
                        // WOW FACTOR: DATA PULSES
                        if (Math.random() > 0.995) p.pulses.push({ t: 0, target: p2 });
                    }
                }

                p.pulses = p.pulses.filter(pulse => {
                    pulse.t += 0.01;
                    const px = p.x + (pulse.target.x - p.x) * pulse.t;
                    const py = p.y + (pulse.target.y - p.y) * pulse.t;
                    ctx.beginPath();
                    ctx.arc(px, py, 2, 0, Math.PI * 2);
                    ctx.fillStyle = themeColor;
                    ctx.fill();
                    return pulse.t < 1;
                });
            });
            requestAnimationFrame(() => draw(mouse));
        };

        resize();
        window.addEventListener('resize', resize);
        draw({x: 0, y: 0});
        return () => window.removeEventListener('resize', resize);
    }, [themeColor]);

    return <canvas ref={canvasRef} className="fixed inset-0 z-0 bg-[#020617]" style={{ opacity: 0.8 }} />;
};

export default NetworkBackground;