/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#E8E8EC',
        foreground: '#1F1F2E',
        card: '#ffffff',
        'card-foreground': '#1F1F2E',
        primary: '#4C5FD5',
        'primary-foreground': '#ffffff',
        secondary: '#f5f5f7',
        'secondary-foreground': '#030213',
        muted: '#ececf0',
        'muted-foreground': '#717182',
        accent: '#4C5FD5',
        'accent-foreground': '#ffffff',
        destructive: '#EF4444',
        'destructive-foreground': '#ffffff',
        success: '#22C55E',
        'success-foreground': '#ffffff',
        border: 'rgba(0, 0, 0, 0.08)',
        input: 'transparent',
        'input-background': '#f3f3f5',
      },
      borderRadius: {
        'sm': 'calc(0.75rem - 4px)',
        'md': 'calc(0.75rem - 2px)',
        'lg': '0.75rem',
        'xl': 'calc(0.75rem + 4px)',
      },
      fontSize: {
        'xs': '0.75rem',
        'sm': '0.875rem',
        'base': '1rem',
        'lg': '1.125rem',
        'xl': '1.25rem',
        '2xl': '1.5rem',
      },
      fontWeight: {
        normal: '400',
        medium: '500',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
