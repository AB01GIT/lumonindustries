/**
 * PRELOADER
 * A Lumon terminal boot sequence that doubles as the required user gesture:
 * the visitor pressing "BEGIN SHIFT" is what lets us start the AudioContext
 * and unlock scrolling.
 *
 * Returns a promise that resolves the moment the boot screen clears.
 */

import { qs, qsa } from "./utils.js";
import { audio } from "./audio.js";

export function runPreloader({ assetsReady } = {}) {
  const boot = qs("#boot");
  const enter = qs("#enter");
  const fill = qs(".boot__fill");
  const count = qs("[data-boot-count]");
  const lines = qsa("[data-boot-line]");

  return new Promise((resolve) => {
    const counter = { value: 0 };

    const tl = gsap.timeline();

    // Cathode warm-up
    tl.from(".boot__head", { opacity: 0, y: 12, duration: 0.7, ease: "power2.out" });

    // Diagnostics tick on one by one, each pushing the meter forward.
    lines.forEach((line, i) => {
      tl.call(
        () => {
          line.classList.add("is-on");
          audio.blip(440 + i * 110, { gain: 0.03, duration: 0.06 });
        },
        null,
        0.5 + i * 0.42
      );
    });

    tl.to(
      counter,
      {
        value: 100,
        duration: 2.5,
        ease: "power1.inOut",
        onUpdate: () => {
          const v = Math.round(counter.value);
          if (count) count.textContent = v;
          if (fill) fill.style.width = `${v}%`;
        },
      },
      0.35
    );

    tl.call(() => {
      enter.hidden = false;
      gsap.to(enter, { opacity: 1, duration: 0.8, ease: "power2.out" });
    });

    /* --------------------------------------------------------- departure -- */
    let departed = false;

    const depart = async () => {
      if (departed) return; // click and keyboard both route here
      departed = true;
      enter.removeEventListener("click", depart);

      // The click is our one guaranteed gesture — take the audio context now.
      await audio.enable().catch(() => {});
      qs("#audio-toggle")?.classList.add("is-on");
      audio.sever();

      // Wait for fonts / WebGL before tearing down the curtain.
      await Promise.resolve(assetsReady);

      const out = gsap.timeline({
        onComplete: () => {
          boot.remove();
          // The button is gone, so its `pointerleave` will never fire — clear
          // the cursor state by hand or the ring keeps its "Press" label.
          delete document.body.dataset.pointerState;
          resolve();
        },
      });

      out
        .to(enter, { opacity: 0, scale: 0.9, duration: 0.4, ease: "power2.in" })
        .to(".boot__frame", { opacity: 0, y: -20, duration: 0.5, ease: "power2.in" }, 0.1)
        .to(
          boot,
          {
            // The terminal closes like a shutter rather than fading out.
            clipPath: "inset(50% 0% 50% 0%)",
            duration: 1.1,
            ease: "expo.inOut",
          },
          0.35
        )
        .to(".veil__sheet", { opacity: 1, duration: 0.12 }, 1.1)
        .to(".veil__sheet", { opacity: 0, duration: 0.9, ease: "power2.out" }, 1.24);
    };

    enter.addEventListener("click", depart);

    // Keyboard parity for the entry gesture. Not `{ once: true }`: that would
    // burn the listener on the first arbitrary keypress and lock out anyone
    // driving the page from the keyboard.
    const onKey = (e) => {
      if (enter.hidden) return;
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      window.removeEventListener("keydown", onKey);
      depart();
    };
    window.addEventListener("keydown", onKey);
  });
}
