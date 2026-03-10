module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      boxShadow: {
        sm: "0 1px 3px rgba(0, 0, 0, 0.12)",
        DEFAULT: "0 3px 8px rgba(0, 0, 0, 0.14)",
        md: "0 5px 12px rgba(0, 0, 0, 0.15)",
        lg: "0 10px 18px rgba(0, 0, 0, 0.16)",
        xl: "0 14px 24px rgba(0, 0, 0, 0.18)",
        "2xl": "0 20px 36px rgba(0, 0, 0, 0.2)",
      },
      dropShadow: {
        sm: "0 1px 2px rgba(0, 0, 0, 0.18)",
        DEFAULT: "0 2px 6px rgba(0, 0, 0, 0.2)",
        md: "0 6px 10px rgba(0, 0, 0, 0.22)",
        lg: "0 10px 16px rgba(0, 0, 0, 0.24)",
      },
      colors: {
        neutral: {
          50: "#fafafa"
        },
        persal: {
          blue: '#2196f3', // main logo blue
          light: '#5ec6ff', // light logo blue
          dark: '#1a7cc7', // deep logo blue
        }
      }
    }
  },
  plugins: []
};
