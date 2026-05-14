module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./lib/**/*.{js,ts}", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // RITI VR2047 Color System
        // Navy/Background
        'vr-navy': '#060D1F',
        'vr-navy2': '#0C1829',
        'vr-navy3': '#112236',
        'vr-navy4': '#1A2F4A',
        'vr-bg': '#070C1A',
        'vr-sf': '#0F1929',
        'vr-sf2': '#162236',
        
        // Primary (Orange)
        'vr-orange': '#E85C0D',
        'vr-orange2': '#F97316',
        
        // Text
        'vr-text-1': '#F1F5F9',
        'vr-text-2': '#94A3B8',
        'vr-text-3': '#475569',
        
        // Status colors
        'vr-success': '#22C55E',
        'vr-warning': '#F59E0B',
        'vr-danger': '#EF4444',
        'vr-info': '#3B82F6',
        'vr-cyan': '#06B6D4',
        'vr-purple': '#A855F7',
        'vr-pink': '#EC4899'
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif']
      }
    }
  },
  plugins: []
}
