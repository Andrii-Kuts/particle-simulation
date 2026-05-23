// x y
// vx vy
// color - visual
// group - logical
// size (radius)

const centralForceScale = 0.00001;
const dragCoefficient = 0.9;
const baseRepelDistance = 35;
const groupRepelDistance = 60;
const repelForce = 0.01;
const cursorRepelDistance = 150;
const cursorRepelForce = 2;
const swirlDistance = 300;
const swirlForce = 1;
const edgeDistance = baseRepelDistance;
const capitalEdgeDistance = 115;
const particleEdgeLimit = 3;
const virusColor = "#770000"
const capitalEdgeColor = "#1e1439";

class Particle {
    constructor(x, y, size, color, group, capital, virus) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.size = size;
        this.color = color;
        this.group = group;
        this.mass = size;
        this.capital = capital;
        this.virus = virus;
    }

    render(ctx) {
        ctx.beginPath();
        ctx.fillStyle = this.virus ? virusColor : this.color;
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
    }

    contaminate() {
        if(this.virus)
            return;
        this.size = Math.exp(Math.random() * 4) * 0.4;
        this.virus = true;
    }

    renderEdge(ctx, anotherParticle) {
        const virus = this.virus | anotherParticle.virus;
        ctx.beginPath();
        ctx.strokeStyle = virus ? virusColor
            : this.group != anotherParticle.group ? capitalEdgeColor 
            : this.color;
        ctx.lineWidth = virus ? 2.0 : 1.0;
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(anotherParticle.x, anotherParticle.y);
        ctx.stroke();
        ctx.closePath();

        if(virus) {
            this.contaminate();
            anotherParticle.contaminate();
        }
    }
}

particles = [];
cursor = { x: -1000, y: -1000 }
isPressed = false;

function generateParticles(canvas) {
    const count = 10000;
    const colors = ['#09C2FF', '#9112FF', '#FFF400', '#FF8300'];
    const spread = 2000;
    const capitalProbability = 1/50;

    for(let i = 0; i < count; i++) {
        // x, y are between -100 and +100
        const colorGroup = Math.floor(Math.random() * 4)
        const isCapital = Math.random() < capitalProbability;
        // const radius = ;

        particles.push(new Particle(
            Math.random() * spread - spread / 2.0 + canvas.width / 2.0,
            Math.random() * spread - spread / 2.0 + canvas.height / 2.0,
            isCapital ? 6 : 2,
            colors[colorGroup],
            colorGroup,
            false,
            false,
        ));
    }

    const greenBall = new Particle(50, 50, 15, "white", -1, true, true);
    greenBall.mass = 1000;
    particles.push(greenBall);
}

function renderEdges(ctx, edgeDistance, edgeCount, particleFilter, filter) {
    const grid = new Map();
    const gridSize = edgeDistance + 15.0;

    for(let particle of particles) {
        const gx = Math.floor(particle.x / gridSize);
        const gy = Math.floor(particle.y / gridSize);
        const index = gx * 1000000000 + gy;
        if(!grid.has(index)) {
            grid.set(index, []);
        }
        grid.get(index).push(particle);
    }

    for(let particle of particles) {
        if(!particleFilter(particle))
            continue;
        // position of our particle in the grid
        const gx = Math.floor(particle.x / gridSize);
        const gy = Math.floor(particle.y / gridSize);
        const closestParticles = [];

        for(let gdx = -1; gdx <= 1; gdx++) {
            for(let gdy = -1; gdy <= 1; gdy++) {
                const g2x = gx + gdx;
                const g2y = gy + gdy;
                const index = g2x * 1000000000 + g2y;
                if(!grid.has(index))
                    continue;
                
                for(let anotherParticle of grid.get(index)) {
                    if(!filter(particle, anotherParticle))
                        continue;

                    const dx = particle.x - anotherParticle.x;
                    const dy = particle.y - anotherParticle.y;
                    const d2 = dx * dx + dy * dy;

                    if(d2 > edgeDistance * edgeDistance)
                        continue;

                    let pair = { particle: anotherParticle, distance: d2 };
                    for(let i = 0; i < edgeCount; i++) {
                        if(i >= closestParticles.length) {
                            closestParticles.push(pair);
                            break;
                        }
                        if(closestParticles[i].distance > pair.distance) {
                            [closestParticles[i], pair] = [pair, closestParticles[i]];
                        }
                    }
                }
            }
        }

        for(let { particle: anotherParticle, distance } of closestParticles) {
            particle.renderEdge(ctx, anotherParticle);
        }
    }
}

// drawing stuff
function render(ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    renderEdges(ctx, edgeDistance, particleEdgeLimit, p => true, (a, b) => a.group == b.group, false);
    renderEdges(ctx, capitalEdgeDistance, 1000, p => p.capital, (a, b) => a.capital || b.capital, true);

    for(let particle of particles) {
        particle.render(ctx);
    }

    
}

// physics stuff
function tick(canvas) {
    const centerX = canvas.width / 2.0;
    const centerY = canvas.height / 2.0;

    // keys - grid cells (?)
    // values - list of all particles in that cell
    // grid cell = {x, y} DOESNT WORK! {0, 0} != {0, 0}
    // cell index = x * 1000000000 + y DOES WORK!
    const grid = new Map();
    const gridSize = groupRepelDistance + 15.0;

    for(let particle of particles) {
        const gx = Math.floor(particle.x / gridSize);
        const gy = Math.floor(particle.y / gridSize);
        const index = gx * 1000000000 + gy;
        if(!grid.has(index)) {
            grid.set(index, []);
        }
        grid.get(index).push(particle);
    }

    for(let particle of particles) {
        const fx = (centerX - particle.x) * centralForceScale;
        const fy = (centerY - particle.y) * centralForceScale;
        
        // applying force to particle velocity
        particle.vx += fx;
        particle.vy += fy;

        // position of our particle in the grid
        const gx = Math.floor(particle.x / gridSize);
        const gy = Math.floor(particle.y / gridSize);

        for(let gdx = -1; gdx <= 1; gdx++) {
            for(let gdy = -1; gdy <= 1; gdy++) {
                const g2x = gx + gdx;
                const g2y = gy + gdy;
                const index = g2x * 1000000000 + g2y;
                if(!grid.has(index))
                    continue;
                
                // applying particle repel forces
                for(let anotherParticle of grid.get(index)) {
                    if(particle == anotherParticle)
                        continue;

                    const dx = particle.x - anotherParticle.x;
                    const dy = particle.y - anotherParticle.y;
                    const d2 = dx * dx + dy * dy;
                    const d = Math.max(Math.sqrt(d2) - particle.size - anotherParticle.size, 1);
                    // const d = Math.sqrt(d2);

                    // particles are too far away to be repelled
                    const repelDistance = (particle.group == anotherParticle.group) ?
                        baseRepelDistance :
                        groupRepelDistance;
                    if(d > repelDistance)
                        continue;

                    let f = ((repelDistance - d) / repelDistance) * repelForce * particle.mass * anotherParticle.mass;
                    const rfx = (particle.x - anotherParticle.x) * f / d;
                    const rfy = (particle.y - anotherParticle.y) * f / d;

                    // applying repel force
                    particle.vx += rfx / particle.mass;
                    particle.vy += rfy / particle.mass;
                }
            }
        }

        // applying cursor repel force
        const cursorDx = cursor.x - particle.x;
        const cursorDy = cursor.y - particle.y;
        const cursorDistance2 = cursorDx * cursorDx + cursorDy * cursorDy;
        // particle is within cursor repel distance
        if(cursorDistance2 <= cursorRepelDistance * cursorRepelDistance) {
            const cursorDistance = Math.max(Math.sqrt(cursorDistance2), 1);
            const f = (cursorRepelDistance - cursorDistance) / cursorRepelDistance * cursorRepelForce;
            const cfx = (particle.x - cursor.x) * f / cursorDistance;
            const cfy = (particle.y - cursor.y) * f / cursorDistance;

            particle.vx += cfx;
            particle.vy += cfy;
        }

        // applying cursor swirl force
        if(isPressed && cursorDistance2 <= swirlDistance * swirlDistance) {
            const cursorDistance = Math.max(Math.sqrt(cursorDistance2), 1);
            const f = (swirlDistance - cursorDistance) / swirlDistance * swirlForce;
            // notice that vector is rotated 90 degrees
            const sfx = (particle.y - cursor.y) * f / cursorDistance;
            const sfy = -(particle.x - cursor.x) * f / cursorDistance;

            particle.vx += sfx;
            particle.vy += sfy;
        }

        // applying drag (air resistance)
        particle.vx *= dragCoefficient;
        particle.vy *= dragCoefficient;

        // applying particle velocity to its position
        particle.x += particle.vx;
        particle.y += particle.vy;
    }
}

function prepare(canvas) {
    generateParticles(canvas);
    canvas.addEventListener("mousemove", (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        cursor = { x, y };
    });
    canvas.addEventListener("mouseleave", (event) => {
        cursor = { x: -1000, y: -100 };
        isPressed = false;
    })

    canvas.addEventListener("mousedown", (event) => {
        isPressed = true;
    });
    canvas.addEventListener("mouseup", (event) => {
        isPressed = false;
    });
}