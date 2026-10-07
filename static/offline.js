// Hidden runner game on the offline page.
// The screen only shows a pixel "OFFLINE". Space, up, W or a tap on it starts
// the game: jump the bugs and missing pages. Nothing hints at it, and the
// title comes back if nobody plays on after a crash.
(() => {
    const screen = document.querySelector(".offline-screen");
    if (!screen) return;
    screen.hidden = false;

    const canvas = screen.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    const verb = matchMedia("(pointer: coarse)").matches ? "TAP" : "PRESS SPACE";

    const COLORS = {
        "#": "#8ab4f8", // Title letters
        H: "#8b5a3c",   // Hair
        S: "#f0c090",   // Skin
        F: "#111",      // Eyes and mouth
        O: "#8ab4f8",   // Hoodie
        J: "#3d5a8a",   // Jeans
        K: "#e8e8e8",   // Sneakers
        G: "#81c995",   // Bugs
        W: "#ddd",      // Missing page
        Q: "#f28b82",   // Its question mark
    };

    // One character per pixel, "." is empty
    function sprite(rows) {
        const pixels = [];
        rows.forEach((row, y) => {
            [...row].forEach((ch, x) => {
                if (ch !== ".") pixels.push([x, y, COLORS[ch]]);
            });
        });
        return {w: rows[0].length, h: rows.length, pixels};
    }

    const LETTERS = {
        O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
        F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
        L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
        I: [".###.", "..#..", "..#..", "..#..", "..#..", "..#..", ".###."],
        N: ["#...#", "##..#", "##..#", "#.#.#", "#..##", "#..##", "#...#"],
        E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
    };
    // Each letter with its column on the title, one empty column apart
    const TITLE = [..."OFFLINE"].map((ch, i) => [sprite(LETTERS[ch]), i * 6]);

    const RUN_A = sprite([
        "...HHH..",
        "..HHHHH.",
        "..HHSSS.",
        "..HSSFS.",
        "...SSSS.",
        "...OOO..",
        "..OOOOOO",
        ".OOOOO.S",
        ".S.JJJ..",
        "..JJ.JJ.",
        ".JJ...JJ",
        ".K.....K",
    ]);
    const RUN_B = sprite([
        "...HHH..",
        "..HHHHH.",
        "..HHSSS.",
        "..HSSFS.",
        "...SSSS.",
        "...OOO..",
        "...OOO..",
        "...OOS..",
        "...JJJ..",
        "...JJ...",
        "...JJ...",
        "...KKK..",
    ]);
    const JUMP = sprite([
        "...HHH..",
        "..HHHHH.",
        "..HHSSS.",
        "..HSSFS.",
        "...SSSS.",
        "...OOO.S",
        "..OOOOO.",
        ".S.OOO..",
        "...JJJ..",
        "..JJ.JJ.",
        "..K..JJ.",
        "......K.",
    ]);
    // Tripped: sat down hard, mouth open
    const DAZED = sprite([
        ".HHHHH.",
        "HHHHHHH",
        "HSSSSSH",
        "HSFSFSH",
        ".SSFSS.",
        ".OOOOO.",
        "OOOOOOO",
        "SOOOOOS",
        ".JJJJJ.",
        "KK...KK",
    ]);

    const BUG = [
        sprite([".G...G.", "..GGG..", ".GFGFG.", "GGGGGGG", ".G.G.G."]),
        sprite([".G...G.", "..GGG..", ".GFGFG.", "GGGGGGG", "G.G.G.G"]),
    ];
    const PAGE = sprite([
        "WWWWW..",
        "W...WW.",
        "W.QQ.WW",
        "W...Q.W",
        "W..Q..W",
        "W.....W",
        "W..Q..W",
        "W.....W",
        "WWWWWWW",
    ]);

    // 3x5 font, rows top to bottom; only what the game prints
    const FONT = {
        A: "010101111101101", C: "011100100100011", E: "111100110100111",
        F: "111100110100100", H: "101101111101101", I: "111010010010111",
        L: "100100100100111", N: "101111111111101", O: "010101101101010",
        P: "110101110100100", R: "110101110101101", S: "011100010001110",
        T: "111010010010010", Y: "101101010010010",
        0: "111101101101111", 1: "010110010010111", 2: "110001010100111",
        3: "110001010001110", 4: "101101111001001", 5: "111100110001110",
        6: "011100111101111", 7: "111001010010010", 8: "111101111101111",
        9: "111101111001110",
    };

    const rand = (min, max) => min + Math.random() * (max - min);
    const pad = n => String(n).padStart(5, "0");
    const textWidth = (str, scale = 1) => (str.length * 4 - 1) * scale;
    const centered = (str, scale = 1) => Math.floor((W - textWidth(str, scale)) / 2);

    function draw(spr, x, y) {
        for (const [px, py, color] of spr.pixels) {
            ctx.fillStyle = color;
            ctx.fillRect(Math.round(x) + px, Math.round(y) + py, 1, 1);
        }
    }

    function text(str, x, y, color, scale = 1) {
        ctx.fillStyle = color;
        for (const ch of str) {
            const bits = FONT[ch] || "";
            for (let i = 0; i < bits.length; i++) {
                if (bits[i] === "1") {
                    ctx.fillRect(x + (i % 3) * scale, y + Math.floor(i / 3) * scale, scale, scale);
                }
            }
            x += 4 * scale;
        }
    }

    // World, in canvas pixels and seconds
    const GROUND = 56;
    const PERSON_X = 16;
    const PERSON_H = 12;
    const GRAVITY = 620;
    const JUMP_SPEED = -180;  // A full jump clears anything
    const SHORT_HOP = -125;   // Letting go early cuts the jump to this
    const START_SPEED = 72;
    const MAX_SPEED = 170;
    const ACCEL = 1.6;

    // Title drawn at 3x; ART units count from the top left of the "O"
    const ART = 3;
    const ART_X = Math.floor((W - 41 * ART) / 2);
    const ART_Y = Math.floor((H - 7 * ART) / 2);
    const SPARKLES = [[-3, -5], [5, -3], [14, -6], [23, -4], [31, -6], [40, -3], [43, 4], [-4, 9], [8, 10], [19, 12], [30, 10], [42, 11]];
    const BACK_TO_TITLE = 10000; // ms after a crash with no retry

    const BEST_KEY = "offline-run:best";
    let best = 0;
    try {
        best = Number(localStorage.getItem(BEST_KEY)) || 0;
    } catch {}

    let state = "title"; // "title", "play" or "over"
    let person = {y: GROUND - PERSON_H, vy: 0, onGround: true};
    let obstacles = [];
    let particles = [];
    let speed = START_SPEED;
    let distance = 0;
    let score = 0;
    let nextObstacle = 0;
    let overAt = 0;
    let shakeUntil = 0;
    let flashUntil = 0;
    let held = false;
    let queuedJumpAt = -Infinity;
    let titleAt = performance.now();

    const stars = Array.from({length: 16}, () => ({
        x: rand(0, W), y: Math.floor(rand(2, 44)), phase: rand(0, 3),
    }));
    const specks = Array.from({length: 14}, () => ({
        x: rand(0, W), y: GROUND + 2 + Math.floor(rand(0, 6)), w: Math.random() < 0.5 ? 1 : 2,
    }));

    function start(fromTitle) {
        const motion = !reducedMotion.matches;
        if (fromTitle && motion) burst();
        state = "play";
        // From the title the runner drops in from the top
        person = fromTitle && motion
            ? {y: -PERSON_H - 2, vy: 0, onGround: false}
            : {y: GROUND - PERSON_H, vy: 0, onGround: true};
        obstacles = [];
        speed = START_SPEED;
        distance = 0;
        score = 0;
        flashUntil = 0;
        nextObstacle = fromTitle ? 170 : 100;
    }

    function jump() {
        person.vy = held ? JUMP_SPEED : SHORT_HOP;
        person.onGround = false;
    }

    function press(now) {
        held = true;
        if (state === "title") {
            start(true);
        } else if (state === "over") {
            if (now - overAt > 450) start(false);
        } else if (person.onGround) {
            jump();
        } else {
            // Pressed just before landing: jump on touchdown
            queuedJumpAt = now;
        }
    }

    function release() {
        held = false;
        if (state === "play" && person.vy < SHORT_HOP) person.vy = SHORT_HOP;
    }

    function spawn() {
        const roll = Math.random();
        let sprites = BUG;
        let count = 1;
        if (score > 60 && roll < 0.25) count = 2;
        else if (roll > 0.6) sprites = [PAGE];

        const {w, h} = sprites[0];
        obstacles.push({sprites, count, x: W + 1, y: GROUND - h, w: w * count + count - 1, h});
    }

    // Hitboxes a bit smaller than the sprites, to be forgiving
    function hits(o) {
        const x = PERSON_X + 2;
        const y = person.y + 1;
        return x < o.x + o.w - 1 && x + 4 > o.x + 1 && y < o.y + o.h && y + PERSON_H - 1 > o.y + 1;
    }

    function die(now) {
        state = "over";
        overAt = now;
        if (score > best) {
            best = score;
            try {
                localStorage.setItem(BEST_KEY, String(best));
            } catch {}
        }

        if (!reducedMotion.matches) {
            shakeUntil = now + 300;
            for (let i = 0; i < 10; i++) {
                particles.push({
                    x: PERSON_X + 3, y: GROUND - 2, size: 1, color: i % 2 ? "#666" : "#999",
                    vx: rand(-50, 50), vy: rand(-70, -20), gravity: 260, life: 0.5,
                });
            }
        }
    }

    // The title flies apart when the game starts
    function burst() {
        for (const [spr, col] of TITLE) {
            for (const [px, py, color] of spr.pixels) {
                const x = ART_X + (col + px) * ART;
                const y = ART_Y + py * ART;
                particles.push({
                    x, y, size: ART, color,
                    vx: (x - W / 2) * 1.4 + rand(-30, 30), vy: rand(-170, -50), gravity: 520,
                });
            }
        }
    }

    function dust() {
        if (reducedMotion.matches) return;
        for (let i = 0; i < 4; i++) {
            particles.push({
                x: PERSON_X + 2 + i * 2, y: GROUND - 1, size: 1, color: "#666",
                vx: rand(-40, 0), vy: rand(-35, -10), gravity: 160, life: 0.35,
            });
        }
    }

    function update(dt, now) {
        speed = Math.min(MAX_SPEED, speed + ACCEL * dt);
        const dx = speed * dt;
        distance += dx;

        const newScore = Math.floor(distance / 8);
        if (Math.floor(newScore / 100) > Math.floor(score / 100)) flashUntil = now + 600;
        score = newScore;

        person.vy += GRAVITY * dt;
        person.y += person.vy * dt;
        if (person.y >= GROUND - PERSON_H) {
            person.y = GROUND - PERSON_H;
            person.vy = 0;
            if (!person.onGround) {
                person.onGround = true;
                dust();
                if (now - queuedJumpAt < 150) jump();
            }
        }

        for (const o of obstacles) o.x -= dx;
        obstacles = obstacles.filter(o => o.x + o.w > 0);
        nextObstacle -= dx;
        if (nextObstacle <= 0) {
            spawn();
            nextObstacle = rand(55, 100) + speed * 0.45;
        }

        for (const s of specks) {
            s.x -= dx;
            if (s.x < -2) s.x += W + 4;
        }
        for (const s of stars) {
            s.x -= dx * 0.1;
            if (s.x < -1) s.x += W + 2;
        }

        if (obstacles.some(hits)) die(now);
    }

    function updateParticles(dt) {
        for (const p of particles) {
            p.vy += p.gravity * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (p.life !== undefined) p.life -= dt;
        }
        particles = particles.filter(p => p.y < H && p.x > -4 && p.x < W + 4 && !(p.life <= 0));
    }

    function drawStars(now) {
        ctx.fillStyle = "#555";
        for (const s of stars) {
            ctx.globalAlpha = reducedMotion.matches ? 0.6 : [0.2, 0.5, 0.9][Math.floor(now / 700 + s.phase) % 3];
            ctx.fillRect(Math.round(s.x), s.y, 1, 1);
        }
        ctx.globalAlpha = 1;
    }

    function drawTitle(now) {
        const motion = !reducedMotion.matches;

        // Pixels rain in from the left, falling in four chunky steps
        for (const [spr, col] of TITLE) {
            for (const [px, py, color] of spr.pixels) {
                let y = ART_Y + py * ART;
                if (motion) {
                    const t = (now - titleAt - (col + px + (py % 3)) * 25) / 400;
                    const step = t >= 1 ? 1 : Math.floor(Math.max(t, 0) * 4) / 4;
                    if (step === 0) continue;
                    ctx.globalAlpha = step;
                    y -= Math.round(14 * (1 - step));
                }
                ctx.fillStyle = color;
                ctx.fillRect(ART_X + (col + px) * ART, y, ART, ART);
            }
        }
        ctx.globalAlpha = 1;

        SPARKLES.forEach(([x, y], i) => {
            ctx.globalAlpha = motion ? [0.15, 0.55, 1][Math.floor(now / 800 + i * 0.37) % 3] : 0.8;
            ctx.fillStyle = i % 2 ? COLORS["#"] : "#ddd";
            ctx.fillRect(ART_X + x * ART, ART_Y + y * ART, ART, ART);
        });
        ctx.globalAlpha = 1;
    }

    function drawWorld(now) {
        ctx.fillStyle = "#444";
        ctx.fillRect(0, GROUND, W, 1);
        ctx.fillStyle = "#333";
        for (const s of specks) ctx.fillRect(Math.round(s.x), s.y, s.w, 1);

        const t = state === "play" ? now : overAt;
        for (const o of obstacles) {
            const frame = o.sprites[Math.floor(t / 160) % o.sprites.length];
            for (let i = 0; i < o.count; i++) draw(frame, o.x + i * (frame.w + 1), o.y);
        }

        if (state === "over") {
            draw(DAZED, PERSON_X, GROUND - DAZED.h);
            // Stars circling their head
            const spin = reducedMotion.matches ? 0 : (now - overAt) / 180;
            for (let i = 0; i < 3; i++) {
                const a = spin + i * 2.1;
                ctx.fillStyle = i % 2 ? "#ddd" : "#f7d154";
                ctx.fillRect(
                    PERSON_X + 3 + Math.round(Math.cos(a) * 4),
                    GROUND - DAZED.h - 3 + Math.round(Math.sin(a) * 1.5),
                    1, 1,
                );
            }
        } else {
            let runner = Math.floor(distance / 7) % 2 ? RUN_B : RUN_A;
            if (!person.onGround) runner = JUMP;
            draw(runner, PERSON_X, person.y);
        }

        // Score blinks for a moment every 100 points
        text("OFFLINE", 4, 3, COLORS["#"]);
        const hud = `HI ${pad(best)} ${pad(score)}`;
        const blinkScore = now < flashUntil && Math.floor(now / 100) % 2;
        text(blinkScore ? `HI ${pad(best)}` : hud, W - 4 - textWidth(hud), 3, "#999");

        if (state === "over") {
            text("CONNECTION LOST", centered("CONNECTION LOST", 2), 14, COLORS["#"], 2);
            const retry = `${verb} TO RETRY`;
            if (reducedMotion.matches || (now - overAt) % 1000 < 700) text(retry, centered(retry), 30, "#ddd");
        }
    }

    function render(now) {
        ctx.clearRect(0, 0, W, H);
        ctx.save();
        if (now < shakeUntil) ctx.translate(Math.round(rand(-1, 1)), Math.round(rand(-1, 1)));

        drawStars(now);
        if (state === "title") drawTitle(now);
        else drawWorld(now);

        for (const p of particles) {
            ctx.fillStyle = p.color;
            ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
        }
        ctx.restore();
    }

    const KEYS = ["Space", "ArrowUp", "KeyW"];

    addEventListener("keydown", event => {
        // Space still works on links, buttons and the theme toggle
        if (!KEYS.includes(event.code) || event.target.closest?.("a, button, input, textarea, select")) return;
        event.preventDefault();
        if (!event.repeat) press(performance.now());
    });
    addEventListener("keyup", event => {
        if (KEYS.includes(event.code)) release();
    });

    canvas.addEventListener("pointerdown", event => {
        event.preventDefault();
        press(performance.now());
    });
    for (const type of ["pointerup", "pointercancel", "pointerleave"]) {
        canvas.addEventListener(type, release);
    }
    canvas.addEventListener("contextmenu", event => event.preventDefault());

    let last = performance.now();
    function frame(now) {
        // Clamped so a background tab doesn't come back to a huge jump
        const dt = Math.max(0, Math.min((now - last) / 1000, 1 / 30));
        last = now;
        if (state === "play") update(dt, now);
        if (state === "over" && now - overAt > BACK_TO_TITLE) {
            state = "title";
            titleAt = now;
            particles = [];
        }
        updateParticles(dt);
        render(now);
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
})();
