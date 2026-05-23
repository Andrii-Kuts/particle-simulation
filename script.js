const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

prepare(canvas);

let lastTick = 0;

function loop(timestamp) {
    requestAnimationFrame(loop);

    let delta = timestamp - lastTick;
    if(delta >= TICK_INTERVAL) {
        tick(canvas);
        delta -= TICK_INTERVAL;
        lastTick += TICK_INTERVAL;
    }

    render(ctx);
}
requestAnimationFrame(loop);

