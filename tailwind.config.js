/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        board: '#38bdf8', // 보드팀 (sky)
        ins: '#f472b6', // 인스팀 (pink)
        ski: '#a3e635', // 스키팀 (lime)
      },
      keyframes: {
        pop: {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '60%': { transform: 'scale(1.1)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
      },
      animation: {
        pop: 'pop 0.4s ease-out',
        pulseRing: 'pulseRing 1.2s ease-out infinite',
      },
    },
  },
  plugins: [],
}
