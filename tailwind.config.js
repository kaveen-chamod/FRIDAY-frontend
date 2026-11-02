/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        sooty: "#141414",
        "dire-wolf": "#282828",
        "brownish-black": "#3f3835",
        "black-oak": "#4e4e4e",
        "velvety-chestnut": "#a1887d",
        "fiery-orange": "#b55933",
      },
      fontFamily: {
        display: ["Orbitron", "monospace"],
        body: ["Rajdhani", "sans-serif"],
      },
    },
  },
  plugins: [],
};
