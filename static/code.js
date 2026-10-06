(() => {
    const W = /[A-Za-z_][\w-]*/y;
    const NUM = /\b\d+(\.\d+)?\b/y;
    const STR = /"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/y;
    const VAR = /\$\{[^}\n]*\}|\$\(|\$[\w?#@!*-]+/y;
    const L = {
        python: [
            ["c", /#.*/y],
            ["s", /"""[\s\S]*?"""|'''[\s\S]*?'''/y],
            ["s", STR],
            ["f", /@\w+/y],
            ["k", /\b(def|class|return|if|elif|else|for|while|in|is|not|and|or|import|from|as|with|try|except|finally|raise|pass|lambda|yield|async|await|None|True|False)\b/y],
            ["n", NUM],
            ["f", /[A-Za-z_]\w*(?=\()/y],
        ],
        bash: [
            ["c", /#.*/y],
            ["s", /'[^'\n]*'/y],
            ["s", /"(?:\\.|[^"\\\n])*"/y, [["v", VAR]]],
            ["v", VAR],
            ["k", /\b(if|then|elif|else|fi|for|while|until|do|done|case|esac|in|function|local|return|export|set|readonly)\b/y],
            ["n", NUM],
        ],
        dockerfile: [
            ["c", /#.*/y],
            ["k", /^\s*(FROM|RUN|CMD|COPY|ADD|ENV|ARG|WORKDIR|EXPOSE|ENTRYPOINT|USER|VOLUME|LABEL|HEALTHCHECK|SHELL)\b|\bAS\b/my],
            ["s", STR],
            ["v", /\$\{?\w+\}?/y],
            ["n", NUM],
        ],
        yaml: [
            ["c", /#.*/y],
            ["k", /^(\s*-?\s*)[A-Za-z_][\w.-]*(?=:)/my],
            ["s", STR],
            ["v", /[&*]\w+/y],
            ["n", /\b(true|false|null|yes|no|\d+(\.\d+)?)\b/y],
        ],
    };
    L.sh = L.bash;
    L.py = L.python;
    L.yml = L.yaml;
    L.docker = L.dockerfile;

    const esc = s => s.replace(/[&<>]/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;"})[c]);

    function hl(text, rules) {
        let out = "";
        let i = 0;
        outer: while (i < text.length) {
            for (const [cls, re, inner] of [...rules, [null, W]]) {
                re.lastIndex = i;
                const m = re.exec(text);
                if (m && m[0]) {
                    const body = inner ? hl(m[0], inner) : esc(m[0]);
                    out += cls ? `<span class="${cls}">${body}</span>` : body;
                    i += m[0].length;
                    continue outer;
                }
            }
            out += esc(text[i++]);
        }
        return out;
    }

    const CHECK = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5"/></svg>';

    function copyBtn(get) {
        const b = document.createElement("button");
        b.className = "copy";
        b.type = "button";
        b.textContent = "copy";
        b.onclick = async () => {
            const text = get();
            let ok = false;
            try {
                await navigator.clipboard.writeText(text);
                ok = true;
            } catch {
                // Clipboard API blocked: iframe or non-HTTPS
                const ta = document.createElement("textarea");
                ta.value = text;
                ta.setAttribute("readonly", "");
                ta.style.cssText = "position:fixed;top:0;left:0;opacity:0";
                document.body.append(ta);
                ta.select();
                try {
                    ok = document.execCommand("copy");
                } catch {}
                ta.remove();
            }
            // Keep size so the bar doesn't shift
            b.style.minWidth = b.offsetWidth + "px";
            b.style.minHeight = b.offsetHeight + "px";
            if (ok) {
                b.classList.add("ok");
                b.innerHTML = CHECK;
                b.setAttribute("aria-label", "copied");
            } else {
                b.textContent = "failed";
            }
            setTimeout(() => {
                b.classList.remove("ok");
                b.removeAttribute("aria-label");
                b.textContent = "copy";
            }, 1500);
        };
        return b;
    }

    document.querySelectorAll('pre > code[class*="language-"]').forEach(code => {
        const pre = code.parentElement;
        const lang = code.className.match(/language-(\w+)/)[1];
        const raw = code.textContent.replace(/\n$/, "");
        const box = document.createElement("div");
        const bar = document.createElement("div");

        if (lang === "console" || lang === "term") {
            box.className = "term";
            bar.className = "term-bar";
            bar.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>bash';
            const lines = raw.split("\n");
            code.innerHTML = lines.map(l => l.startsWith("$ ")
                ? `<span class="cmd">${esc(l.slice(2))}</span>`
                : `<span class="out">${esc(l)}</span>`).join("\n");
            bar.append(copyBtn(() => lines.filter(l => l.startsWith("$ ")).map(l => l.slice(2)).join("\n")));
        } else {
            box.className = "code";
            bar.className = "code-bar";
            bar.textContent = lang;
            if (L[lang]) code.innerHTML = hl(raw, L[lang]);
            bar.append(copyBtn(() => raw));
        }
        pre.replaceWith(box);
        box.append(bar, pre);
    });
})();
