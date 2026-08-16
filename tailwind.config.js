/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        info: 'hsl(var(--info))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
      },
      borderRadius: {
        control: '6px',
        card: '10px',
      },
      // NOTE: keys here must not match any `colors.*` theme key (e.g. "card") —
      // Tailwind's box-shadow plugin resolves a same-named color token as the
      // shadow's color instead of using the literal value, silently turning
      // it white. Use elevation-tier names instead.
      boxShadow: {
        'elevation-1': '0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.06)',
        'elevation-2': '0 8px 20px -6px rgba(15, 23, 42, 0.12), 0 3px 8px -3px rgba(15, 23, 42, 0.08)',
        'elevation-glow': '0 0 0 1px rgba(37, 99, 235, 0.12), 0 6px 20px -6px rgba(37, 99, 235, 0.35)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, hsl(221 83% 53%) 0%, hsl(230 80% 48%) 100%)',
        'gradient-subtle': 'linear-gradient(180deg, hsl(221 83% 53% / 0.06) 0%, transparent 100%)',
      },
      fontSize: {
        xs: ['12px', '1.5'],
        sm: ['14px', '1.5'],
        base: ['16px', '1.5'],
        lg: ['20px', '1.4'],
        xl: ['24px', '1.3'],
        '2xl': ['32px', '1.2'],
      },
      spacing: {
        4.5: '18px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
